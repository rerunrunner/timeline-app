package com.timeline.editor.repository;

import com.timeline.editor.model.DatasetMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DatasetMetadataRepository extends JpaRepository<DatasetMetadata, String> {
    // JpaRepository already provides findById(String id) method
    
    // Find the first dataset metadata entry
    DatasetMetadata findFirstByIdIsNotNull();
}
