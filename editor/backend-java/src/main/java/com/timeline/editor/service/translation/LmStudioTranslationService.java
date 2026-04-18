package com.timeline.editor.service.translation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.Proxy;
import java.net.URI;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class LmStudioTranslationService implements TranslationService {

    private static final String PROVIDER_ID = "lmstudio";
    private static final int LOG_SNIPPET_LIMIT = 2000;
    private static final int MODELS_REQUEST_TIMEOUT_MS = 5000;
    private static final MediaType JSON_MEDIA_TYPE = MediaType.get("application/json");

    private static final Logger log = LoggerFactory.getLogger(LmStudioTranslationService.class);

    private final ObjectMapper objectMapper;
    private final OkHttpClient httpClient;

    public LmStudioTranslationService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(Duration.ofSeconds(5))
                .proxy(Proxy.NO_PROXY)
                .build();
    }

    @Override
    public String getProviderId() {
        return PROVIDER_ID;
    }

    @Override
    public TranslationResponse translate(TranslationRequest request, TranslationProviderConfig config) {
        try {
            URI uri = URI.create(buildChatCompletionsUrl(config.baseUrl()));

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("model", config.model());
            payload.put("temperature", 0.5);
            payload.put("messages", List.of(
                    Map.of("role", "system", "content", buildSystemPrompt()),
                    Map.of("role", "user", "content", buildUserPrompt(request))
            ));

            String requestBody = objectMapper.writeValueAsString(payload);
            Request.Builder requestBuilder = new Request.Builder()
                    .url(uri.toString())
                    .header("Content-Type", "application/json")
                    .post(RequestBody.create(requestBody, JSON_MEDIA_TYPE));

            if (config.apiKey() != null && !config.apiKey().isBlank()) {
                requestBuilder.header("Authorization", "Bearer " + config.apiKey());
            }

            log.info(
                    "Sending LM Studio translation request. uri={} model={} timeoutMs={} payloadSnippet={}",
                    uri,
                    config.model(),
                    config.timeoutMs(),
                    abbreviateForLog(requestBody)
            );

            long requestStartedAt = System.currentTimeMillis();
            String responseBody;
            int statusCode;
            try (Response response = httpClient.newBuilder()
                    .callTimeout(Duration.ofMillis(config.timeoutMs()))
                    .readTimeout(Duration.ofMillis(config.timeoutMs()))
                    .writeTimeout(Duration.ofMillis(config.timeoutMs()))
                    .build()
                    .newCall(requestBuilder.build())
                    .execute()) {
                long elapsedMs = System.currentTimeMillis() - requestStartedAt;
                statusCode = response.code();
                responseBody = response.body() != null ? response.body().string() : "";
                log.info(
                        "Received LM Studio translation response. uri={} model={} status={} elapsedMs={} bodySnippet={}",
                        uri,
                        config.model(),
                        statusCode,
                        elapsedMs,
                        abbreviateForLog(responseBody)
                );
            }
            if (statusCode < 200 || statusCode >= 300) {
                throw new TranslationException("LM Studio request failed with status " + statusCode + ": " + responseBody);
            }

            JsonNode root;
            try {
                root = objectMapper.readTree(responseBody);
            } catch (IOException e) {
                log.warn(
                        "Failed to parse LM Studio HTTP response body as JSON. model={} bodySnippet={}",
                        config.model(),
                        abbreviateForLog(responseBody)
                );
                throw new TranslationException("Failed to parse LM Studio translation response.", e);
            }

            JsonNode contentNode = root.path("choices").path(0).path("message").path("content");
            if (contentNode.isMissingNode() || contentNode.isNull() || contentNode.asText().isBlank()) {
                throw new TranslationException("LM Studio response did not include translated content.");
            }

            String content = contentNode.asText();
            JsonNode translatedJson;
            try {
                translatedJson = parseStructuredTranslation(content);
            } catch (IOException e) {
                log.warn(
                        "Failed to parse LM Studio message content as JSON. model={} contentSnippet={} bodySnippet={}",
                        config.model(),
                        abbreviateForLog(content),
                        abbreviateForLog(responseBody)
                );
                throw new TranslationException("Failed to parse LM Studio translation response.", e);
            }

            return new TranslationResponse(
                    readNullableText(translatedJson, "displayedDate"),
                    readNullableText(translatedJson, "displayedTitle"),
                    readNullableText(translatedJson, "displayedDescription")
            );
        } catch (IOException e) {
            throw new TranslationException("Failed to parse LM Studio translation response.", e);
        } catch (IllegalArgumentException e) {
            throw new TranslationException("Invalid LM Studio configuration.", e);
        }
    }

    public ModelsCheckResult fetchAvailableModels(TranslationProviderConfig config) {
        try {
            URI uri = URI.create(buildModelsUrl(config.baseUrl()));
            Request request = new Request.Builder()
                    .url(uri.toString())
                    .get()
                    .build();

            log.info(
                    "Sending LM Studio models request. uri={} timeoutMs={}",
                    uri,
                    MODELS_REQUEST_TIMEOUT_MS
            );

            long requestStartedAt = System.currentTimeMillis();
            String responseBody;
            int statusCode;
            try (Response response = httpClient.newBuilder()
                    .callTimeout(Duration.ofMillis(MODELS_REQUEST_TIMEOUT_MS))
                    .readTimeout(Duration.ofMillis(MODELS_REQUEST_TIMEOUT_MS))
                    .build()
                    .newCall(request)
                    .execute()) {
                long elapsedMs = System.currentTimeMillis() - requestStartedAt;
                statusCode = response.code();
                responseBody = response.body() != null ? response.body().string() : "";
                log.info(
                        "Received LM Studio models response. uri={} status={} elapsedMs={} bodySnippet={}",
                        uri,
                        statusCode,
                        elapsedMs,
                        abbreviateForLog(responseBody)
                );
            }

            if (statusCode < 200 || statusCode >= 300) {
                throw new TranslationException("LM Studio models request failed with status " + statusCode + ": " + responseBody);
            }

            JsonNode root = objectMapper.readTree(responseBody);
            List<String> modelIds = root.path("data").findValuesAsText("id");
            return new ModelsCheckResult(modelIds);
        } catch (IOException e) {
            throw new TranslationException("Failed to parse LM Studio models response.", e);
        } catch (IllegalArgumentException e) {
            throw new TranslationException("Invalid LM Studio configuration.", e);
        }
    }

    private String buildChatCompletionsUrl(String baseUrl) {
        String trimmedBaseUrl = baseUrl == null ? "" : baseUrl.trim();
        if (trimmedBaseUrl.isEmpty()) {
            throw new IllegalArgumentException("LM Studio base URL is required.");
        }
        String normalizedBaseUrl = trimmedBaseUrl.endsWith("/") ? trimmedBaseUrl.substring(0, trimmedBaseUrl.length() - 1) : trimmedBaseUrl;
        if (normalizedBaseUrl.endsWith("/chat/completions")) {
            return normalizedBaseUrl;
        }
        return normalizedBaseUrl + "/chat/completions";
    }

    private String buildModelsUrl(String baseUrl) {
        String trimmedBaseUrl = baseUrl == null ? "" : baseUrl.trim();
        if (trimmedBaseUrl.isEmpty()) {
            throw new IllegalArgumentException("LM Studio base URL is required.");
        }
        String normalizedBaseUrl = trimmedBaseUrl.endsWith("/") ? trimmedBaseUrl.substring(0, trimmedBaseUrl.length() - 1) : trimmedBaseUrl;
        if (normalizedBaseUrl.endsWith("/models")) {
            return normalizedBaseUrl;
        }
        if (normalizedBaseUrl.endsWith("/v1")) {
            return normalizedBaseUrl + "/models";
        }
        return normalizedBaseUrl + "/v1/models";
    }

    private String buildSystemPrompt() {
        return """
                Translate the provided text fields from the source language to the target language.
                Preserve tone and narrative intent.
                Use hints when present.
                Do not explain your work.
                Do not include reasoning.
                Return only a JSON object with exactly these keys:
                displayedDate, displayedTitle, displayedDescription.
                If any source field is null or blank, return null for that field.
                """;
    }

    private String buildUserPrompt(TranslationRequest request) throws IOException {
        Map<String, Object> promptPayload = new LinkedHashMap<>();
        Map<String, Object> sourceFields = new LinkedHashMap<>();
        promptPayload.put("sourceLanguageCode", request.sourceLanguageCode());
        promptPayload.put("sourceLanguageName", request.sourceLanguageName());
        promptPayload.put("targetLanguageCode", request.targetLanguageCode());
        promptPayload.put("targetLanguageName", request.targetLanguageName());
        promptPayload.put("hints", blankToNull(request.authorialGuidance()));
        sourceFields.put("displayedDate", blankToNull(request.displayedDate()));
        sourceFields.put("displayedTitle", blankToNull(request.displayedTitle()));
        sourceFields.put("displayedDescription", blankToNull(request.displayedDescription()));
        promptPayload.put("sourceFields", sourceFields);

        return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(promptPayload);
    }

    private JsonNode parseStructuredTranslation(String content) throws IOException {
        String trimmedContent = stripMarkdownCodeFence(content.trim());
        try {
            return objectMapper.readTree(trimmedContent);
        } catch (IOException initialError) {
            String extractedObject = extractFirstJsonObject(trimmedContent);
            if (extractedObject != null) {
                return objectMapper.readTree(extractedObject);
            }
            throw initialError;
        }
    }

    private String stripMarkdownCodeFence(String content) {
        if (!content.startsWith("```")) {
            return content;
        }

        int firstNewline = content.indexOf('\n');
        if (firstNewline < 0) {
            return content;
        }

        String withoutOpeningFence = content.substring(firstNewline + 1);
        int closingFence = withoutOpeningFence.lastIndexOf("```");
        if (closingFence < 0) {
            return content;
        }

        return withoutOpeningFence.substring(0, closingFence).trim();
    }

    private String extractFirstJsonObject(String content) {
        int start = content.indexOf('{');
        if (start < 0) {
            return null;
        }

        boolean inString = false;
        boolean escaping = false;
        int depth = 0;

        for (int i = start; i < content.length(); i++) {
            char current = content.charAt(i);

            if (escaping) {
                escaping = false;
                continue;
            }

            if (current == '\\') {
                escaping = true;
                continue;
            }

            if (current == '"') {
                inString = !inString;
                continue;
            }

            if (inString) {
                continue;
            }

            if (current == '{') {
                depth++;
            } else if (current == '}') {
                depth--;
                if (depth == 0) {
                    return content.substring(start, i + 1);
                }
            }
        }

        return null;
    }

    private String readNullableText(JsonNode jsonNode, String fieldName) {
        JsonNode field = jsonNode.get(fieldName);
        if (field == null || field.isNull()) {
            return null;
        }
        String value = field.asText();
        return value.isBlank() ? null : value;
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
    }

    private String abbreviateForLog(String value) {
        if (value == null) {
            return "null";
        }
        String normalized = value.replace("\r", "\\r").replace("\n", "\\n");
        if (normalized.length() <= LOG_SNIPPET_LIMIT) {
            return normalized;
        }
        return normalized.substring(0, LOG_SNIPPET_LIMIT) + "...(truncated)";
    }

    public record ModelsCheckResult(
            List<String> modelIds
    ) {}
}
