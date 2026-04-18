package com.timeline.editor.service.translation;

public interface TranslationService {

    String getProviderId();

    TranslationResponse translate(TranslationRequest request, TranslationProviderConfig config);

    record TranslationRequest(
            String sourceLanguageCode,
            String sourceLanguageName,
            String targetLanguageCode,
            String targetLanguageName,
            String displayedDate,
            String displayedTitle,
            String displayedDescription,
            String authorialGuidance
    ) {}

    record TranslationResponse(
            String displayedDate,
            String displayedTitle,
            String displayedDescription
    ) {}

    record TranslationProviderConfig(
            String baseUrl,
            String model,
            String apiKey,
            int timeoutMs
    ) {}
}
