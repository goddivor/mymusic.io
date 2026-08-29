package com.musicapp.recorder;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

/**
 * Keeps the capture alive once the user leaves the app. Two things need it:
 * Android silences the microphone for background processes, and MediaProjection
 * refuses to start without a foreground service. The notification is therefore
 * not decoration — it is the permission slip, and it doubles as the only place
 * a listening session can be seen and cancelled from another app.
 */
public class IdentifyService extends Service {
    public static final String CHANNEL_ID = "identify";
    public static final String ACTION_CANCEL = "com.musicapp.recorder.CANCEL";
    private static final int NOTIFICATION_ID = 4711;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_CANCEL.equals(intent.getAction())) {
            AudioRecorderModule.requestCancel();
            stopSelf();
            return START_NOT_STICKY;
        }
        startForeground(NOTIFICATION_ID, build(intent), types());
        return START_NOT_STICKY;
    }

    private int types() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return 0;
        return ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE;
    }

    private Notification build(Intent intent) {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm.getNotificationChannel(CHANNEL_ID) == null) {
            NotificationChannel channel =
                    new NotificationChannel(CHANNEL_ID, "Identify", NotificationManager.IMPORTANCE_LOW);
            channel.setShowBadge(false);
            nm.createNotificationChannel(channel);
        }

        String title = intent != null ? intent.getStringExtra("title") : null;
        String body = intent != null ? intent.getStringExtra("body") : null;
        String cancel = intent != null ? intent.getStringExtra("cancel") : null;

        Intent stop = new Intent(this, IdentifyService.class).setAction(ACTION_CANCEL);
        PendingIntent stopIntent = PendingIntent.getService(
                this, 0, stop, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent openIntent = open == null ? null : PendingIntent.getActivity(
                this, 1, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title != null ? title : "Listening…")
                .setContentText(body != null ? body : "")
                .setSmallIcon(getApplicationInfo().icon)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .addAction(0, cancel != null ? cancel : "Cancel", stopIntent);
        if (openIntent != null) b.setContentIntent(openIntent);
        return b.build();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    static void start(Context ctx, String title, String body, String cancel) {
        Intent i = new Intent(ctx, IdentifyService.class)
                .putExtra("title", title)
                .putExtra("body", body)
                .putExtra("cancel", cancel);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(i);
        else ctx.startService(i);
    }

    /** A plain, dismissible notification: the session is over, the news is not. */
    static void postResult(Context ctx, String title, String body) {
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm.getNotificationChannel(CHANNEL_ID) == null) {
            nm.createNotificationChannel(
                    new NotificationChannel(CHANNEL_ID, "Identify", NotificationManager.IMPORTANCE_LOW));
        }
        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        PendingIntent openIntent = open == null ? null : PendingIntent.getActivity(
                ctx, 2, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(body)
                .setSmallIcon(ctx.getApplicationInfo().icon)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);
        if (openIntent != null) b.setContentIntent(openIntent);
        nm.notify(NOTIFICATION_ID + 1, b.build());
    }

    static void stop(Context ctx) {
        ctx.stopService(new Intent(ctx, IdentifyService.class));
    }
}
