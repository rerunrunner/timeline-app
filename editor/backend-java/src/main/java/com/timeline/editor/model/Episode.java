package com.timeline.editor.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "episode")
public class Episode extends BaseEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;
    
    @NotNull
    @Column(name = "number")
    private Integer number;
    
    @NotNull
    @Column(name = "title")
    private String title;
    
    @NotNull
    @Column(name = "duration")
    private Integer duration; // duration in seconds
    
    // Constructors
    public Episode() {}
    
    public Episode(Long id, Integer number, String title, Integer duration) {
        this.id = id;
        this.number = number;
        this.title = title;
        this.duration = duration;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Integer getNumber() { return number; }
    public void setNumber(Integer number) { this.number = number; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }
}
