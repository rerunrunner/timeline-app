package com.timeline.editor.model;

import jakarta.persistence.*;

@Entity
@Table(name = "app_settings")
public class AppSettings {
    
    @Id
    @Column(name = "id")
    private String id;
    
    @Column(name = "export_path")
    private String exportPath;
    
    @Column(name = "logging_level")
    private String loggingLevel;

    @Column(name = "translation_provider")
    private String translationProvider;

    @Column(name = "translation_base_url")
    private String translationBaseUrl;

    @Column(name = "translation_model")
    private String translationModel;

    @Column(name = "translation_api_key")
    private String translationApiKey;

    @Column(name = "auto_translate_on_save")
    private Boolean autoTranslateOnSave;

    @Column(name = "translation_timeout_ms")
    private Integer translationTimeoutMs;
    
    // Constructors
    public AppSettings() {}
    
    public AppSettings(String id, String exportPath, String loggingLevel) {
        this.id = id;
        this.exportPath = exportPath;
        this.loggingLevel = loggingLevel;
    }
    
    // Getters and Setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getExportPath() {
        return exportPath;
    }
    
    public void setExportPath(String exportPath) {
        this.exportPath = exportPath;
    }
    
    public String getLoggingLevel() {
        return loggingLevel;
    }
    
    public void setLoggingLevel(String loggingLevel) {
        this.loggingLevel = loggingLevel;
    }

    public String getTranslationProvider() {
        return translationProvider;
    }

    public void setTranslationProvider(String translationProvider) {
        this.translationProvider = translationProvider;
    }

    public String getTranslationBaseUrl() {
        return translationBaseUrl;
    }

    public void setTranslationBaseUrl(String translationBaseUrl) {
        this.translationBaseUrl = translationBaseUrl;
    }

    public String getTranslationModel() {
        return translationModel;
    }

    public void setTranslationModel(String translationModel) {
        this.translationModel = translationModel;
    }

    public String getTranslationApiKey() {
        return translationApiKey;
    }

    public void setTranslationApiKey(String translationApiKey) {
        this.translationApiKey = translationApiKey;
    }

    public Boolean getAutoTranslateOnSave() {
        return autoTranslateOnSave;
    }

    public void setAutoTranslateOnSave(Boolean autoTranslateOnSave) {
        this.autoTranslateOnSave = autoTranslateOnSave;
    }

    public Integer getTranslationTimeoutMs() {
        return translationTimeoutMs;
    }

    public void setTranslationTimeoutMs(Integer translationTimeoutMs) {
        this.translationTimeoutMs = translationTimeoutMs;
    }
    
    @Override
    public String toString() {
        return "AppSettings{" +
                "id='" + id + '\'' +
                ", exportPath='" + exportPath + '\'' +
                ", loggingLevel='" + loggingLevel + '\'' +
                ", translationProvider='" + translationProvider + '\'' +
                ", translationBaseUrl='" + translationBaseUrl + '\'' +
                ", translationModel='" + translationModel + '\'' +
                ", autoTranslateOnSave=" + autoTranslateOnSave +
                ", translationTimeoutMs=" + translationTimeoutMs +
                '}';
    }
}

