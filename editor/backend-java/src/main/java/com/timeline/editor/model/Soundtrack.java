package com.timeline.editor.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "soundtrack")
public class Soundtrack extends BaseEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;
    
    @NotNull
    @Column(name = "position")
    private Double position;
    
    @NotNull
    @Column(name = "title")
    private String title;
    
    @NotNull
    @Column(name = "youtube_link")
    private String youtubeLink;
    
    // Constructors
    public Soundtrack() {}
    
    public Soundtrack(Long id, Double position, String title, String youtubeLink) {
        this.id = id;
        this.position = position;
        this.title = title;
        this.youtubeLink = youtubeLink;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Double getPosition() { return position; }
    public void setPosition(Double position) { this.position = position; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getYoutubeLink() { return youtubeLink; }
    public void setYoutubeLink(String youtubeLink) { this.youtubeLink = youtubeLink; }
    
    // Convenience method to get semantic ID
    public String getSemanticId() {
        return title != null ? title.toLowerCase().replaceAll("\\s+", "-") : null;
    }
}
