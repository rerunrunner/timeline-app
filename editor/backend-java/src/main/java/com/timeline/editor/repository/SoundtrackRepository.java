package com.timeline.editor.repository;

import com.timeline.editor.model.Soundtrack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SoundtrackRepository extends JpaRepository<Soundtrack, Long> {
    
    @Query("SELECT s FROM Soundtrack s WHERE " +
           "LOWER(s.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.youtubeLink) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<Soundtrack> findBySearchTerm(@Param("search") String search);
    
    List<Soundtrack> findAllByOrderByPositionAsc();
}
