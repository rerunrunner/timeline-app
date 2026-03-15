package com.timeline.editor.repository;

import com.timeline.editor.model.EventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventTypeRepository extends JpaRepository<EventType, Long> {
    
    @Query("SELECT et FROM EventType et WHERE " +
           "LOWER(et.type) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<EventType> findBySearchTerm(@Param("search") String search);
}
