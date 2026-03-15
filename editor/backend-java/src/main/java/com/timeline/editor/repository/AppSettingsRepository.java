package com.timeline.editor.repository;

import com.timeline.editor.model.AppSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AppSettingsRepository extends JpaRepository<AppSettings, String> {
    AppSettings findFirstByIdIsNotNull();
}

