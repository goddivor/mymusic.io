package com.musicapp.recorder;

import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Build;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import java.io.File;
import java.io.FileOutputStream;
import java.io.RandomAccessFile;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Captures a short microphone clip for song recognition.
 *
 * The capture waits for sound instead of assuming it is already there: the
 * button is pressed inside this app and the music may only start once the user
 * has walked over to another one. A foreground service carries the session,
 * because Android silences the microphone for background processes.
 */
public class AudioRecorderModule extends ReactContextBaseJavaModule {
    private static final int SAMPLE_RATE = 44100;
    private static final int CHUNK_MS = 120;
    private static final int SUSTAIN_MS = 700;
    private static final double SILENCE_RMS = 320.0;

    private static final AtomicBoolean cancelled = new AtomicBoolean(false);

    private final ExecutorService pool = Executors.newSingleThreadExecutor();

    public AudioRecorderModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "AudioRecorder";
    }

    static void requestCancel() {
        cancelled.set(true);
    }

    @ReactMethod
    public void cancel(Promise promise) {
        cancelled.set(true);
        promise.resolve(null);
    }

    @ReactMethod
    public void capture(int waitSeconds, int clipSeconds, String title, String body,
                        String cancelLabel, Promise promise) {
        cancelled.set(false);
        IdentifyService.start(getReactApplicationContext(), title, body, cancelLabel);
        pool.execute(() -> {
            try {
                promise.resolve(run(waitSeconds, clipSeconds));
            } catch (Exception e) {
                promise.reject("capture", e.getMessage(), e);
            } finally {
                IdentifyService.stop(getReactApplicationContext());
            }
        });
    }

    /** Posts the outcome so a session started before leaving the app is seen. */
    @ReactMethod
    public void notifyResult(String title, String body, Promise promise) {
        IdentifyService.postResult(getReactApplicationContext(), title, body);
        promise.resolve(null);
    }

    /**
     * Waits for sound before committing to a source. The user presses the button
     * inside this app and only then walks over to TikTok, so deciding at the
     * first probe would capture an empty room. The two sources cannot be open at
     * once, so they are probed in turn until one of them actually carries audio.
     */
    /**
     * Holds one microphone stream open for the whole session instead of probing
     * in bursts. Reopening the input every few hundred milliseconds makes the
     * audio policy duck whatever else is playing, which cut the very sound the
     * user walked to another app to capture. Reading continuously also lets the
     * trigger require a sustained level, so a door slam or a notification chime
     * no longer burns the ten seconds before the music starts.
     */
    private WritableMap run(int waitSeconds, int clipSeconds) throws Exception {
        File clip = new File(getReactApplicationContext().getCacheDir(), "identify-clip.wav");
        if (clip.exists() && !clip.delete()) throw new IllegalStateException("Could not clear the clip");

        AudioRecord mic = openMic();
        if (mic == null) return result(null, "unavailable", 0);

        try {
            int chunk = SAMPLE_RATE * CHUNK_MS / 1000;
            short[] buf = new short[chunk];
            long deadline = System.currentTimeMillis() + waitSeconds * 1000L;
            int loudChunks = 0;
            int needed = Math.max(1, SUSTAIN_MS / CHUNK_MS);

            while (System.currentTimeMillis() < deadline) {
                if (cancelled.get()) return result(null, "cancelled", 0);
                int read = mic.read(buf, 0, chunk);
                if (read <= 0) continue;
                loudChunks = rms(buf, read) > SILENCE_RMS ? loudChunks + 1 : 0;
                if (loudChunks >= needed) {
                    double level = record(mic, clip, clipSeconds);
                    if (cancelled.get()) return result(null, "cancelled", 0);
                    return result(clip, "mic", level);
                }
            }
            return result(null, "silence", 0);
        } finally {
            release(mic);
        }
    }

    private double rms(short[] buf, int count) {
        double sum = 0;
        for (int i = 0; i < count; i++) sum += (double) buf[i] * buf[i];
        return Math.sqrt(sum / count);
    }

    private WritableMap result(File clip, String source, double level) {
        WritableMap map = Arguments.createMap();
        map.putString("path", clip != null && clip.exists() ? clip.getAbsolutePath() : null);
        map.putString("source", source);
        map.putDouble("level", level);
        return map;
    }

    private int bufferSize() {
        int min = AudioRecord.getMinBufferSize(
                SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
        return Math.max(min, SAMPLE_RATE);
    }

    private AudioRecord openMic() {
        try {
            AudioRecord r = new AudioRecord(
                    MediaRecorder.AudioSource.MIC, SAMPLE_RATE,
                    AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, bufferSize());
            if (r.getState() != AudioRecord.STATE_INITIALIZED) return null;
            r.startRecording();
            return r;
        } catch (Exception e) {
            return null;
        }
    }

    private double record(AudioRecord source, File out, int seconds) throws Exception {
        int total = SAMPLE_RATE * seconds;
        short[] buf = new short[SAMPLE_RATE / 4];
        double sum = 0;
        long counted = 0;

        try (FileOutputStream fos = new FileOutputStream(out)) {
            fos.write(new byte[44]);
            int written = 0;
            while (written < total && !cancelled.get()) {
                int read = source.read(buf, 0, Math.min(buf.length, total - written));
                if (read <= 0) break;
                byte[] bytes = new byte[read * 2];
                for (int i = 0; i < read; i++) {
                    bytes[i * 2] = (byte) (buf[i] & 0xff);
                    bytes[i * 2 + 1] = (byte) ((buf[i] >> 8) & 0xff);
                    sum += (double) buf[i] * buf[i];
                }
                counted += read;
                fos.write(bytes);
                written += read;
            }
        }
        writeWavHeader(out);
        return counted == 0 ? 0 : Math.sqrt(sum / counted);
    }

    /** Fills in the 44-byte RIFF header once the payload length is known. */
    private void writeWavHeader(File file) throws Exception {
        long payload = file.length() - 44;
        long riff = payload + 36;
        int byteRate = SAMPLE_RATE * 2;
        byte[] h = new byte[44];
        System.arraycopy("RIFF".getBytes(), 0, h, 0, 4);
        putLe(h, 4, riff, 4);
        System.arraycopy("WAVEfmt ".getBytes(), 0, h, 8, 8);
        putLe(h, 16, 16, 4);
        putLe(h, 20, 1, 2);
        putLe(h, 22, 1, 2);
        putLe(h, 24, SAMPLE_RATE, 4);
        putLe(h, 28, byteRate, 4);
        putLe(h, 32, 2, 2);
        putLe(h, 34, 16, 2);
        System.arraycopy("data".getBytes(), 0, h, 36, 4);
        putLe(h, 40, payload, 4);
        try (RandomAccessFile raf = new RandomAccessFile(file, "rw")) {
            raf.seek(0);
            raf.write(h);
        }
    }

    private void putLe(byte[] target, int offset, long value, int width) {
        for (int i = 0; i < width; i++) target[offset + i] = (byte) ((value >> (8 * i)) & 0xff);
    }

    private void release(AudioRecord record) {
        try {
            record.stop();
        } catch (Exception ignored) {
            // stop() throws when nothing was captured; the handle is released anyway.
        }
        record.release();
    }
}
