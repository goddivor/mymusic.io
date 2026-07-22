package com.musicapp.webserver;

import android.content.Context;
import android.content.SharedPreferences;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.security.SecureRandom;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Shares the music library over the local Wi-Fi network: starts an embedded
 * HTTP server that serves the webapp and streams tracks (see MusicHttpServer).
 */
public class WebServerModule extends ReactContextBaseJavaModule {
    private static final String PREFS = "webserver";
    private static final String KEY_TOKENS = "tokens";
    private static final int BASE_PORT = 8080;

    private MusicHttpServer server;
    private String pin;
    private int port = BASE_PORT;
    private String lastLibraryJson;
    private final Set<String> tokens =
            Collections.newSetFromMap(new ConcurrentHashMap<String, Boolean>());

    public WebServerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        tokens.addAll(prefs().getStringSet(KEY_TOKENS, new HashSet<String>()));
    }

    @Override
    public String getName() {
        return "WebServer";
    }

    private SharedPreferences prefs() {
        return getReactApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private void persistTokens() {
        prefs().edit().putStringSet(KEY_TOKENS, new HashSet<>(tokens)).apply();
    }

    @ReactMethod
    public void start(Promise promise) {
        try {
            if (server == null) {
                SecureRandom rnd = new SecureRandom();
                pin = String.format("%06d", rnd.nextInt(1000000));

                Exception lastError = null;
                MusicHttpServer created = null;
                for (int p = BASE_PORT; p < BASE_PORT + 10; p++) {
                    try {
                        MusicHttpServer candidate = new MusicHttpServer(
                                p, getReactApplicationContext().getAssets(), pin,
                                tokens, this::persistTokens);
                        candidate.start(MusicHttpServer.SOCKET_READ_TIMEOUT, false);
                        created = candidate;
                        port = p;
                        break;
                    } catch (Exception e) {
                        lastError = e;
                    }
                }
                if (created == null) {
                    throw lastError != null ? lastError : new Exception("port indisponible");
                }
                server = created;
                if (lastLibraryJson != null) server.updateLibrary(lastLibraryJson);
            }
            WritableMap map = Arguments.createMap();
            map.putString("ip", localIp());
            map.putInt("port", port);
            map.putString("pin", pin);
            promise.resolve(map);
        } catch (Exception e) {
            promise.reject("START_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void stop(Promise promise) {
        try {
            if (server != null) {
                server.stop();
                server = null;
            }
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("STOP_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void isRunning(Promise promise) {
        promise.resolve(server != null && server.isAlive());
    }

    @ReactMethod
    public void status(Promise promise) {
        boolean running = server != null && server.isAlive();
        WritableMap map = Arguments.createMap();
        map.putBoolean("running", running);
        map.putString("ip", running ? localIp() : "");
        map.putInt("port", port);
        if (running && pin != null) {
            map.putString("pin", pin);
        } else {
            map.putNull("pin");
        }
        promise.resolve(map);
    }

    @ReactMethod
    public void updateLibrary(String json) {
        lastLibraryJson = json;
        if (server != null) server.updateLibrary(json);
    }

    /** First site-local IPv4 address, preferring wlan interfaces. */
    private static String localIp() {
        try {
            String fallback = "";
            Enumeration<NetworkInterface> ifs = NetworkInterface.getNetworkInterfaces();
            while (ifs.hasMoreElements()) {
                NetworkInterface nif = ifs.nextElement();
                if (!nif.isUp() || nif.isLoopback()) continue;
                Enumeration<InetAddress> addrs = nif.getInetAddresses();
                while (addrs.hasMoreElements()) {
                    InetAddress a = addrs.nextElement();
                    if (a instanceof Inet4Address && a.isSiteLocalAddress()) {
                        String ip = a.getHostAddress();
                        if (nif.getName().startsWith("wlan")) return ip;
                        if (fallback.isEmpty()) fallback = ip;
                    }
                }
            }
            return fallback;
        } catch (Exception e) {
            return "";
        }
    }
}
