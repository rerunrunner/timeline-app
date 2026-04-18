package com.timeline.editor.service.translation;

import com.timeline.editor.model.AppSettings;
import com.timeline.editor.service.AppSettingsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class TranslationStartupConnectivityCheck {

    private static final Logger log = LoggerFactory.getLogger(TranslationStartupConnectivityCheck.class);

    private final AppSettingsService appSettingsService;
    private final LmStudioTranslationService lmStudioTranslationService;

    public TranslationStartupConnectivityCheck(
            AppSettingsService appSettingsService,
            LmStudioTranslationService lmStudioTranslationService
    ) {
        this.appSettingsService = appSettingsService;
        this.lmStudioTranslationService = lmStudioTranslationService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void verifyTranslationConnectivityOnStartup() {
        AppSettings settings = appSettingsService.getSettings();
        String provider = normalize(settings.getTranslationProvider());

        if (!"lmstudio".equals(provider)) {
            log.info("Skipping translation startup connectivity check for provider={}", settings.getTranslationProvider());
            return;
        }

        if (isBlank(settings.getTranslationBaseUrl()) || isBlank(settings.getTranslationModel())) {
            log.info(
                    "Skipping LM Studio startup connectivity check because configuration is incomplete. baseUrlPresent={} modelPresent={}",
                    !isBlank(settings.getTranslationBaseUrl()),
                    !isBlank(settings.getTranslationModel())
            );
            return;
        }

        TranslationService.TranslationProviderConfig config = new TranslationService.TranslationProviderConfig(
                settings.getTranslationBaseUrl(),
                settings.getTranslationModel(),
                settings.getTranslationApiKey(),
                settings.getTranslationTimeoutMs()
        );

        try {
            LmStudioTranslationService.ModelsCheckResult modelsResult = lmStudioTranslationService.fetchAvailableModels(config);
            boolean configuredModelFound = modelsResult.modelIds().stream()
                    .anyMatch(modelId -> modelId.equals(settings.getTranslationModel()));
            log.info(
                    "LM Studio startup connectivity check succeeded. configuredModel={} modelCount={} configuredModelFound={}",
                    settings.getTranslationModel(),
                    modelsResult.modelIds().size(),
                    configuredModelFound
            );
        } catch (TranslationException e) {
            log.warn(
                    "LM Studio startup connectivity check failed. configuredModel={} baseUrl={}: {}",
                    settings.getTranslationModel(),
                    settings.getTranslationBaseUrl(),
                    e.getMessage(),
                    e
            );
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
