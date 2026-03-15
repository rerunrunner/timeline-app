package com.timeline.editor.model;

import jakarta.persistence.*;

@Entity
@Table(name = "dataset_metadata")
public class DatasetMetadata {
    
    @Id
    @Column(name = "id")
    private String id;
    
    @Column(name = "name")
    private String name;
    
    @Column(name = "description")
    private String description;
    
    @Column(name = "version")
    private String version;
    
    // Constructors
    public DatasetMetadata() {}
    
    public DatasetMetadata(String id, String name, String description, String version) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.version = version;
    }
    
    // Getters and Setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public String getVersion() {
        return version;
    }
    
    public void setVersion(String version) {
        this.version = version;
    }
    
    @Override
    public String toString() {
        return "DatasetMetadata{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", description='" + description + '\'' +
                ", version='" + version + '\'' +
                '}';
    }
}
