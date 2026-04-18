package com.timeline.editor.service;

import com.timeline.editor.model.Language;
import com.timeline.editor.repository.LanguageRepository;
import com.timeline.editor.repository.RevealTranslationRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;

@Service
public class LanguageService {

    private final LanguageRepository languageRepository;
    private final RevealTranslationRepository revealTranslationRepository;

    public LanguageService(
            LanguageRepository languageRepository,
            RevealTranslationRepository revealTranslationRepository
    ) {
        this.languageRepository = languageRepository;
        this.revealTranslationRepository = revealTranslationRepository;
    }

    public List<Language> getLanguages(boolean enabledOnly) {
        return enabledOnly
                ? languageRepository.findByIsEnabledTrueOrderByIsDefaultDescNameAsc()
                : languageRepository.findAllByOrderByIsDefaultDescNameAsc();
    }

    public Language createLanguage(LanguageUpsertRequest request) {
        String code = normalizeCode(request.code());
        String name = normalizeName(request.name());

        if (languageRepository.findByCode(code).isPresent()) {
            throw new IllegalArgumentException("Language code already exists: " + code);
        }

        Language language = new Language();
        language.setCode(code);
        language.setName(name);
        language.setIsDefault(false);
        language.setIsEnabled(request.isEnabled() == null || request.isEnabled());
        return languageRepository.save(language);
    }

    public Language updateLanguage(Long languageId, LanguageUpsertRequest request) {
        Language language = languageRepository.findById(languageId)
                .orElseThrow(() -> new NoSuchElementException("Language not found: " + languageId));

        String code = normalizeCode(request.code());
        String name = normalizeName(request.name());

        languageRepository.findByCode(code)
                .filter(existing -> !existing.getId().equals(languageId))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Language code already exists: " + code);
                });

        language.setCode(code);
        language.setName(name);
        if (Boolean.TRUE.equals(language.getIsDefault())) {
            language.setIsEnabled(true);
        } else {
            language.setIsEnabled(request.isEnabled() == null || request.isEnabled());
        }

        return languageRepository.save(language);
    }

    public void deleteLanguage(Long languageId) {
        Language language = languageRepository.findById(languageId)
                .orElseThrow(() -> new NoSuchElementException("Language not found: " + languageId));

        if (Boolean.TRUE.equals(language.getIsDefault())) {
            throw new IllegalArgumentException("Default language cannot be deleted.");
        }

        revealTranslationRepository.deleteByLanguageId(languageId);
        languageRepository.delete(language);
    }

    private String normalizeCode(String code) {
        String normalized = code == null ? "" : code.trim().toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("Language code is required.");
        }
        if (normalized.length() > 10) {
            throw new IllegalArgumentException("Language code must be 10 characters or fewer.");
        }
        return normalized;
    }

    private String normalizeName(String name) {
        String normalized = name == null ? "" : name.trim();
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("Language name is required.");
        }
        if (normalized.length() > 100) {
            throw new IllegalArgumentException("Language name must be 100 characters or fewer.");
        }
        return normalized;
    }

    public record LanguageUpsertRequest(
            String code,
            String name,
            Boolean isEnabled
    ) {}
}
