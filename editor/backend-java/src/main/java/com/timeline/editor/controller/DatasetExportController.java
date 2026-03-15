package com.timeline.editor.controller;

import com.timeline.editor.service.DatasetExportService;
import com.timeline.editor.service.DatasetMetadataService;
import com.timeline.editor.service.AppSettingsService;
import com.timeline.editor.service.ImageExportService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.io.IOException;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/export")
public class DatasetExportController {

    private static final Logger log = LoggerFactory.getLogger(DatasetExportController.class);

    @Autowired
    private DatasetExportService datasetExportService;
    
    @Autowired
    private DatasetMetadataService datasetMetadataService;
    
    @Autowired
    private AppSettingsService appSettingsService;
    
    @Autowired
    private ImageExportService imageExportService;
    
    @Autowired
    private ObjectMapper objectMapper;

    @GetMapping("/dataset")
    public ResponseEntity<byte[]> exportDataset(@RequestParam(value = "includeImages", defaultValue = "false") boolean includeImages) {
        try {
            // Get the export data
            Map<String, Object> exportData = datasetExportService.exportDataset();
            
            // Get metadata for filename
            var metadata = datasetMetadataService.getMetadata();
            String baseFilename = metadata.getId() + "." + metadata.getVersion();
            
            // Convert to JSON bytes
            byte[] jsonBytes = objectMapper.writeValueAsBytes(exportData);
            
            HttpHeaders headers = new HttpHeaders();
            byte[] responseData;
            String filename;
            
            if (includeImages) {
                // Create ZIP file with JSON + images
                responseData = imageExportService.createZipWithImages(jsonBytes, baseFilename + ".json");
                filename = baseFilename + ".zip";
                headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            } else {
                // Return JSON only
                responseData = jsonBytes;
                filename = baseFilename + ".json";
                headers.setContentType(MediaType.APPLICATION_JSON);
            }
            
            headers.setContentDispositionFormData("attachment", filename);
            headers.setContentLength(responseData.length);
            
            return ResponseEntity.ok()
                .headers(headers)
                .body(responseData);
                
        } catch (Exception e) {
            log.error("Export failed", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/dataset/to-filesystem")
    public ResponseEntity<Map<String, String>> exportDatasetToFilesystem(
            @RequestParam(value = "includeImages", defaultValue = "false") boolean includeImages) {
        try {
            // Get the export data
            Map<String, Object> exportData = datasetExportService.exportDataset();
            
            // Get metadata for filename
            var metadata = datasetMetadataService.getMetadata();
            String baseFilename = metadata.getId() + "." + metadata.getVersion();
            
            // Get destination from app settings
            var settings = appSettingsService.getSettings();
            String destination = settings.getExportPath();
            
            // Create destination directory if it doesn't exist
            Path destPath = Paths.get(destination);
            Files.createDirectories(destPath);

            log.debug("Destination: {}", destPath);
            
            // Clean up old narrative files
            try (Stream<Path> files = Files.list(destPath)) {
                files.filter(path -> {
                    String filename = path.getFileName().toString();
                    // Match files like "dataset-id.*.json" or "dataset-id.*.zip"
                    return filename.startsWith(metadata.getId() + ".") && Files.isRegularFile(path);
                }).forEach(path -> {
                    log.debug("Deleting old file: {}", path);
                    try {
                        Files.delete(path);
                        log.debug("Deleted old file: {}", path);
                    } catch (IOException e) {
                        log.error("Failed to delete old file: {}", path, e);
                    }
                });
            }
            
            // Convert to JSON bytes
            byte[] jsonBytes = objectMapper.writeValueAsBytes(exportData);
            
            String filename;
            Path filePath;
            
            if (includeImages) {
                // Create ZIP file with JSON + images
                byte[] zipBytes = imageExportService.createZipWithImages(jsonBytes, baseFilename + ".json");
                filename = baseFilename + ".zip";
                filePath = destPath.resolve(filename);
                Files.write(filePath, zipBytes);
            } else {
                // Save JSON only
                filename = baseFilename + ".json";
                filePath = destPath.resolve(filename);
                Files.write(filePath, jsonBytes);
            }
            
            return ResponseEntity.ok(Map.of(
                "success", "true",
                "message", "Dataset exported successfully",
                "filename", filename,
                "path", filePath.toString(),
                "size", String.valueOf(Files.size(filePath))
            ));
                
        } catch (Exception e) {
            log.error("Filesystem export failed", e);
            return ResponseEntity.internalServerError()
                .body(Map.of(
                    "success", "false",
                    "message", "Export failed: " + e.getMessage()
                ));
        }
    }
}
