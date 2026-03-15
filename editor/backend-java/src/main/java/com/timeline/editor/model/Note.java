package com.timeline.editor.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "note")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Note extends BaseEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;
    
    @NotNull
    @Column(name = "title")
    private String title;
    
    @Column(name = "context_event_id")
    private Long contextEventId;
    
    @NotNull
    @Column(name = "body")
    private String body;
    
    // Foreign key relationship
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "context_event_id", insertable = false, updatable = false)
    private Event contextEvent;
    
    // Constructors
    public Note() {}
    
    public Note(Long id, String title, Long contextEventId, String body) {
        this.id = id;
        this.title = title;
        this.contextEventId = contextEventId;
        this.body = body;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public Long getContextEventId() { return contextEventId; }
    public void setContextEventId(Long contextEventId) { this.contextEventId = contextEventId; }
    
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    
    public Event getContextEvent() { return contextEvent; }
    public void setContextEvent(Event contextEvent) { this.contextEvent = contextEvent; }
}
