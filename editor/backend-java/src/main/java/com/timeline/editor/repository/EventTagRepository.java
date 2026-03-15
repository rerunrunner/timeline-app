package com.timeline.editor.repository;

import com.timeline.editor.model.EventTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventTagRepository extends JpaRepository<EventTag, Long> {
    
    @Query("SELECT et FROM EventTag et WHERE " +
           "LOWER(et.tag) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<EventTag> findBySearchTerm(@Param("search") String search);
}
