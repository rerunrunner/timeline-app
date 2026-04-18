package com.timeline.editor.service;

import com.timeline.editor.model.AppSettings;
import com.timeline.editor.repository.AppSettingsRepository;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.core.LoggerContext;
import org.apache.logging.log4j.core.config.Configuration;
import org.apache.logging.log4j.core.config.LoggerConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;

@Service
public class AppSettingsService {
    
    private static final Logger log = LoggerFactory.getLogger(AppSettingsService.class);
    
    @Autowired
    private AppSettingsRepository appSettingsRepository;

    @Value("${timeline.data.path:./data}")
    private String dataPath;
    
    public AppSettings getSettings() {
        AppSettings settings = appSettingsRepository.findFirstByIdIsNotNull();
        if (settings == null) {
            // Create default settings if none exist
            settings = new AppSettings();
            settings.setId("default");
            applyDefaults(settings);
            appSettingsRepository.save(settings);
        }
        applyDefaults(settings);
        return settings;
    }
    
    @Transactional
    public AppSettings updateSettings(AppSettings settings) {
        AppSettings existing = appSettingsRepository.findFirstByIdIsNotNull();
        
        if (existing != null) {
            existing.setExportPath(settings.getExportPath());
            existing.setLoggingLevel(settings.getLoggingLevel());
            existing.setTranslationProvider(settings.getTranslationProvider());
            existing.setTranslationBaseUrl(settings.getTranslationBaseUrl());
            existing.setTranslationModel(settings.getTranslationModel());
            existing.setTranslationApiKey(settings.getTranslationApiKey());
            existing.setAutoTranslateOnSave(settings.getAutoTranslateOnSave());
            existing.setTranslationTimeoutMs(settings.getTranslationTimeoutMs());
            applyDefaults(existing);
            AppSettings saved = appSettingsRepository.save(existing);
            
            // Apply logging level change dynamically
            applyLoggingLevel(settings.getLoggingLevel());
            
            return saved;
        } else {
            // Create new settings
            AppSettings newSettings = new AppSettings();
            newSettings.setId("default");
            newSettings.setExportPath(settings.getExportPath());
            newSettings.setLoggingLevel(settings.getLoggingLevel());
            newSettings.setTranslationProvider(settings.getTranslationProvider());
            newSettings.setTranslationBaseUrl(settings.getTranslationBaseUrl());
            newSettings.setTranslationModel(settings.getTranslationModel());
            newSettings.setTranslationApiKey(settings.getTranslationApiKey());
            newSettings.setAutoTranslateOnSave(settings.getAutoTranslateOnSave());
            newSettings.setTranslationTimeoutMs(settings.getTranslationTimeoutMs());
            applyDefaults(newSettings);
            AppSettings saved = appSettingsRepository.save(newSettings);
            
            // Apply logging level change dynamically
            applyLoggingLevel(settings.getLoggingLevel());
            
            return saved;
        }
    }
    
    private void applyLoggingLevel(String levelStr) {
        try {
            Level level = Level.valueOf(levelStr);
            
            LoggerContext ctx = (LoggerContext) LogManager.getContext(false);
            Configuration config = ctx.getConfiguration();
            LoggerConfig loggerConfig = config.getLoggerConfig("com.timeline.editor");
            
            loggerConfig.setLevel(level);
            ctx.updateLoggers();
            
            log.info("Logging level changed to: {}", levelStr);
        } catch (Exception e) {
            log.error("Failed to change logging level", e);
        }
    }

    private void applyDefaults(AppSettings settings) {
        if (settings.getExportPath() == null || settings.getExportPath().isBlank()) {
            settings.setExportPath(Path.of(dataPath, "export").toString());
        }
        if (settings.getLoggingLevel() == null || settings.getLoggingLevel().isBlank()) {
            settings.setLoggingLevel("INFO");
        }
        if (settings.getTranslationProvider() == null || settings.getTranslationProvider().isBlank()) {
            settings.setTranslationProvider("lmstudio");
        }
        if (settings.getAutoTranslateOnSave() == null) {
            settings.setAutoTranslateOnSave(false);
        }
        if (settings.getTranslationTimeoutMs() == null || settings.getTranslationTimeoutMs() <= 0) {
            settings.setTranslationTimeoutMs(300000);
        }
    }
}

