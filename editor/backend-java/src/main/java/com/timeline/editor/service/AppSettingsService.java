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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AppSettingsService {
    
    private static final Logger log = LoggerFactory.getLogger(AppSettingsService.class);
    
    @Autowired
    private AppSettingsRepository appSettingsRepository;
    
    public AppSettings getSettings() {
        AppSettings settings = appSettingsRepository.findFirstByIdIsNotNull();
        if (settings == null) {
            // Create default settings if none exist
            settings = new AppSettings();
            settings.setId("default");
            settings.setExportPath("../../timeline-viewer/src/data");
            settings.setLoggingLevel("INFO");
            appSettingsRepository.save(settings);
        }
        return settings;
    }
    
    @Transactional
    public AppSettings updateSettings(AppSettings settings) {
        AppSettings existing = appSettingsRepository.findFirstByIdIsNotNull();
        
        if (existing != null) {
            existing.setExportPath(settings.getExportPath());
            existing.setLoggingLevel(settings.getLoggingLevel());
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
}

