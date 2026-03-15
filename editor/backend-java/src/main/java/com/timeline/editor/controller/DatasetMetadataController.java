package com.timeline.editor.controller;

import com.timeline.editor.model.DatasetMetadata;
import com.timeline.editor.service.DatasetMetadataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/metadata")
public class DatasetMetadataController {
    
    @Autowired
    private DatasetMetadataService datasetMetadataService;
    
    @GetMapping
    public ResponseEntity<DatasetMetadata> getMetadata() {
        try {
            DatasetMetadata metadata = datasetMetadataService.getMetadata();
            if (metadata != null) {
                return ResponseEntity.ok(metadata);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PutMapping
    public ResponseEntity<DatasetMetadata> updateMetadata(@RequestBody DatasetMetadata metadata) {
        try {
            DatasetMetadata updated = datasetMetadataService.updateMetadata(metadata);
            if (updated != null) {
                return ResponseEntity.ok(updated);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
