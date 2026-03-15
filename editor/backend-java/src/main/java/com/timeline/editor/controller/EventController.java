package com.timeline.editor.controller;

import com.timeline.editor.model.Event;
import com.timeline.editor.model.EventTag;
import com.timeline.editor.repository.EventRepository;
import com.timeline.editor.repository.EventTagRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/tables/event")
public class EventController {

    @Autowired
    private EventRepository eventRepository;
    
    @Autowired
    private EventTagRepository eventTagRepository;

    @GetMapping
    public List<Event> getAllEvents(@RequestParam(value = "search", required = false) String search, 
                                   @RequestParam(value = "limit", required = false) Integer limit) {
        List<Event> events;
        if (search != null && !search.trim().isEmpty()) {
            events = eventRepository.findBySearchTerm(search.trim());
        } else {
            events = eventRepository.findAll();
        }
        
        if (limit != null && limit > 0) {
            return events.stream().limit(limit).toList();
        }
        
        return events;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Event> getEvent(@PathVariable("id") Long id) {
        Optional<Event> event = eventRepository.findById(id);
        return event.map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Event> createEvent(@Valid @RequestBody Event event) {
        Event savedEvent = eventRepository.save(event);
        return ResponseEntity.ok(savedEvent);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Event> updateEvent(@PathVariable("id") Long id, @Valid @RequestBody Event eventDetails) {
        Optional<Event> optionalEvent = eventRepository.findById(id);
        if (!optionalEvent.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        
        Event existingEvent = optionalEvent.get();
        
        // Update all fields (including setting to null)
        existingEvent.setTimelineId(eventDetails.getTimelineId());
        existingEvent.setShortDescription(eventDetails.getShortDescription());
        existingEvent.setNarrativeDate(eventDetails.getNarrativeDate());
        existingEvent.setNotes(eventDetails.getNotes());
        existingEvent.setEventTypeId(eventDetails.getEventTypeId());
        existingEvent.setLinkedEventId(eventDetails.getLinkedEventId());
        existingEvent.setOstTrackId(eventDetails.getOstTrackId());
        
        Event updatedEvent = eventRepository.save(existingEvent);
        return ResponseEntity.ok(updatedEvent);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable("id") Long id) {
        if (!eventRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        eventRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/references")
    public List<Event> getEventReferences() {
        return eventRepository.findAll();
    }

    @GetMapping("/search")
    public List<Event> searchEvents(@RequestParam String search) {
        return eventRepository.findBySearchTerm(search);
    }

    @GetMapping("/{id}/tags")
    public ResponseEntity<List<EventTag>> getEventTags(@PathVariable("id") Long id) {
        Optional<Event> event = eventRepository.findById(id);
        if (!event.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(event.get().getTags().stream().toList());
    }

    @PostMapping("/{id}/tags/{tagId}")
    public ResponseEntity<Void> addTagToEvent(@PathVariable("id") Long eventId, @PathVariable("tagId") Long tagId) {
        Optional<Event> eventOpt = eventRepository.findById(eventId);
        if (!eventOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        
        Optional<EventTag> tagOpt = eventTagRepository.findById(tagId);
        if (!tagOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        
        Event event = eventOpt.get();
        EventTag tag = tagOpt.get();
        
        event.getTags().add(tag);
        // Force update by modifying a field to trigger lifecycle callbacks
        event.setNotes(event.getNotes()); // This will trigger @PreUpdate
        eventRepository.save(event);
        
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/tags/{tagId}")
    public ResponseEntity<Void> removeTagFromEvent(@PathVariable("id") Long eventId, @PathVariable("tagId") Long tagId) {
        Optional<Event> eventOpt = eventRepository.findById(eventId);
        if (!eventOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        
        Event event = eventOpt.get();
        event.getTags().removeIf(tag -> tag.getId().equals(tagId));
        // Force update by modifying a field to trigger lifecycle callbacks
        event.setNotes(event.getNotes()); // This will trigger @PreUpdate
        eventRepository.save(event);
        
        return ResponseEntity.ok().build();
    }
}
