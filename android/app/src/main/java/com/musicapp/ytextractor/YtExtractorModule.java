package com.musicapp.ytextractor;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import org.schabi.newpipe.extractor.Image;
import org.schabi.newpipe.extractor.InfoItem;
import org.schabi.newpipe.extractor.NewPipe;
import org.schabi.newpipe.extractor.Page;
import org.schabi.newpipe.extractor.ServiceList;
import org.schabi.newpipe.extractor.ListExtractor;
import org.schabi.newpipe.extractor.comments.CommentsInfo;
import org.schabi.newpipe.extractor.comments.CommentsInfoItem;
import org.schabi.newpipe.extractor.kiosk.KioskExtractor;
import org.schabi.newpipe.extractor.localization.Localization;
import org.schabi.newpipe.extractor.playlist.PlaylistInfo;
import org.schabi.newpipe.extractor.search.SearchInfo;
import org.schabi.newpipe.extractor.linkhandler.SearchQueryHandler;
import org.schabi.newpipe.extractor.stream.AudioStream;
import org.schabi.newpipe.extractor.stream.StreamInfo;
import org.schabi.newpipe.extractor.stream.StreamInfoItem;
import org.schabi.newpipe.extractor.stream.VideoStream;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Exposes NewPipeExtractor to JS.
 *
 * YouTube now requires a poToken for adaptive audio-only streams; without it
 * getAudioStreams() comes back empty. Fallback: the muxed progressive stream
 * (video+audio, ~360p / AAC) — the player only plays its audio track.
 */
public class YtExtractorModule extends ReactContextBaseJavaModule {
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();
    private static final ExecutorService SUGGEST_EXECUTOR = Executors.newSingleThreadExecutor();
    private static volatile boolean initialized = false;
    private static final ConcurrentHashMap<String, Object[]> SEARCH_PAGES = new ConcurrentHashMap<>();

    public YtExtractorModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "YtExtractor";
    }

    private static void ensureInit() {
        if (!initialized) {
            synchronized (YtExtractorModule.class) {
                if (!initialized) {
                    NewPipe.init(DownloaderImpl.getInstance(), new Localization("en", "US"));
                    initialized = true;
                }
            }
        }
    }

    private static String bestThumbnail(List<Image> images) {
        if (images == null || images.isEmpty()) return "";
        Image best = images.get(0);
        for (Image img : images) {
            if (img.getHeight() > best.getHeight()) best = img;
        }
        return best.getUrl() == null ? "" : best.getUrl();
    }

    @ReactMethod
    public void getAudioStream(final String url, final Promise promise) {
        EXECUTOR.execute(() -> {
            try {
                ensureInit();
                StreamInfo info = StreamInfo.getInfo(ServiceList.YouTube, url);

                String audioUrl = null;
                String ext = "m4a";
                int bitrate = 0;

                List<AudioStream> audioStreams = info.getAudioStreams();
                if (audioStreams != null && !audioStreams.isEmpty()) {
                    AudioStream best = null;
                    for (AudioStream a : audioStreams) {
                        if (a.getContent() == null || a.getContent().isEmpty()) continue;
                        if (best == null || a.getAverageBitrate() > best.getAverageBitrate()) {
                            best = a;
                        }
                    }
                    if (best != null) {
                        audioUrl = best.getContent();
                        bitrate = best.getAverageBitrate();
                        if (best.getFormat() != null) ext = best.getFormat().getSuffix();
                    }
                }

                if (audioUrl == null) {
                    List<VideoStream> videoStreams = info.getVideoStreams();
                    if (videoStreams != null) {
                        VideoStream best = null;
                        for (VideoStream v : videoStreams) {
                            if (v.isVideoOnly()) continue;
                            if (v.getContent() == null || v.getContent().isEmpty()) continue;
                            if (best == null || resolutionOf(v) > resolutionOf(best)) {
                                best = v;
                            }
                        }
                        if (best != null) {
                            audioUrl = best.getContent();
                            ext = best.getFormat() != null ? best.getFormat().getSuffix() : "mp4";
                        }
                    }
                }

                if (audioUrl == null) {
                    promise.reject("NO_STREAM", "Aucun flux audio ou muxé disponible pour " + url);
                    return;
                }

                WritableMap map = Arguments.createMap();
                map.putString("title", info.getName());
                map.putString("uploader", info.getUploaderName());
                map.putString("audioUrl", audioUrl);
                map.putString("ext", ext);
                map.putDouble("duration", info.getDuration());
                map.putInt("bitrate", bitrate);
                map.putString("thumbnail", bestThumbnail(info.getThumbnails()));
                promise.resolve(map);
            } catch (Exception e) {
                promise.reject("EXTRACT_ERROR", e.getMessage(), e);
            }
        });
    }

    private static int resolutionOf(VideoStream v) {
        String res = v.getResolution();
        if (res == null) return 0;
        StringBuilder digits = new StringBuilder();
        for (char c : res.toCharArray()) {
            if (Character.isDigit(c)) digits.append(c);
            else break;
        }
        try {
            return Integer.parseInt(digits.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    @ReactMethod
    public void getPlaylist(final String url, final Promise promise) {
        EXECUTOR.execute(() -> {
            try {
                ensureInit();
                PlaylistInfo info = PlaylistInfo.getInfo(ServiceList.YouTube, url);

                WritableArray items = Arguments.createArray();
                int count = 0;
                final int MAX_ITEMS = 500;

                List<StreamInfoItem> related = info.getRelatedItems();
                for (StreamInfoItem item : related) {
                    if (count++ >= MAX_ITEMS) break;
                    items.pushMap(toItemMap(item));
                }

                Page nextPage = info.getNextPage();
                while (Page.isValid(nextPage) && count < MAX_ITEMS) {
                    ListExtractor.InfoItemsPage<StreamInfoItem> more =
                            PlaylistInfo.getMoreItems(ServiceList.YouTube, url, nextPage);
                    for (StreamInfoItem item : more.getItems()) {
                        if (count++ >= MAX_ITEMS) break;
                        items.pushMap(toItemMap(item));
                    }
                    nextPage = more.getNextPage();
                }

                WritableMap map = Arguments.createMap();
                map.putString("title", info.getName());
                map.putString("uploader", info.getUploaderName());
                map.putString("thumbnail", bestThumbnail(info.getThumbnails()));
                map.putArray("items", items);
                promise.resolve(map);
            } catch (Exception e) {
                promise.reject("PLAYLIST_ERROR", e.getMessage(), e);
            }
        });
    }

    private static WritableMap streamItemToMap(StreamInfoItem s) {
        WritableMap m = Arguments.createMap();
        m.putString("url", s.getUrl());
        m.putString("title", s.getName());
        m.putString("uploader", s.getUploaderName());
        m.putDouble("duration", s.getDuration());
        m.putDouble("views", s.getViewCount());
        m.putString("uploadedDate", s.getTextualUploadDate() == null ? "" : s.getTextualUploadDate());
        m.putString("thumbnail", bestThumbnail(s.getThumbnails()));
        return m;
    }

    private static WritableArray streamItems(List<? extends InfoItem> items) {
        WritableArray out = Arguments.createArray();
        for (InfoItem it : items) {
            if (it instanceof StreamInfoItem) {
                out.pushMap(streamItemToMap((StreamInfoItem) it));
            }
        }
        return out;
    }

    @ReactMethod
    public void getSuggestions(final String query, final Promise promise) {
        SUGGEST_EXECUTOR.execute(() -> {
            try {
                ensureInit();
                List<String> list = ServiceList.YouTube.getSuggestionExtractor().suggestionList(query);
                WritableArray out = Arguments.createArray();
                for (String s : list) out.pushString(s);
                promise.resolve(out);
            } catch (Exception e) {
                promise.reject("SUGGEST_ERROR", e.getMessage(), e);
            }
        });
    }

    @ReactMethod
    public void search(final String query, final Promise promise) {
        EXECUTOR.execute(() -> {
            try {
                ensureInit();
                SearchQueryHandler qh = ServiceList.YouTube.getSearchQHFactory().fromQuery(query);
                SearchInfo info = SearchInfo.getInfo(ServiceList.YouTube, qh);
                SEARCH_PAGES.put(query, new Object[]{qh, info.getNextPage()});
                WritableMap map = Arguments.createMap();
                map.putArray("items", streamItems(info.getRelatedItems()));
                map.putBoolean("hasMore", Page.isValid(info.getNextPage()));
                promise.resolve(map);
            } catch (Exception e) {
                promise.reject("SEARCH_ERROR", e.getMessage(), e);
            }
        });
    }

    @ReactMethod
    public void searchMore(final String query, final Promise promise) {
        EXECUTOR.execute(() -> {
            try {
                ensureInit();
                Object[] state = SEARCH_PAGES.get(query);
                if (state == null || !Page.isValid((Page) state[1])) {
                    WritableMap empty = Arguments.createMap();
                    empty.putArray("items", Arguments.createArray());
                    empty.putBoolean("hasMore", false);
                    promise.resolve(empty);
                    return;
                }
                SearchQueryHandler qh = (SearchQueryHandler) state[0];
                ListExtractor.InfoItemsPage<InfoItem> page =
                        SearchInfo.getMoreItems(ServiceList.YouTube, qh, (Page) state[1]);
                SEARCH_PAGES.put(query, new Object[]{qh, page.getNextPage()});
                WritableMap map = Arguments.createMap();
                map.putArray("items", streamItems(page.getItems()));
                map.putBoolean("hasMore", Page.isValid(page.getNextPage()));
                promise.resolve(map);
            } catch (Exception e) {
                promise.reject("SEARCH_ERROR", e.getMessage(), e);
            }
        });
    }

    @ReactMethod
    public void getTrending(final Promise promise) {
        EXECUTOR.execute(() -> {
            try {
                ensureInit();
                KioskExtractor<?> kiosk =
                        ServiceList.YouTube.getKioskList().getDefaultKioskExtractor();
                kiosk.fetchPage();
                WritableMap map = Arguments.createMap();
                map.putArray("items", streamItems(kiosk.getInitialPage().getItems()));
                promise.resolve(map);
            } catch (Exception e) {
                promise.reject("TRENDING_ERROR", e.getMessage(), e);
            }
        });
    }

    /**
     * Full metadata for the native video page: stream info, best audio URL for
     * instant playback (with muxed fallback) and related videos in one call.
     */
    @ReactMethod
    public void getVideoInfo(final String url, final Promise promise) {
        EXECUTOR.execute(() -> {
            try {
                ensureInit();
                StreamInfo info = StreamInfo.getInfo(ServiceList.YouTube, url);

                String audioUrl = null;
                String ext = "m4a";
                List<AudioStream> audioStreams = info.getAudioStreams();
                if (audioStreams != null && !audioStreams.isEmpty()) {
                    AudioStream best = null;
                    for (AudioStream a : audioStreams) {
                        if (a.getContent() == null || a.getContent().isEmpty()) continue;
                        if (best == null || a.getAverageBitrate() > best.getAverageBitrate()) best = a;
                    }
                    if (best != null) {
                        audioUrl = best.getContent();
                        if (best.getFormat() != null) ext = best.getFormat().getSuffix();
                    }
                }
                if (audioUrl == null) {
                    List<VideoStream> videoStreams = info.getVideoStreams();
                    if (videoStreams != null) {
                        VideoStream best = null;
                        for (VideoStream v : videoStreams) {
                            if (v.isVideoOnly()) continue;
                            if (v.getContent() == null || v.getContent().isEmpty()) continue;
                            if (best == null || resolutionOf(v) > resolutionOf(best)) best = v;
                        }
                        if (best != null) {
                            audioUrl = best.getContent();
                            ext = best.getFormat() != null ? best.getFormat().getSuffix() : "mp4";
                        }
                    }
                }

                WritableMap map = Arguments.createMap();
                map.putString("url", info.getUrl());
                map.putString("title", info.getName());
                map.putString("uploader", info.getUploaderName());
                map.putString("uploaderAvatar", bestThumbnail(info.getUploaderAvatars()));
                map.putDouble("views", info.getViewCount());
                map.putDouble("likes", info.getLikeCount());
                map.putDouble("duration", info.getDuration());
                map.putString("thumbnail", bestThumbnail(info.getThumbnails()));
                map.putString("description",
                        info.getDescription() == null ? "" : info.getDescription().getContent());
                map.putString("audioUrl", audioUrl == null ? "" : audioUrl);
                map.putString("ext", ext);
                map.putArray("related", streamItems(info.getRelatedItems()));
                promise.resolve(map);
            } catch (Exception e) {
                promise.reject("VIDEO_INFO_ERROR", e.getMessage(), e);
            }
        });
    }

    @ReactMethod
    public void getComments(final String url, final Promise promise) {
        EXECUTOR.execute(() -> {
            try {
                ensureInit();
                CommentsInfo info = CommentsInfo.getInfo(ServiceList.YouTube, url);
                WritableArray out = Arguments.createArray();
                for (CommentsInfoItem c : info.getRelatedItems()) {
                    WritableMap m = Arguments.createMap();
                    m.putString("author", c.getUploaderName());
                    m.putString("avatar", bestThumbnail(c.getUploaderAvatars()));
                    m.putString("text", c.getCommentText() == null ? "" : c.getCommentText().getContent());
                    m.putDouble("likes", c.getLikeCount());
                    m.putString("date", c.getTextualUploadDate() == null ? "" : c.getTextualUploadDate());
                    out.pushMap(m);
                }
                WritableMap map = Arguments.createMap();
                map.putArray("items", out);
                promise.resolve(map);
            } catch (Exception e) {
                promise.reject("COMMENTS_ERROR", e.getMessage(), e);
            }
        });
    }

    private static WritableMap toItemMap(StreamInfoItem item) {
        WritableMap m = Arguments.createMap();
        m.putString("url", item.getUrl());
        m.putString("title", item.getName());
        m.putString("uploader", item.getUploaderName());
        m.putDouble("duration", item.getDuration());
        m.putString("thumbnail", bestThumbnail(item.getThumbnails()));
        return m;
    }
}
