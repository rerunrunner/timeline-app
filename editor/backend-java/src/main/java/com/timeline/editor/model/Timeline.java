package com.timeline.editor.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "timeline")
public class Timeline extends BaseEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;
    
    @NotNull
    @Column(name = "short_id")
    private String shortId;
    
    @NotNull
    @Column(name = "title")
    private String title;
    
    // Constructors
    public Timeline() {}
    
    public Timeline(Long id, String shortId, String title) {
        this.id = id;
        this.shortId = shortId;
        this.title = title;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getShortId() { return shortId; }
    public void setShortId(String shortId) { this.shortId = shortId; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
}
