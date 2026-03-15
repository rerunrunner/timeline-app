package com.timeline.editor.repository;

import com.timeline.editor.model.Timeline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TimelineRepository extends JpaRepository<Timeline, Long> {
    
    @Query("SELECT t FROM Timeline t WHERE " +
           "LOWER(t.shortId) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<Timeline> findBySearchTerm(@Param("search") String search);
}
