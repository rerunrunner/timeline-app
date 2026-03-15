package com.timeline.editor.controller;

import com.timeline.editor.model.Episode;
import com.timeline.editor.repository.EpisodeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/tables/episode")
public class EpisodeController {

    @Autowired
    private EpisodeRepository episodeRepository;

    @GetMapping
    public List<Episode> getAllEpisodes(@RequestParam(value = "search", required = false) String search) {
        try {
            if (search != null && !search.trim().isEmpty()) {
                return episodeRepository.findBySearchTerm(search.trim());
            }
            return episodeRepository.findAll();
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Episode> getEpisode(@PathVariable("id") Long id) {
        Optional<Episode> episode = episodeRepository.findById(id);
        return episode.map(ResponseEntity::ok)
                     .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Episode> createEpisode(@Valid @RequestBody Episode episode) {
        try {
            Episode savedEpisode = episodeRepository.save(episode);
            return ResponseEntity.ok(savedEpisode);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Episode> updateEpisode(@PathVariable("id") Long id, @Valid @RequestBody Episode episode) {
        if (!episodeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        episode.setId(id);
        Episode updatedEpisode = episodeRepository.save(episode);
        return ResponseEntity.ok(updatedEpisode);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEpisode(@PathVariable("id") Long id) {
        if (!episodeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        episodeRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/references")
    public List<Episode> getEpisodeReferences() {
        return episodeRepository.findAll();
    }
}
