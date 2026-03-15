package com.timeline.editor.repository;

import com.timeline.editor.model.Reveal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RevealRepository extends JpaRepository<Reveal, Long> {
    
    @Query("SELECT r FROM Reveal r WHERE " +
           "LOWER(r.displayedTitle) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(r.displayedDescription) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<Reveal> findBySearchTerm(@Param("search") String search);
    
    List<Reveal> findByEventId(Long eventId);
}
