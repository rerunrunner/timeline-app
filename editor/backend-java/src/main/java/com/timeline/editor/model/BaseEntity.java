package com.timeline.editor.model;

import jakarta.persistence.*;
import com.timeline.editor.service.DatasetMetadataService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@MappedSuperclass
public abstract class BaseEntity {
    
    private static final Logger log = LoggerFactory.getLogger(BaseEntity.class);
    
    @Transient
    private static DatasetMetadataService metadataService;
    
    @PrePersist
    @PreUpdate
    @PreRemove
    public void updateMetadataVersion() {
        if (metadataService != null) {
            // First update version in a new transaction
            String version = metadataService.updateVersionAndGetVersion();
            
            // Then schedule dump for the current (original) transaction
            if (version != null) {
                metadataService.scheduleDump(version);
            }
        } else {
            log.warn("metadataService is null!");
        }
    }
    
    // Static method to set the service (called during application startup)
    public static void setMetadataService(DatasetMetadataService service) {
        metadataService = service;
    }
}
