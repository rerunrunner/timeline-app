package com.timeline.editor.service.translation;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class TranslationServiceFactory {

    private final Map<String, TranslationService> providersById;

    public TranslationServiceFactory(List<TranslationService> providers) {
        this.providersById = providers.stream()
                .collect(Collectors.toMap(
                        provider -> normalize(provider.getProviderId()),
                        Function.identity()
                ));
    }

    public TranslationService getProvider(String providerId) {
        String normalizedProviderId = normalize(providerId);
        TranslationService provider = providersById.get(normalizedProviderId);
        if (provider == null) {
            throw new TranslationException("Unsupported translation provider: " + providerId);
        }
        return provider;
    }

    private String normalize(String providerId) {
        return providerId == null ? "" : providerId.trim().toLowerCase(Locale.ROOT);
    }
}
