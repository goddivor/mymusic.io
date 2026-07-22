package com.musicapp.appupdater;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;

import androidx.core.content.FileProvider;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

/**
 * In-app update support: exposes the installed version to JS and hands a
 * downloaded APK to the Android package installer through a FileProvider
 * content:// URI (browserless update, Aniyomi style).
 */
public class AppUpdaterModule extends ReactContextBaseJavaModule {
    private static final String AUTHORITY = "com.musicapp.fileprovider";

    public AppUpdaterModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "AppUpdater";
    }

    @Override
    public Map<String, Object> getConstants() {
        Map<String, Object> constants = new HashMap<>();
        try {
            String versionName = getReactApplicationContext()
                    .getPackageManager()
                    .getPackageInfo(getReactApplicationContext().getPackageName(), 0)
                    .versionName;
            constants.put("versionName", versionName == null ? "0.0.0" : versionName);
        } catch (Exception e) {
            constants.put("versionName", "0.0.0");
        }
        constants.put("sdkInt", Build.VERSION.SDK_INT);
        return constants;
    }

    @ReactMethod
    public void installApk(String path, Promise promise) {
        try {
            File file = new File(path.startsWith("file://") ? path.substring(7) : path);
            if (!file.exists()) {
                promise.reject("NOT_FOUND", "APK file not found: " + path);
                return;
            }
            Uri uri = FileProvider.getUriForFile(getReactApplicationContext(), AUTHORITY, file);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                    | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getReactApplicationContext().startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("INSTALL_ERROR", e.getMessage(), e);
        }
    }
}
