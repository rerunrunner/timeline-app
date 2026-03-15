package com.timeline.editor.controller;

import com.timeline.editor.model.Reveal;
import com.timeline.editor.repository.RevealRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.core.io.Resource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/tables/reveal")
public class RevealController {
    
    private static final Logger logger = LoggerFactory.getLogger(RevealController.class);

    @Value("${timeline.data.path:./data}")
    private String dataPath;
    
    @Autowired
    private RevealRepository revealRepository;

    private Path getImagesDir() {
        return Paths.get(dataPath, "images");
    }
    
    @GetMapping
    public List<Reveal> getAllReveals(@RequestParam(value = "search", required = false) String search) {
        if (search != null && !search.trim().isEmpty()) {
            return revealRepository.findBySearchTerm(search);
        }
        return revealRepository.findAll();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Reveal> getRevealById(@PathVariable("id") Long id) {
        Optional<Reveal> reveal = revealRepository.findById(id);
        return reveal.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public Reveal createReveal(@RequestBody Reveal reveal) {
        logger.debug("Creating reveal: {}", reveal);
        Reveal savedReveal = revealRepository.save(reveal);
        logger.debug("Saved reveal: {}", savedReveal);
        return savedReveal;
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Reveal> updateReveal(@PathVariable("id") Long id, @RequestBody Reveal revealDetails) {
        Optional<Reveal> optionalReveal = revealRepository.findById(id);
        if (optionalReveal.isPresent()) {
            Reveal reveal = optionalReveal.get();
            reveal.setEventId(revealDetails.getEventId());
            reveal.setApparentTimelineId(revealDetails.getApparentTimelineId());
            reveal.setEpisodeId(revealDetails.getEpisodeId());
            reveal.setEpisodeTime(revealDetails.getEpisodeTime());
            reveal.setDisplayedDate(revealDetails.getDisplayedDate());
            reveal.setDisplayedTitle(revealDetails.getDisplayedTitle());
            reveal.setDisplayedDescription(revealDetails.getDisplayedDescription());
            reveal.setScreenshotFilename(revealDetails.getScreenshotFilename());
            
            Reveal updatedReveal = revealRepository.save(reveal);
            return ResponseEntity.ok(updatedReveal);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReveal(@PathVariable("id") Long id) {
        if (revealRepository.existsById(id)) {
            revealRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PostMapping("/{id}/image")
    public ResponseEntity<String> uploadImage(@PathVariable("id") Long id, @RequestParam("file") MultipartFile file) {
        try {
            // Validate file
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("File is empty");
            }
            
            // Check file size (1MB limit)
            if (file.getSize() > 1024 * 1024) {
                return ResponseEntity.badRequest().body("File size exceeds 1MB limit");
            }
            
            // Check file type
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest().body("File must be an image");
            }
            
            // Get reveal
            Optional<Reveal> optionalReveal = revealRepository.findById(id);
            if (!optionalReveal.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            // Create images directory if it doesn't exist
            Path imagesDir = getImagesDir();
            Files.createDirectories(imagesDir);
            
            // Generate filename: reveal-{id}.{extension}
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            } else {
                // Default to .jpg if no extension
                extension = ".jpg";
            }
            
            String filename = "reveal-" + id + extension;
            Path filePath = imagesDir.resolve(filename);
            
            // Delete existing file if it exists
            if (Files.exists(filePath)) {
                Files.delete(filePath);
            }
            
            // Save new file
            Files.copy(file.getInputStream(), filePath);
            
            // Update reveal with new filename
            Reveal reveal = optionalReveal.get();
            reveal.setScreenshotFilename(filename);
            revealRepository.save(reveal);
            
            return ResponseEntity.ok(filename);
            
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Failed to upload image: " + e.getMessage());
        }
    }
    
    @DeleteMapping("/{id}/image")
    public ResponseEntity<Void> deleteImage(@PathVariable("id") Long id) {
        try {
            Optional<Reveal> optionalReveal = revealRepository.findById(id);
            if (!optionalReveal.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            Reveal reveal = optionalReveal.get();
            String filename = reveal.getScreenshotFilename();
            
            if (filename != null && !filename.trim().isEmpty()) {
                // Delete file from filesystem
                Path imagesDir = getImagesDir();
                Path filePath = imagesDir.resolve(filename);
                if (Files.exists(filePath)) {
                    Files.delete(filePath);
                }
                
                // Clear filename in database
                reveal.setScreenshotFilename(null);
                revealRepository.save(reveal);
            }
            
            return ResponseEntity.noContent().build();
            
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/{id}/image/{filename}")
    public ResponseEntity<Resource> getImage(@PathVariable("id") Long id, @PathVariable("filename") String filename) {
        try {
            Path imagesDir = getImagesDir();
            Path filePath = imagesDir.resolve(filename);
            
            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }
            
            Resource resource = new FileSystemResource(filePath);
            
            // Determine content type based on file extension
            String contentType = "image/jpeg"; // default
            if (filename.toLowerCase().endsWith(".png")) {
                contentType = "image/png";
            } else if (filename.toLowerCase().endsWith(".gif")) {
                contentType = "image/gif";
            } else if (filename.toLowerCase().endsWith(".webp")) {
                contentType = "image/webp";
            }
            
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .body(resource);
                    
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
