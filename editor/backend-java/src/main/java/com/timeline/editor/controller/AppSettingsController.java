package com.timeline.editor.controller;

import com.timeline.editor.model.AppSettings;
import com.timeline.editor.service.AppSettingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class AppSettingsController {
    
    @Autowired
    private AppSettingsService appSettingsService;
    
    @GetMapping
    public ResponseEntity<AppSettings> getSettings() {
        try {
            AppSettings settings = appSettingsService.getSettings();
            return ResponseEntity.ok(settings);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PutMapping
    public ResponseEntity<AppSettings> updateSettings(@RequestBody AppSettings settings) {
        try {
            AppSettings updated = appSettingsService.updateSettings(settings);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}

