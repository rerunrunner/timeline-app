package com.timeline.editor.controller;

import com.timeline.editor.model.EventType;
import com.timeline.editor.repository.EventTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/tables/event_type")
public class EventTypeController {

    @Autowired
    private EventTypeRepository eventTypeRepository;

    @GetMapping
    public List<EventType> getAllEventTypes() {
        return eventTypeRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventType> getEventType(@PathVariable("id") Long id) {
        Optional<EventType> eventType = eventTypeRepository.findById(id);
        return eventType.map(ResponseEntity::ok)
                        .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<EventType> createEventType(@Valid @RequestBody EventType eventType) {
        EventType savedEventType = eventTypeRepository.save(eventType);
        return ResponseEntity.ok(savedEventType);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EventType> updateEventType(@PathVariable("id") Long id, @Valid @RequestBody EventType eventType) {
        if (!eventTypeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        eventType.setId(id);
        EventType updatedEventType = eventTypeRepository.save(eventType);
        return ResponseEntity.ok(updatedEventType);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEventType(@PathVariable("id") Long id) {
        if (!eventTypeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        eventTypeRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/references")
    public List<EventType> getEventTypeReferences() {
        return eventTypeRepository.findAll();
    }
}
