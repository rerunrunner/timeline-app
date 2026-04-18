package com.timeline.editor.controller;

import com.timeline.editor.service.RevealTranslationService;
import com.timeline.editor.service.TranslationManagerService;
import com.timeline.editor.service.translation.TranslationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/reveals/{revealId}/translations")
public class RevealTranslationController {

    private static final Logger log = LoggerFactory.getLogger(RevealTranslationController.class);

    private final RevealTranslationService revealTranslationService;
    private final TranslationManagerService translationManagerService;

    public RevealTranslationController(
            RevealTranslationService revealTranslationService,
            TranslationManagerService translationManagerService
    ) {
        this.revealTranslationService = revealTranslationService;
        this.translationManagerService = translationManagerService;
    }

    @GetMapping
    public ResponseEntity<List<RevealTranslationService.ResolvedRevealTranslation>> getTranslations(
            @PathVariable("revealId") Long revealId
    ) {
        try {
            return ResponseEntity.ok(revealTranslationService.getResolvedTranslations(revealId));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{languageCode}")
    public ResponseEntity<RevealTranslationService.ResolvedRevealTranslation> getTranslation(
            @PathVariable("revealId") Long revealId,
            @PathVariable("languageCode") String languageCode
    ) {
        try {
            return ResponseEntity.ok(revealTranslationService.getResolvedTranslation(revealId, languageCode));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{languageCode}")
    public ResponseEntity<RevealTranslationService.ResolvedRevealTranslation> upsertTranslation(
            @PathVariable("revealId") Long revealId,
            @PathVariable("languageCode") String languageCode,
            @RequestBody RevealTranslationService.TranslationUpsertRequest request
    ) {
        try {
            return ResponseEntity.ok(revealTranslationService.upsertTranslation(revealId, languageCode, request));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/generate")
    public ResponseEntity<List<RevealTranslationService.ResolvedRevealTranslation>> generateTranslations(
            @PathVariable("revealId") Long revealId
    ) {
        log.info("Received manual translation request for reveal {}", revealId);
        try {
            List<RevealTranslationService.ResolvedRevealTranslation> translations =
                    translationManagerService.translateRevealToEnabledLanguages(revealId);
            log.info("Completed manual translation request for reveal {} with {} translations", revealId, translations.size());
            return ResponseEntity.ok(translations);
        } catch (NoSuchElementException e) {
            log.warn("Manual translation request for reveal {} failed: reveal not found", revealId);
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException | TranslationException e) {
            log.warn("Manual translation request for reveal {} failed: {}", revealId, e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/generate/{languageCode}")
    public ResponseEntity<RevealTranslationService.ResolvedRevealTranslation> generateTranslation(
            @PathVariable("revealId") Long revealId,
            @PathVariable("languageCode") String languageCode
    ) {
        log.info("Received manual translation request for reveal {} into {}", revealId, languageCode);
        try {
            RevealTranslationService.ResolvedRevealTranslation translation =
                    translationManagerService.translateReveal(revealId, languageCode);
            log.info("Completed manual translation request for reveal {} into {}", revealId, languageCode);
            return ResponseEntity.ok(translation);
        } catch (NoSuchElementException e) {
            log.warn("Manual translation request for reveal {} into {} failed: not found", revealId, languageCode);
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException | TranslationException e) {
            log.warn("Manual translation request for reveal {} into {} failed: {}", revealId, languageCode, e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{languageCode}")
    public ResponseEntity<Void> deleteTranslation(
            @PathVariable("revealId") Long revealId,
            @PathVariable("languageCode") String languageCode
    ) {
        try {
            revealTranslationService.deleteTranslation(revealId, languageCode);
            return ResponseEntity.noContent().build();
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
