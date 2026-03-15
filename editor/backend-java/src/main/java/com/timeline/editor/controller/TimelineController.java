package com.timeline.editor.controller;

import com.timeline.editor.model.Timeline;
import com.timeline.editor.repository.TimelineRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/tables/timeline")
public class TimelineController {

    @Autowired
    private TimelineRepository timelineRepository;

    @GetMapping
    public List<Timeline> getAllTimelines(@RequestParam(value = "search", required = false) String search) {
        if (search != null && !search.trim().isEmpty()) {
            return timelineRepository.findBySearchTerm(search.trim());
        }
        return timelineRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Timeline> getTimeline(@PathVariable("id") Long id) {
        Optional<Timeline> timeline = timelineRepository.findById(id);
        return timeline.map(ResponseEntity::ok)
                     .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Timeline> createTimeline(@Valid @RequestBody Timeline timeline) {
        try {
            Timeline savedTimeline = timelineRepository.save(timeline);
            return ResponseEntity.ok(savedTimeline);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Timeline> updateTimeline(@PathVariable("id") Long id, @Valid @RequestBody Timeline timeline) {
        if (!timelineRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        timeline.setId(id);
        Timeline updatedTimeline = timelineRepository.save(timeline);
        return ResponseEntity.ok(updatedTimeline);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTimeline(@PathVariable("id") Long id) {
        if (!timelineRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        timelineRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/references")
    public List<Timeline> getTimelineReferences() {
        return timelineRepository.findAll();
    }
}
