package com.timeline.editor.repository;

import com.timeline.editor.model.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {
    
    @Query("SELECT n FROM Note n WHERE " +
           "LOWER(n.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(n.body) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<Note> findBySearchTerm(@Param("search") String search);
}
