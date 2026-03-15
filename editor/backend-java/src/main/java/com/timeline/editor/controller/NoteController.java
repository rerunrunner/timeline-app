package com.timeline.editor.controller;

import com.timeline.editor.model.Note;
import com.timeline.editor.repository.NoteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/tables/note")
public class NoteController {
    
    @Autowired
    private NoteRepository noteRepository;
    
    @GetMapping
    public List<Note> getAllNotes(@RequestParam(value = "search", required = false) String search) {
        if (search != null && !search.trim().isEmpty()) {
            return noteRepository.findBySearchTerm(search);
        }
        return noteRepository.findAll();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Note> getNoteById(@PathVariable("id") Long id) {
        Optional<Note> note = noteRepository.findById(id);
        return note.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public Note createNote(@RequestBody Note note) {
        return noteRepository.save(note);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Note> updateNote(@PathVariable("id") Long id, @RequestBody Note noteDetails) {
        Optional<Note> optionalNote = noteRepository.findById(id);
        if (optionalNote.isPresent()) {
            Note note = optionalNote.get();
            note.setTitle(noteDetails.getTitle());
            note.setContextEventId(noteDetails.getContextEventId());
            note.setBody(noteDetails.getBody());
            
            Note updatedNote = noteRepository.save(note);
            return ResponseEntity.ok(updatedNote);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNote(@PathVariable("id") Long id) {
        if (noteRepository.existsById(id)) {
            noteRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
