package com.timeline.editor.service;

import com.timeline.editor.model.AppSettings;
import com.timeline.editor.model.Language;
import com.timeline.editor.model.Reveal;
import com.timeline.editor.model.RevealTranslation;
import com.timeline.editor.repository.LanguageRepository;
import com.timeline.editor.repository.RevealRepository;
import com.timeline.editor.repository.RevealTranslationRepository;
import com.timeline.editor.service.translation.TranslationException;
import com.timeline.editor.service.translation.TranslationService;
import com.timeline.editor.service.translation.TranslationServiceFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Service
public class TranslationManagerService {

    private static final Logger log = LoggerFactory.getLogger(TranslationManagerService.class);

    private final AppSettingsService appSettingsService;
    private final RevealRepository revealRepository;
    private final RevealTranslationRepository revealTranslationRepository;
    private final RevealTranslationService revealTranslationService;
    private final LanguageRepository languageRepository;
    private final TranslationServiceFactory translationServiceFactory;

    public TranslationManagerService(
            AppSettingsService appSettingsService,
            RevealRepository revealRepository,
            RevealTranslationRepository revealTranslationRepository,
            RevealTranslationService revealTranslationService,
            LanguageRepository languageRepository,
            TranslationServiceFactory translationServiceFactory
    ) {
        this.appSettingsService = appSettingsService;
        this.revealRepository = revealRepository;
        this.revealTranslationRepository = revealTranslationRepository;
        this.revealTranslationService = revealTranslationService;
        this.languageRepository = languageRepository;
        this.translationServiceFactory = translationServiceFactory;
    }

    @Async
    public CompletableFuture<Void> autoTranslateReveal(Long revealId) {
        try {
            AppSettings settings = appSettingsService.getSettings();
            if (!Boolean.TRUE.equals(settings.getAutoTranslateOnSave()) || !isProviderReady(settings)) {
                return CompletableFuture.completedFuture(null);
            }

            Reveal reveal = getRevealOrNull(revealId);
            if (reveal == null || isTranslationContentBlank(reveal)) {
                return CompletableFuture.completedFuture(null);
            }

            translateRevealToEnabledLanguages(reveal, settings, true, "ai-auto");
        } catch (Exception e) {
            log.error("Unexpected auto-translation setup failure for reveal {}", revealId, e);
        }

        return CompletableFuture.completedFuture(null);
    }

    public List<RevealTranslationService.ResolvedRevealTranslation> translateRevealToEnabledLanguages(Long revealId) {
        AppSettings settings = appSettingsService.getSettings();
        if (!isProviderReady(settings)) {
            throw new TranslationException("Translation provider is not fully configured.");
        }

        Reveal reveal = revealRepository.findById(revealId)
                .orElseThrow(() -> new NoSuchElementException("Reveal not found: " + revealId));
        if (isTranslationContentBlank(reveal)) {
            throw new TranslationException("Reveal has no translatable text.");
        }

        log.info(
                "Starting manual translation for reveal {} using provider={} model={} timeoutMs={}",
                revealId,
                settings.getTranslationProvider(),
                settings.getTranslationModel(),
                settings.getTranslationTimeoutMs()
        );
        return translateRevealToEnabledLanguages(reveal, settings, true, "ai-manual");
    }

    public RevealTranslationService.ResolvedRevealTranslation translateReveal(Long revealId, String targetLanguageCode) {
        AppSettings settings = appSettingsService.getSettings();
        if (!isProviderReady(settings)) {
            throw new TranslationException("Translation provider is not fully configured.");
        }

        Reveal reveal = revealRepository.findById(revealId)
                .orElseThrow(() -> new NoSuchElementException("Reveal not found: " + revealId));
        if (isTranslationContentBlank(reveal)) {
            throw new TranslationException("Reveal has no translatable text.");
        }

        Language targetLanguage = getEnabledTargetLanguage(targetLanguageCode);

        log.info(
                "Starting manual translation for reveal {} into {} using provider={} model={} timeoutMs={}",
                revealId,
                targetLanguage.getCode(),
                settings.getTranslationProvider(),
                settings.getTranslationModel(),
                settings.getTranslationTimeoutMs()
        );

        return tryTranslateReveal(reveal, targetLanguage, settings, "ai-manual");
    }

    private boolean isProviderReady(AppSettings settings) {
        String provider = normalize(settings.getTranslationProvider());
        if (provider.isBlank()) {
            return false;
        }

        if ("lmstudio".equals(provider)) {
            return isNonBlank(settings.getTranslationBaseUrl()) && isNonBlank(settings.getTranslationModel());
        }

        return false;
    }

    private List<Language> getEnabledTargetLanguages() {
        return languageRepository.findByIsEnabledTrueOrderByIsDefaultDescNameAsc().stream()
                .filter(language -> !Boolean.TRUE.equals(language.getIsDefault()))
                .toList();
    }

    private Language getEnabledTargetLanguage(String targetLanguageCode) {
        Language language = languageRepository.findByCode(targetLanguageCode)
                .orElseThrow(() -> new NoSuchElementException("Language not found: " + targetLanguageCode));
        if (!Boolean.TRUE.equals(language.getIsEnabled()) || Boolean.TRUE.equals(language.getIsDefault())) {
            throw new TranslationException("Language is not an enabled target language: " + targetLanguageCode);
        }
        return language;
    }

    private List<RevealTranslationService.ResolvedRevealTranslation> translateRevealToEnabledLanguages(
            Reveal reveal,
            AppSettings settings,
            boolean preserveManualTranslations,
            String sourceLabel
    ) {
        List<Language> targetLanguages = getEnabledTargetLanguages();
        if (targetLanguages.isEmpty()) {
            throw new TranslationException("No enabled target languages are configured.");
        }

        log.info(
                "Translating reveal {} into {} enabled target languages (preserveManualTranslations={}, sourceLabel={})",
                reveal.getId(),
                targetLanguages.size(),
                preserveManualTranslations,
                sourceLabel
        );

        return targetLanguages.stream()
                .filter(targetLanguage -> !preserveManualTranslations
                        || !shouldPreserveExistingTranslation(
                                revealTranslationRepository.findByRevealIdAndLanguageId(reveal.getId(), targetLanguage.getId())
                        ))
                .map(targetLanguage -> tryTranslateReveal(reveal, targetLanguage, settings, sourceLabel))
                .toList();
    }

    private RevealTranslationService.ResolvedRevealTranslation tryTranslateReveal(
            Reveal reveal,
            Language targetLanguage,
            AppSettings settings,
            String sourceLabel
    ) {
        try {
            log.info(
                    "Preparing translation for reveal {} into {} ({})",
                    reveal.getId(),
                    targetLanguage.getCode(),
                    targetLanguage.getName()
            );
            TranslationService provider = translationServiceFactory.getProvider(settings.getTranslationProvider());
            TranslationService.TranslationProviderConfig providerConfig =
                    new TranslationService.TranslationProviderConfig(
                            settings.getTranslationBaseUrl(),
                            settings.getTranslationModel(),
                            settings.getTranslationApiKey(),
                            settings.getTranslationTimeoutMs()
                    );

            Language sourceLanguage = languageRepository.findByIsDefaultTrue()
                    .orElseGet(() -> new Language(null, "en", "English", true, true));

            TranslationService.TranslationRequest request = new TranslationService.TranslationRequest(
                    sourceLanguage.getCode(),
                    sourceLanguage.getName(),
                    targetLanguage.getCode(),
                    targetLanguage.getName(),
                    reveal.getDisplayedDate(),
                    reveal.getDisplayedTitle(),
                    reveal.getDisplayedDescription(),
                    reveal.getTranslationContext()
            );

            TranslationService.TranslationResponse response = provider.translate(request, providerConfig);
            log.info(
                    "Translation provider returned content for reveal {} into {}",
                    reveal.getId(),
                    targetLanguage.getCode()
            );
            return revealTranslationService.upsertTranslation(
                    reveal.getId(),
                    targetLanguage.getCode(),
                    new RevealTranslationService.TranslationUpsertRequest(
                            response.displayedDate(),
                            response.displayedTitle(),
                            response.displayedDescription(),
                            sourceLabel
                    )
            );
        } catch (TranslationException e) {
            log.warn(
                    "Translation failed for reveal {} into {}: {}",
                    reveal.getId(),
                    targetLanguage.getCode(),
                    e.getMessage(),
                    e
            );
            throw e;
        } catch (Exception e) {
            log.error("Unexpected translation failure for reveal {} into {}", reveal.getId(), targetLanguage.getCode(), e);
            throw e;
        }
    }

    private Reveal getRevealOrNull(Long revealId) {
        return revealRepository.findById(revealId).orElse(null);
    }

    private boolean isTranslationContentBlank(Reveal reveal) {
        return !isNonBlank(reveal.getDisplayedDate())
                && !isNonBlank(reveal.getDisplayedTitle())
                && !isNonBlank(reveal.getDisplayedDescription());
    }

    private boolean shouldPreserveExistingTranslation(Optional<RevealTranslation> existingTranslation) {
        if (existingTranslation.isEmpty()) {
            return false;
        }

        String source = existingTranslation.get().getSource();
        return source == null || !normalize(source).startsWith("ai-");
    }

    private boolean isNonBlank(String value) {
        return value != null && !value.isBlank();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
