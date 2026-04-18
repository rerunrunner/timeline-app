package com.timeline.editor.service;

import com.timeline.editor.model.Language;
import com.timeline.editor.model.Reveal;
import com.timeline.editor.model.RevealTranslation;
import com.timeline.editor.repository.LanguageRepository;
import com.timeline.editor.repository.RevealRepository;
import com.timeline.editor.repository.RevealTranslationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
public class RevealTranslationService {

    private final RevealRepository revealRepository;
    private final LanguageRepository languageRepository;
    private final RevealTranslationRepository revealTranslationRepository;

    public RevealTranslationService(
            RevealRepository revealRepository,
            LanguageRepository languageRepository,
            RevealTranslationRepository revealTranslationRepository
    ) {
        this.revealRepository = revealRepository;
        this.languageRepository = languageRepository;
        this.revealTranslationRepository = revealTranslationRepository;
    }

    public List<Language> getLanguages(boolean enabledOnly) {
        return enabledOnly
                ? languageRepository.findByIsEnabledTrueOrderByIsDefaultDescNameAsc()
                : languageRepository.findAllByOrderByIsDefaultDescNameAsc();
    }

    public List<ResolvedRevealTranslation> getResolvedTranslations(Long revealId) {
        Reveal reveal = getRevealOrThrow(revealId);
        return languageRepository.findByIsEnabledTrueOrderByIsDefaultDescNameAsc().stream()
                .map(language -> resolveTranslation(reveal, language))
                .toList();
    }

    public ResolvedRevealTranslation getResolvedTranslation(Long revealId, String languageCode) {
        Reveal reveal = getRevealOrThrow(revealId);
        Language language = getLanguageByCodeOrThrow(languageCode);
        return resolveTranslation(reveal, language);
    }

    public ResolvedRevealTranslation upsertTranslation(Long revealId, String languageCode, TranslationUpsertRequest request) {
        Reveal reveal = getRevealOrThrow(revealId);
        Language language = getLanguageByCodeOrThrow(languageCode);

        if (Boolean.TRUE.equals(language.getIsDefault())) {
            throw new IllegalArgumentException("Default language content must remain on the base reveal.");
        }

        RevealTranslation translation = revealTranslationRepository
                .findByRevealIdAndLanguageId(revealId, language.getId())
                .orElseGet(RevealTranslation::new);

        translation.setRevealId(reveal.getId());
        translation.setLanguageId(language.getId());
        translation.setDisplayedDate(request.displayedDate());
        translation.setDisplayedTitle(request.displayedTitle());
        translation.setDisplayedDescription(request.displayedDescription());
        translation.setSource(request.source());

        RevealTranslation savedTranslation = revealTranslationRepository.save(translation);
        return resolveTranslation(reveal, language, Optional.of(savedTranslation));
    }

    public void deleteTranslation(Long revealId, String languageCode) {
        Reveal reveal = getRevealOrThrow(revealId);
        Language language = getLanguageByCodeOrThrow(languageCode);

        if (Boolean.TRUE.equals(language.getIsDefault())) {
            throw new IllegalArgumentException("Default language content cannot be deleted from translations.");
        }

        revealTranslationRepository.deleteByRevealIdAndLanguageId(reveal.getId(), language.getId());
    }

    private ResolvedRevealTranslation resolveTranslation(Reveal reveal, Language language) {
        Optional<RevealTranslation> storedTranslation = Boolean.TRUE.equals(language.getIsDefault())
                ? Optional.empty()
                : revealTranslationRepository.findByRevealIdAndLanguageId(reveal.getId(), language.getId());
        return resolveTranslation(reveal, language, storedTranslation);
    }

    private ResolvedRevealTranslation resolveTranslation(
            Reveal reveal,
            Language language,
            Optional<RevealTranslation> storedTranslation
    ) {
        RevealTranslation translation = storedTranslation.orElse(null);

        String displayedDate = translation != null && translation.getDisplayedDate() != null
                ? translation.getDisplayedDate()
                : reveal.getDisplayedDate();
        String displayedTitle = translation != null && translation.getDisplayedTitle() != null
                ? translation.getDisplayedTitle()
                : reveal.getDisplayedTitle();
        String displayedDescription = translation != null && translation.getDisplayedDescription() != null
                ? translation.getDisplayedDescription()
                : reveal.getDisplayedDescription();

        boolean fallbackToDefault = translation == null
                || translation.getDisplayedDate() == null
                || translation.getDisplayedTitle() == null
                || translation.getDisplayedDescription() == null;

        return new ResolvedRevealTranslation(
                reveal.getId(),
                language.getId(),
                language.getCode(),
                language.getName(),
                Boolean.TRUE.equals(language.getIsDefault()),
                translation != null,
                fallbackToDefault,
                translation != null ? translation.getId() : null,
                translation != null ? translation.getDisplayedDate() : null,
                translation != null ? translation.getDisplayedTitle() : null,
                translation != null ? translation.getDisplayedDescription() : null,
                displayedDate,
                displayedTitle,
                displayedDescription,
                translation != null ? translation.getSource() : null
        );
    }

    private Reveal getRevealOrThrow(Long revealId) {
        return revealRepository.findById(revealId)
                .orElseThrow(() -> new NoSuchElementException("Reveal not found: " + revealId));
    }

    private Language getLanguageByCodeOrThrow(String languageCode) {
        return languageRepository.findByCode(languageCode)
                .orElseThrow(() -> new NoSuchElementException("Language not found: " + languageCode));
    }

    public record TranslationUpsertRequest(
            String displayedDate,
            String displayedTitle,
            String displayedDescription,
            String source
    ) {}

    public record ResolvedRevealTranslation(
            Long revealId,
            Long languageId,
            String languageCode,
            String languageName,
            boolean defaultLanguage,
            boolean hasStoredTranslation,
            boolean fallbackToDefault,
            Long translationId,
            String storedDisplayedDate,
            String storedDisplayedTitle,
            String storedDisplayedDescription,
            String displayedDate,
            String displayedTitle,
            String displayedDescription,
            String source
    ) {}
}
