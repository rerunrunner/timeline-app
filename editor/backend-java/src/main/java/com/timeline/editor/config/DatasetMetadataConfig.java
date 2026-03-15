package com.timeline.editor.config;

import com.timeline.editor.model.BaseEntity;
import com.timeline.editor.service.DatasetMetadataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;

@Configuration
public class DatasetMetadataConfig {
    
    @Autowired
    private DatasetMetadataService datasetMetadataService;
    
    @PostConstruct
    public void init() {
        BaseEntity.setMetadataService(datasetMetadataService);
    }
}
