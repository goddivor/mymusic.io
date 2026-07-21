package com.musicapp.mediascanner;

import android.content.ContentUris;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Queries the system MediaStore index: every audio file on the device
 * (all storage volumes and folders) with its metadata (title, artist,
 * album, duration, track number, artwork).
 */
public class MediaScannerModule extends ReactContextBaseJavaModule {
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();
    private static final Uri ALBUM_ART_BASE = Uri.parse("content://media/external/audio/albumart");

    public MediaScannerModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "MediaScanner";
    }

    /**
     * MediaStore's TRACK column sometimes encodes disc*1000 + track number;
     * values above 1000 are reduced modulo 1000 to keep only the track part.
     */
    @ReactMethod
    public void queryAudio(final Promise promise) {
        EXECUTOR.execute(() -> {
            try {
                List<String> proj = new ArrayList<>();
                proj.add(MediaStore.Audio.Media._ID);
                proj.add(MediaStore.Audio.Media.DATA);
                proj.add(MediaStore.Audio.Media.TITLE);
                proj.add(MediaStore.Audio.Media.ARTIST);
                proj.add(MediaStore.Audio.Media.ALBUM);
                proj.add(MediaStore.Audio.Media.ALBUM_ID);
                proj.add(MediaStore.Audio.Media.TRACK);
                proj.add(MediaStore.Audio.Media.DURATION);
                proj.add(MediaStore.Audio.Media.IS_MUSIC);
                final boolean hasAlbumArtist = Build.VERSION.SDK_INT >= 30;
                if (hasAlbumArtist) proj.add(MediaStore.Audio.Media.ALBUM_ARTIST);

                Cursor cursor = getReactApplicationContext().getContentResolver().query(
                        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                        proj.toArray(new String[0]),
                        MediaStore.Audio.Media.DURATION + " > 0",
                        null,
                        MediaStore.Audio.Media.TITLE + " COLLATE NOCASE ASC");

                WritableArray out = Arguments.createArray();
                if (cursor != null) {
                    int iId = cursor.getColumnIndex(MediaStore.Audio.Media._ID);
                    int iData = cursor.getColumnIndex(MediaStore.Audio.Media.DATA);
                    int iTitle = cursor.getColumnIndex(MediaStore.Audio.Media.TITLE);
                    int iArtist = cursor.getColumnIndex(MediaStore.Audio.Media.ARTIST);
                    int iAlbum = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM);
                    int iAlbumId = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM_ID);
                    int iTrack = cursor.getColumnIndex(MediaStore.Audio.Media.TRACK);
                    int iDuration = cursor.getColumnIndex(MediaStore.Audio.Media.DURATION);
                    int iIsMusic = cursor.getColumnIndex(MediaStore.Audio.Media.IS_MUSIC);
                    int iAlbumArtist = hasAlbumArtist
                            ? cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM_ARTIST) : -1;

                    while (cursor.moveToNext()) {
                        String path = cursor.getString(iData);
                        if (path == null || path.isEmpty()) continue;

                        WritableMap m = Arguments.createMap();
                        m.putDouble("mediaId", cursor.getLong(iId));
                        m.putString("path", path);
                        m.putString("title", clean(cursor.getString(iTitle)));
                        m.putString("artist", clean(cursor.getString(iArtist)));
                        m.putString("album", clean(cursor.getString(iAlbum)));
                        long albumId = cursor.getLong(iAlbumId);
                        m.putDouble("albumId", albumId);
                        m.putString("albumArtist", iAlbumArtist >= 0
                                ? clean(cursor.getString(iAlbumArtist)) : "");
                        int track = cursor.getInt(iTrack);
                        m.putInt("trackNumber", track > 1000 ? track % 1000 : track);
                        m.putDouble("duration", cursor.getLong(iDuration) / 1000.0);
                        m.putBoolean("isMusic", cursor.getInt(iIsMusic) != 0);
                        m.putString("artwork", albumId > 0
                                ? ContentUris.withAppendedId(ALBUM_ART_BASE, albumId).toString()
                                : "");
                        out.pushMap(m);
                    }
                    cursor.close();
                }
                promise.resolve(out);
            } catch (Exception e) {
                promise.reject("MEDIASTORE_ERROR", e.getMessage(), e);
            }
        });
    }

    /** MediaStore returns "&lt;unknown&gt;" for missing fields. */
    private static String clean(String s) {
        if (s == null || "<unknown>".equals(s)) return "";
        return s;
    }
}
