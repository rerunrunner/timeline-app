package com.timeline.editor.repository;

import com.timeline.editor.model.Language;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LanguageRepository extends JpaRepository<Language, Long> {

    List<Language> findAllByOrderByIsDefaultDescNameAsc();

    List<Language> findByIsEnabledTrueOrderByIsDefaultDescNameAsc();

    Optional<Language> findByCode(String code);

    Optional<Language> findByIsDefaultTrue();
}
