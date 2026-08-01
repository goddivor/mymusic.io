package com.musicapp.backup;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.net.Uri;

import androidx.documentfile.provider.DocumentFile;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Persists the library backup through the Storage Access Framework: the user
 * picks a folder once (survives an uninstall, no runtime permission), and the
 * app reads/writes musicapp-backup.json there. onActivityResult is routed back
 * to the pending promise since SAF uses startActivityForResult.
 */
public class BackupModule extends ReactContextBaseJavaModule implements ActivityEventListener {
    private static final int REQ_FOLDER = 6011;
    private static final int REQ_FILE = 6012;
    private static final String MIME = "application/json";

    private Promise pending;

    public BackupModule(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(this);
    }

    @Override
    public String getName() {
        return "Backup";
    }

    @ReactMethod
    public void pickFolder(Promise promise) {
        Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "no current activity");
            return;
        }
        rejectPending();
        pending = promise;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        try {
            activity.startActivityForResult(intent, REQ_FOLDER);
        } catch (Exception e) {
            pending = null;
            promise.reject("PICK_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void pickFile(Promise promise) {
        Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "no current activity");
            return;
        }
        rejectPending();
        pending = promise;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        try {
            activity.startActivityForResult(intent, REQ_FILE);
        } catch (Exception e) {
            pending = null;
            promise.reject("PICK_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void writeToFolder(String treeUri, String fileName, String content, Promise promise) {
        try {
            DocumentFile dir = DocumentFile.fromTreeUri(getReactApplicationContext(), Uri.parse(treeUri));
            if (dir == null || !dir.canWrite()) {
                promise.reject("NO_ACCESS", "backup folder is not writable");
                return;
            }
            DocumentFile file = dir.findFile(fileName);
            if (file == null) file = dir.createFile(MIME, fileName);
            if (file == null) {
                promise.reject("CREATE_FAILED", "could not create backup file");
                return;
            }
            ContentResolver resolver = getReactApplicationContext().getContentResolver();
            try (OutputStream out = resolver.openOutputStream(file.getUri(), "wt")) {
                if (out == null) {
                    promise.reject("OPEN_FAILED", "could not open backup for writing");
                    return;
                }
                out.write(content.getBytes(StandardCharsets.UTF_8));
            }
            promise.resolve(file.getUri().toString());
        } catch (Exception e) {
            promise.reject("WRITE_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void readFromFolder(String treeUri, String fileName, Promise promise) {
        try {
            DocumentFile dir = DocumentFile.fromTreeUri(getReactApplicationContext(), Uri.parse(treeUri));
            if (dir == null) {
                promise.resolve(null);
                return;
            }
            DocumentFile file = dir.findFile(fileName);
            if (file == null || !file.exists()) {
                promise.resolve(null);
                return;
            }
            promise.resolve(readUri(file.getUri()));
        } catch (Exception e) {
            promise.resolve(null);
        }
    }

    private String readUri(Uri uri) throws Exception {
        ContentResolver resolver = getReactApplicationContext().getContentResolver();
        try (InputStream in = resolver.openInputStream(uri)) {
            if (in == null) return null;
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int n;
            while ((n = in.read(chunk)) != -1) buffer.write(chunk, 0, n);
            return buffer.toString(StandardCharsets.UTF_8.name());
        }
    }

    private void rejectPending() {
        if (pending != null) {
            pending.reject("CANCELLED", "superseded by a new request");
            pending = null;
        }
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        if (requestCode != REQ_FOLDER && requestCode != REQ_FILE) return;
        Promise promise = pending;
        pending = null;
        if (promise == null) return;

        if (resultCode != Activity.RESULT_OK || data == null || data.getData() == null) {
            promise.resolve(null);
            return;
        }
        Uri uri = data.getData();
        try {
            if (requestCode == REQ_FOLDER) {
                int flags = Intent.FLAG_GRANT_READ_URI_PERMISSION
                        | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
                getReactApplicationContext().getContentResolver()
                        .takePersistableUriPermission(uri, flags);
                promise.resolve(uri.toString());
            } else {
                promise.resolve(readUri(uri));
            }
        } catch (Exception e) {
            promise.reject("RESULT_ERROR", e.getMessage(), e);
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
    }
}
