package com.timeline.editor.controller;

import com.timeline.editor.model.Language;
import com.timeline.editor.service.LanguageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/languages")
public class LanguageController {

    private final LanguageService languageService;

    public LanguageController(LanguageService languageService) {
        this.languageService = languageService;
    }

    @GetMapping
    public ResponseEntity<List<Language>> getLanguages(
            @RequestParam(value = "enabledOnly", defaultValue = "true") boolean enabledOnly
    ) {
        return ResponseEntity.ok(languageService.getLanguages(enabledOnly));
    }

    @PostMapping
    public ResponseEntity<Language> createLanguage(
            @RequestBody LanguageService.LanguageUpsertRequest request
    ) {
        try {
            return ResponseEntity.ok(languageService.createLanguage(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{languageId}")
    public ResponseEntity<Language> updateLanguage(
            @PathVariable("languageId") Long languageId,
            @RequestBody LanguageService.LanguageUpsertRequest request
    ) {
        try {
            return ResponseEntity.ok(languageService.updateLanguage(languageId, request));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{languageId}")
    public ResponseEntity<Void> deleteLanguage(
            @PathVariable("languageId") Long languageId
    ) {
        try {
            languageService.deleteLanguage(languageId);
            return ResponseEntity.noContent().build();
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
