package com.timeline.editor.service;

import com.timeline.editor.model.Reveal;
import com.timeline.editor.repository.RevealRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class ImageExportService {

    @Value("${timeline.data.path:./data}")
    private String dataPath;

    @Autowired
    private RevealRepository revealRepository;

    public byte[] createZipWithImages(byte[] jsonData, String jsonFilename) throws IOException {
        // Get all unique screenshot filenames from reveals
        List<Reveal> reveals = revealRepository.findAll();
        Set<String> imageFilenames = reveals.stream()
            .map(Reveal::getScreenshotFilename)
            .filter(filename -> filename != null && !filename.trim().isEmpty())
            .collect(Collectors.toSet());

        // Create ZIP file in memory
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            // Add JSON file to ZIP
            ZipEntry jsonEntry = new ZipEntry(jsonFilename);
            zos.putNextEntry(jsonEntry);
            zos.write(jsonData);
            zos.closeEntry();

            // Add images to ZIP
            Path imagesDir = Paths.get(dataPath, "images");
            if (Files.exists(imagesDir)) {
                for (String filename : imageFilenames) {
                    Path imagePath = imagesDir.resolve(filename);
                    if (Files.exists(imagePath)) {
                        // Add image to images/ folder in ZIP
                        ZipEntry imageEntry = new ZipEntry("images/" + filename);
                        zos.putNextEntry(imageEntry);
                        
                        try (InputStream imageStream = Files.newInputStream(imagePath)) {
                            byte[] buffer = new byte[1024];
                            int length;
                            while ((length = imageStream.read(buffer)) > 0) {
                                zos.write(buffer, 0, length);
                            }
                        }
                        zos.closeEntry();
                    } else {
                        System.err.println("Warning: Image file not found: " + filename);
                    }
                }
            } else {
                System.err.println("Warning: Images directory not found: " + imagesDir);
            }
        }

        return baos.toByteArray();
    }

    public int getReferencedImageCount() {
        List<Reveal> reveals = revealRepository.findAll();
        return (int) reveals.stream()
            .map(Reveal::getScreenshotFilename)
            .filter(filename -> filename != null && !filename.trim().isEmpty())
            .count();
    }
}
