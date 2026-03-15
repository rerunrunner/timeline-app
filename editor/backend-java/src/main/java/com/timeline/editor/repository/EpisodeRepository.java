package com.timeline.editor.repository;

import com.timeline.editor.model.Episode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EpisodeRepository extends JpaRepository<Episode, Long> {
    
    @Query("SELECT e FROM Episode e WHERE " +
           "LOWER(e.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "CAST(e.number AS string) LIKE CONCAT('%', :search, '%')")
    List<Episode> findBySearchTerm(@Param("search") String search);
}
