package com.timeline.editor.repository;

import com.timeline.editor.model.RevealTranslation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RevealTranslationRepository extends JpaRepository<RevealTranslation, Long> {

    List<RevealTranslation> findByRevealId(Long revealId);

    List<RevealTranslation> findByRevealIdIn(List<Long> revealIds);

    Optional<RevealTranslation> findByRevealIdAndLanguageId(Long revealId, Long languageId);

    void deleteByRevealIdAndLanguageId(Long revealId, Long languageId);

    void deleteByLanguageId(Long languageId);
}
