package com.timeline.editor.repository;

import com.timeline.editor.model.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {
    
    @Query("SELECT e FROM Event e WHERE " +
           "LOWER(e.shortDescription) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(e.notes) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<Event> findBySearchTerm(@Param("search") String search);
}
