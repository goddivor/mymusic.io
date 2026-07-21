package com.musicapp.ytextractor;

import org.schabi.newpipe.extractor.downloader.Downloader;
import org.schabi.newpipe.extractor.downloader.Request;
import org.schabi.newpipe.extractor.downloader.Response;
import org.schabi.newpipe.extractor.exceptions.ReCaptchaException;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.RequestBody;
import okhttp3.ResponseBody;

/** OkHttp-based HTTP client required by NewPipeExtractor. */
public class DownloaderImpl extends Downloader {
    public static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0";

    private static DownloaderImpl instance;

    private final OkHttpClient client;

    private DownloaderImpl() {
        client = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build();
    }

    public static synchronized DownloaderImpl getInstance() {
        if (instance == null) {
            instance = new DownloaderImpl();
        }
        return instance;
    }

    @Override
    public Response execute(Request request) throws IOException, ReCaptchaException {
        byte[] dataToSend = request.dataToSend();
        RequestBody body = dataToSend == null ? null : RequestBody.create(dataToSend);

        okhttp3.Request.Builder builder = new okhttp3.Request.Builder()
                .url(request.url())
                .method(request.httpMethod(), body)
                .addHeader("User-Agent", USER_AGENT);

        for (Map.Entry<String, List<String>> header : request.headers().entrySet()) {
            String name = header.getKey();
            builder.removeHeader(name);
            for (String value : header.getValue()) {
                builder.addHeader(name, value);
            }
        }

        try (okhttp3.Response response = client.newCall(builder.build()).execute()) {
            if (response.code() == 429) {
                throw new ReCaptchaException("reCaptcha Challenge requested", request.url());
            }
            ResponseBody responseBody = response.body();
            String bodyString = responseBody == null ? "" : responseBody.string();
            return new Response(
                    response.code(),
                    response.message(),
                    response.headers().toMultimap(),
                    bodyString,
                    response.request().url().toString());
        }
    }
}
