package com.timeline.editor.repository;

import com.timeline.editor.model.TimelineSlice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TimelineSliceRepository extends JpaRepository<TimelineSlice, Long> {
    
    @Query("SELECT ts FROM TimelineSlice ts WHERE " +
           "LOWER(ts.shortDescription) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(ts.notes) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<TimelineSlice> findBySearchTerm(@Param("search") String search);
    
    List<TimelineSlice> findByTimelineId(Long timelineId);
}
