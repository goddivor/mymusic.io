package com.musicapp.mediasaver;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Publishes downloaded audio to the shared Music/MusicApp collection through
 * MediaStore, so files survive an app uninstall, appear in other players and
 * are re-indexed by the device. Returns the resolved absolute file path.
 */
public class MediaSaverModule extends ReactContextBaseJavaModule {
    private static final String SUBDIR = "MusicApp";

    public MediaSaverModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "MediaSaver";
    }

    private static String mimeFor(String name) {
        String p = name.toLowerCase();
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".m4a") || p.endsWith(".mp4")) return "audio/mp4";
        if (p.endsWith(".aac")) return "audio/aac";
        if (p.endsWith(".wav")) return "audio/wav";
        if (p.endsWith(".flac")) return "audio/flac";
        if (p.endsWith(".ogg") || p.endsWith(".opus")) return "audio/ogg";
        if (p.endsWith(".webm")) return "audio/webm";
        return "audio/*";
    }

    @ReactMethod
    public void publishAudio(String srcPath, String displayName, Promise promise) {
        try {
            File src = new File(srcPath.startsWith("file://") ? srcPath.substring(7) : srcPath);
            if (!src.exists()) {
                promise.reject("NO_SRC", "Source file not found: " + srcPath);
                return;
            }
            String path = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                    ? publishViaMediaStore(src, displayName)
                    : publishLegacy(src, displayName);
            if (path == null) {
                promise.reject("PUBLISH_FAILED", "Could not publish audio file");
                return;
            }
            promise.resolve(path);
        } catch (Exception e) {
            promise.reject("PUBLISH_ERROR", e.getMessage(), e);
        }
    }

    private String publishViaMediaStore(File src, String displayName) throws Exception {
        Context ctx = getReactApplicationContext();
        ContentResolver resolver = ctx.getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Audio.Media.DISPLAY_NAME, displayName);
        values.put(MediaStore.Audio.Media.MIME_TYPE, mimeFor(displayName));
        values.put(MediaStore.Audio.Media.RELATIVE_PATH,
                Environment.DIRECTORY_MUSIC + "/" + SUBDIR);
        values.put(MediaStore.Audio.Media.IS_PENDING, 1);

        Uri collection = MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        Uri item = resolver.insert(collection, values);
        if (item == null) return null;

        try (InputStream in = new FileInputStream(src);
             OutputStream out = resolver.openOutputStream(item)) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        }

        values.clear();
        values.put(MediaStore.Audio.Media.IS_PENDING, 0);
        resolver.update(item, values, null, null);

        String path = null;
        try (Cursor cursor = resolver.query(item,
                new String[]{MediaStore.Audio.Media.DATA}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                path = cursor.getString(0);
            }
        }
        return path;
    }

    private String publishLegacy(File src, String displayName) throws Exception {
        File dir = new File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MUSIC), SUBDIR);
        if (!dir.exists()) dir.mkdirs();
        File dest = new File(dir, displayName);
        try (InputStream in = new FileInputStream(src);
             OutputStream out = new java.io.FileOutputStream(dest)) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        }
        Context ctx = getReactApplicationContext();
        MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL);
        android.media.MediaScannerConnection.scanFile(
                ctx, new String[]{dest.getAbsolutePath()}, null, null);
        return dest.getAbsolutePath();
    }

    @ReactMethod
    public void publishText(String fileName, String content, Promise promise) {
        try {
            File dir = new File(
                    Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MUSIC), SUBDIR);
            if (!dir.exists()) dir.mkdirs();
            File dest = new File(dir, fileName);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                Context ctx = getReactApplicationContext();
                ContentResolver resolver = ctx.getContentResolver();
                resolver.delete(
                        MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL),
                        MediaStore.Audio.Media.DATA + " = ?",
                        new String[]{dest.getAbsolutePath()});
            }
            try (OutputStream out = new java.io.FileOutputStream(dest)) {
                out.write(content.getBytes("UTF-8"));
            }
            promise.resolve(dest.getAbsolutePath());
        } catch (Exception e) {
            promise.reject("WRITE_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void deleteByPath(String path, Promise promise) {
        try {
            String real = path.startsWith("file://") ? path.substring(7) : path;
            Context ctx = getReactApplicationContext();
            ContentResolver resolver = ctx.getContentResolver();
            int deleted = resolver.delete(
                    MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL),
                    MediaStore.Audio.Media.DATA + " = ?",
                    new String[]{real});
            if (deleted == 0) {
                File f = new File(real);
                if (f.exists()) f.delete();
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }
}
