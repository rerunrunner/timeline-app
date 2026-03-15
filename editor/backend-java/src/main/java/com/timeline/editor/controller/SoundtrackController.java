package com.timeline.editor.controller;

import com.timeline.editor.model.Soundtrack;
import com.timeline.editor.repository.SoundtrackRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/tables/soundtrack")
public class SoundtrackController {

    @Autowired
    private SoundtrackRepository soundtrackRepository;

    @GetMapping
    public List<Soundtrack> getAllSoundtracks(@RequestParam(value = "search", required = false) String search) {
        if (search != null && !search.trim().isEmpty()) {
            return soundtrackRepository.findBySearchTerm(search.trim());
        }
        return soundtrackRepository.findAllByOrderByPositionAsc();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Soundtrack> getSoundtrack(@PathVariable("id") Long id) {
        Optional<Soundtrack> soundtrack = soundtrackRepository.findById(id);
        return soundtrack.map(ResponseEntity::ok)
                         .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Soundtrack> createSoundtrack(@Valid @RequestBody Soundtrack soundtrack) {
        Soundtrack savedSoundtrack = soundtrackRepository.save(soundtrack);
        return ResponseEntity.ok(savedSoundtrack);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Soundtrack> updateSoundtrack(@PathVariable("id") Long id, @Valid @RequestBody Soundtrack soundtrack) {
        if (!soundtrackRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        soundtrack.setId(id);
        Soundtrack updatedSoundtrack = soundtrackRepository.save(soundtrack);
        return ResponseEntity.ok(updatedSoundtrack);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSoundtrack(@PathVariable("id") Long id) {
        if (!soundtrackRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        soundtrackRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/references")
    public List<Soundtrack> getSoundtrackReferences() {
        return soundtrackRepository.findAllByOrderByPositionAsc();
    }
    
    @PostMapping("/reorder")
    public ResponseEntity<Void> reorderSoundtracks(@RequestBody List<ReorderRequest> reorderRequests) {
        try {
            for (ReorderRequest request : reorderRequests) {
                Optional<Soundtrack> soundtrackOpt = soundtrackRepository.findById(request.getId());
                if (soundtrackOpt.isPresent()) {
                    Soundtrack soundtrack = soundtrackOpt.get();
                    soundtrack.setPosition(request.getPosition());
                    soundtrackRepository.save(soundtrack);
                }
            }
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // Inner class for reorder requests
    public static class ReorderRequest {
        private Long id;
        private Double position;
        
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        
        public Double getPosition() { return position; }
        public void setPosition(Double position) { this.position = position; }
    }
}
