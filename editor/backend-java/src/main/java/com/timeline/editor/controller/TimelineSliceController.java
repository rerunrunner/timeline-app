package com.timeline.editor.controller;

import com.timeline.editor.model.TimelineSlice;
import com.timeline.editor.repository.TimelineSliceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/tables/timeline_slice")
public class TimelineSliceController {
    
    @Autowired
    private TimelineSliceRepository timelineSliceRepository;
    
    @GetMapping
    public List<TimelineSlice> getAllTimelineSlices(@RequestParam(value = "search", required = false) String search) {
        if (search != null && !search.trim().isEmpty()) {
            return timelineSliceRepository.findBySearchTerm(search);
        }
        return timelineSliceRepository.findAll();
    }
    
    @GetMapping("/timeline/{timelineId}")
    public List<TimelineSlice> getTimelineSlicesByTimelineId(@PathVariable("timelineId") Long timelineId) {
        return timelineSliceRepository.findByTimelineId(timelineId);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<TimelineSlice> getTimelineSliceById(@PathVariable("id") Long id) {
        Optional<TimelineSlice> timelineSlice = timelineSliceRepository.findById(id);
        return timelineSlice.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public TimelineSlice createTimelineSlice(@RequestBody TimelineSlice timelineSlice) {
        return timelineSliceRepository.save(timelineSlice);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<TimelineSlice> updateTimelineSlice(@PathVariable("id") Long id, @RequestBody TimelineSlice timelineSliceDetails) {
        Optional<TimelineSlice> optionalTimelineSlice = timelineSliceRepository.findById(id);
        if (optionalTimelineSlice.isPresent()) {
            TimelineSlice timelineSlice = optionalTimelineSlice.get();
            timelineSlice.setTimelineId(timelineSliceDetails.getTimelineId());
            timelineSlice.setShortDescription(timelineSliceDetails.getShortDescription());
            timelineSlice.setStartTimestamp(timelineSliceDetails.getStartTimestamp());
            timelineSlice.setEndTimestamp(timelineSliceDetails.getEndTimestamp());
            timelineSlice.setImportance(timelineSliceDetails.getImportance());
            timelineSlice.setNotes(timelineSliceDetails.getNotes());
            
            TimelineSlice updatedTimelineSlice = timelineSliceRepository.save(timelineSlice);
            return ResponseEntity.ok(updatedTimelineSlice);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTimelineSlice(@PathVariable("id") Long id) {
        if (timelineSliceRepository.existsById(id)) {
            timelineSliceRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
