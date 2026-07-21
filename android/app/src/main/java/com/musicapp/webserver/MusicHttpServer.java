package com.musicapp.webserver;

import android.content.res.AssetManager;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import fi.iki.elonen.NanoHTTPD;

/**
 * Serveur HTTP embarqué : sert la webapp (assets/webapp), la bibliothèque en
 * JSON et le streaming des fichiers audio avec support des requêtes Range.
 *
 * Auth : POST /pair?pin=XXXX -> {token}; ensuite chaque requête passe ?t=token.
 */
public class MusicHttpServer extends NanoHTTPD {
    private final AssetManager assets;
    private final String pin;
    private final Set<String> tokens;
    private final Runnable onTokenIssued;

    private volatile String libraryJson = "{\"tracks\":[],\"playlists\":[],\"likedIds\":[]}";
    private final Map<String, String> trackPaths = new ConcurrentHashMap<>();

    public MusicHttpServer(int port, AssetManager assets, String pin,
                           Set<String> tokens, Runnable onTokenIssued) {
        super(port);
        this.assets = assets;
        this.pin = pin;
        this.tokens = tokens;
        this.onTokenIssued = onTokenIssued;
    }

    public void updateLibrary(String json) {
        libraryJson = json;
        Map<String, String> paths = new HashMap<>();
        try {
            JSONObject obj = new JSONObject(json);
            JSONArray tracks = obj.optJSONArray("tracks");
            if (tracks != null) {
                for (int i = 0; i < tracks.length(); i++) {
                    JSONObject t = tracks.getJSONObject(i);
                    String id = t.optString("id", null);
                    String path = t.optString("path", null);
                    if (id != null && path != null) {
                        if (path.startsWith("file://")) path = path.substring(7);
                        paths.put(id, path);
                    }
                }
            }
        } catch (Exception ignored) {
        }
        trackPaths.clear();
        trackPaths.putAll(paths);
    }

    @Override
    public Response serve(IHTTPSession session) {
        String uri = session.getUri();
        Map<String, String> parms = session.getParms();

        try {
            if ("/pair".equals(uri)) {
                String sent = parms.get("pin");
                if (sent != null && sent.equals(pin)) {
                    String token = UUID.randomUUID().toString();
                    tokens.add(token);
                    if (onTokenIssued != null) onTokenIssued.run();
                    return json("{\"token\":\"" + token + "\"}");
                }
                return status(Response.Status.FORBIDDEN, "PIN invalide");
            }

            if ("/library".equals(uri)) {
                if (!authed(parms)) return status(Response.Status.FORBIDDEN, "token");
                return json(libraryJson);
            }

            if (uri.startsWith("/track/")) {
                if (!authed(parms)) return status(Response.Status.FORBIDDEN, "token");
                String id = java.net.URLDecoder.decode(uri.substring("/track/".length()), "UTF-8");
                String path = trackPaths.get(id);
                if (path == null) return status(Response.Status.NOT_FOUND, "piste inconnue");
                return serveFile(new File(path), session.getHeaders().get("range"));
            }

            return serveAsset(uri);
        } catch (Exception e) {
            return status(Response.Status.INTERNAL_ERROR, String.valueOf(e.getMessage()));
        }
    }

    private boolean authed(Map<String, String> parms) {
        String t = parms.get("t");
        return t != null && tokens.contains(t);
    }

    // ---- static webapp ----

    private Response serveAsset(String uri) throws IOException {
        String path = uri.equals("/") ? "index.html" : uri.substring(1);
        // SPA : toute route sans extension retombe sur index.html
        if (!path.contains(".")) path = "index.html";
        InputStream in;
        try {
            in = assets.open("webapp/" + path);
        } catch (IOException e) {
            return status(Response.Status.NOT_FOUND, "introuvable");
        }
        Response res = newChunkedResponse(Response.Status.OK, mimeFor(path), in);
        res.addHeader("Cache-Control", "no-cache");
        return res;
    }

    private static String mimeFor(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html; charset=utf-8";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".ico")) return "image/x-icon";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".json") || p.endsWith(".map")) return "application/json";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".m4a") || p.endsWith(".mp4")) return "audio/mp4";
        if (p.endsWith(".aac")) return "audio/aac";
        if (p.endsWith(".wav")) return "audio/wav";
        if (p.endsWith(".flac")) return "audio/flac";
        if (p.endsWith(".ogg") || p.endsWith(".opus")) return "audio/ogg";
        if (p.endsWith(".webm")) return "audio/webm";
        if (p.endsWith(".wma")) return "audio/x-ms-wma";
        return "application/octet-stream";
    }

    // ---- audio streaming with Range support ----

    private Response serveFile(File file, String rangeHeader) throws IOException {
        if (!file.exists() || !file.isFile()) {
            return status(Response.Status.NOT_FOUND, "fichier absent");
        }
        long length = file.length();
        String mime = mimeFor(file.getName());

        long start = 0;
        long end = length - 1;
        boolean partial = false;
        if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
            String spec = rangeHeader.substring(6).split(",")[0].trim();
            int dash = spec.indexOf('-');
            if (dash >= 0) {
                String s = spec.substring(0, dash).trim();
                String e = spec.substring(dash + 1).trim();
                try {
                    if (!s.isEmpty()) {
                        start = Long.parseLong(s);
                        if (!e.isEmpty()) end = Math.min(Long.parseLong(e), length - 1);
                    } else if (!e.isEmpty()) {
                        // suffixe : les N derniers octets
                        start = Math.max(0, length - Long.parseLong(e));
                    }
                    partial = true;
                } catch (NumberFormatException ignored) {
                    partial = false;
                }
            }
        }
        if (start > end || start >= length) {
            Response res = status(Response.Status.RANGE_NOT_SATISFIABLE, "range");
            res.addHeader("Content-Range", "bytes */" + length);
            return res;
        }

        FileInputStream fis = new FileInputStream(file);
        long skipped = 0;
        while (skipped < start) {
            long n = fis.skip(start - skipped);
            if (n <= 0) break;
            skipped += n;
        }
        long contentLength = end - start + 1;
        Response res = newFixedLengthResponse(
                partial ? Response.Status.PARTIAL_CONTENT : Response.Status.OK,
                mime, fis, contentLength);
        res.addHeader("Accept-Ranges", "bytes");
        if (partial) {
            res.addHeader("Content-Range", "bytes " + start + "-" + end + "/" + length);
        }
        return res;
    }

    // ---- helpers ----

    private static Response json(String body) {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        Response res = newFixedLengthResponse(Response.Status.OK,
                "application/json; charset=utf-8",
                new ByteArrayInputStream(bytes), bytes.length);
        res.addHeader("Cache-Control", "no-store");
        return res;
    }

    private static Response status(Response.Status st, String msg) {
        return newFixedLengthResponse(st, "text/plain; charset=utf-8", msg);
    }
}
