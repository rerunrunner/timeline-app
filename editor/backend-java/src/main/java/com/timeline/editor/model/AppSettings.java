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
    
    @Override
    public String toString() {
        return "AppSettings{" +
                "id='" + id + '\'' +
                ", exportPath='" + exportPath + '\'' +
                ", loggingLevel='" + loggingLevel + '\'' +
                '}';
    }
}

