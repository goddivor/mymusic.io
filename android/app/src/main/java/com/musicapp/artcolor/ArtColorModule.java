package com.musicapp.artcolor;

import android.content.ContentResolver;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;

import androidx.palette.graphics.Palette;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Extracts a cover's dominant colours with the AndroidX Palette API so the
 * now-playing screen can tint itself like the artwork. Decoding is subsampled
 * and run off the UI thread since covers can be large remote JPEGs.
 */
public class ArtColorModule extends ReactContextBaseJavaModule {
    private static final int TARGET_SIZE = 160;

    private final ExecutorService pool = Executors.newSingleThreadExecutor();

    public ArtColorModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "ArtColor";
    }

    @ReactMethod
    public void getColors(String uri, Promise promise) {
        pool.execute(() -> {
            try {
                Bitmap bitmap = decode(uri);
                if (bitmap == null) {
                    promise.resolve(null);
                    return;
                }
                Palette palette = Palette.from(bitmap).maximumColorCount(24).generate();
                bitmap.recycle();

                int fallback = palette.getDominantColor(0);
                int vibrant = palette.getVibrantColor(0);
                int darkVibrant = palette.getDarkVibrantColor(0);
                int muted = palette.getMutedColor(0);
                int darkMuted = palette.getDarkMutedColor(0);

                int primary = firstNonZero(vibrant, muted, fallback);
                int deep = firstNonZero(darkVibrant, darkMuted, primary);
                if (primary == 0) {
                    promise.resolve(null);
                    return;
                }

                WritableMap out = Arguments.createMap();
                out.putString("primary", hex(primary));
                out.putString("deep", hex(deep));
                out.putBoolean("isDark", luminance(primary) < 0.5);
                promise.resolve(out);
            } catch (Exception e) {
                promise.resolve(null);
            }
        });
    }

    private static int firstNonZero(int... colors) {
        for (int c : colors) {
            if (c != 0) return c;
        }
        return 0;
    }

    private static String hex(int color) {
        return String.format("#%06X", 0xFFFFFF & color);
    }

    private static double luminance(int color) {
        double r = ((color >> 16) & 0xFF) / 255.0;
        double g = ((color >> 8) & 0xFF) / 255.0;
        double b = (color & 0xFF) / 255.0;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    /** Reads bounds first so the full-size cover is never held in memory. */
    private Bitmap decode(String uri) throws Exception {
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        try (InputStream probe = open(uri)) {
            if (probe == null) return null;
            BitmapFactory.decodeStream(probe, null, bounds);
        }
        int longest = Math.max(bounds.outWidth, bounds.outHeight);
        BitmapFactory.Options opts = new BitmapFactory.Options();
        opts.inSampleSize = longest > TARGET_SIZE ? Math.max(1, longest / TARGET_SIZE) : 1;
        try (InputStream in = open(uri)) {
            if (in == null) return null;
            return BitmapFactory.decodeStream(in, null, opts);
        }
    }

    private InputStream open(String uri) throws Exception {
        if (uri.startsWith("http://") || uri.startsWith("https://")) {
            HttpURLConnection conn = (HttpURLConnection) new URL(uri).openConnection();
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);
            conn.setInstanceFollowRedirects(true);
            return conn.getInputStream();
        }
        if (uri.startsWith("content://")) {
            ContentResolver resolver = getReactApplicationContext().getContentResolver();
            return resolver.openInputStream(Uri.parse(uri));
        }
        String path = uri.startsWith("file://") ? uri.substring(7) : uri;
        File file = new File(path);
        if (!file.exists()) return null;
        return new FileInputStream(file);
    }
}
