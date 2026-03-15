package com.timeline.editor.controller;

import com.timeline.editor.model.EventTag;
import com.timeline.editor.repository.EventTagRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/tables/tag")
public class EventTagController {

    @Autowired
    private EventTagRepository eventTagRepository;

    @GetMapping
    public List<EventTag> getAllEventTags(@RequestParam(value = "search", required = false) String search) {
        if (search != null && !search.trim().isEmpty()) {
            return eventTagRepository.findBySearchTerm(search.trim());
        }
        return eventTagRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventTag> getEventTag(@PathVariable("id") Long id) {
        Optional<EventTag> eventTag = eventTagRepository.findById(id);
        return eventTag.map(ResponseEntity::ok)
                       .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<EventTag> createEventTag(@Valid @RequestBody EventTag eventTag) {
        EventTag savedEventTag = eventTagRepository.save(eventTag);
        return ResponseEntity.ok(savedEventTag);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EventTag> updateEventTag(@PathVariable("id") Long id, @Valid @RequestBody EventTag eventTag) {
        if (!eventTagRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        eventTag.setId(id);
        EventTag updatedEventTag = eventTagRepository.save(eventTag);
        return ResponseEntity.ok(updatedEventTag);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEventTag(@PathVariable("id") Long id) {
        if (!eventTagRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        eventTagRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/references")
    public List<EventTag> getEventTagReferences() {
        return eventTagRepository.findAll();
    }
}
