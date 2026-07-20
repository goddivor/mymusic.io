import org.schabi.newpipe.extractor.NewPipe;
import org.schabi.newpipe.extractor.ServiceList;
import org.schabi.newpipe.extractor.downloader.Downloader;
import org.schabi.newpipe.extractor.downloader.Request;
import org.schabi.newpipe.extractor.downloader.Response;
import org.schabi.newpipe.extractor.exceptions.ReCaptchaException;
import org.schabi.newpipe.extractor.localization.Localization;
import org.schabi.newpipe.extractor.stream.AudioStream;
import org.schabi.newpipe.extractor.stream.StreamInfo;
import org.schabi.newpipe.extractor.stream.VideoStream;

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.Map;

public class NpeTest {
    static final String UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0";

    static class Dl extends Downloader {
        public Response execute(Request request) throws IOException, ReCaptchaException {
            HttpURLConnection con = (HttpURLConnection) new URL(request.url()).openConnection();
            con.setRequestMethod(request.httpMethod());
            con.setRequestProperty("User-Agent", UA);
            for (Map.Entry<String, List<String>> e : request.headers().entrySet()) {
                for (String v : e.getValue()) con.addRequestProperty(e.getKey(), v);
            }
            byte[] data = request.dataToSend();
            if (data != null) { con.setDoOutput(true); con.getOutputStream().write(data); }
            int code = con.getResponseCode();
            if (code == 429) throw new ReCaptchaException("recaptcha", request.url());
            InputStream is = code >= 400 ? con.getErrorStream() : con.getInputStream();
            String body = is == null ? "" : new String(is.readAllBytes());
            return new Response(code, con.getResponseMessage(), con.getHeaderFields(), body, con.getURL().toString());
        }
    }

    public static void main(String[] args) throws Exception {
        String id = args.length > 0 ? args[0] : "dvgZkm1xWPE"; // Coldplay - Viva La Vida (official)
        NewPipe.init(new Dl(), new Localization("en", "US"));
        String url = "https://www.youtube.com/watch?v=" + id;
        System.out.println("Fetching: " + url);
        StreamInfo info = StreamInfo.getInfo(ServiceList.YouTube, url);
        System.out.println("Title: " + info.getName());
        System.out.println("Uploader: " + info.getUploaderName());
        System.out.println("Duration: " + info.getDuration());

        List<AudioStream> audio = info.getAudioStreams();
        System.out.println("AUDIO streams: " + (audio == null ? "null" : audio.size()));
        if (audio != null) {
            for (AudioStream a : audio) {
                System.out.println("  - fmt=" + (a.getFormat() != null ? a.getFormat().getSuffix() : "?")
                        + " bitrate=" + a.getAverageBitrate()
                        + " url=" + (a.getContent() != null ? a.getContent().substring(0, Math.min(60, a.getContent().length())) : "null"));
            }
        }
        List<VideoStream> video = info.getVideoStreams();
        System.out.println("VIDEO (muxed) streams: " + (video == null ? "null" : video.size()));
        if (video != null) {
            for (VideoStream v : video) {
                System.out.println("  - res=" + v.getResolution()
                        + " fmt=" + (v.getFormat() != null ? v.getFormat().getSuffix() : "?")
                        + " videoOnly=" + v.isVideoOnly()
                        + " url=" + (v.getContent() != null ? v.getContent().substring(0, Math.min(70, v.getContent().length())) : "null"));
            }
        }
        System.out.println("VIDEO-ONLY streams: " + (info.getVideoOnlyStreams() == null ? "null" : info.getVideoOnlyStreams().size()));
        System.out.println("dashMpdUrl: " + info.getDashMpdUrl());
        System.out.println("hlsUrl: " + info.getHlsUrl());
        System.out.println("Errors: " + info.getErrors());
    }
}
