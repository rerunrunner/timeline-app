package com.timeline.editor.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.Set;
import java.util.HashSet;

@Entity
@Table(name = "tag")
public class EventTag extends BaseEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;
    
    @NotNull
    @Column(name = "tag")
    private String tag;
    
    // Many-to-many relationship with events
    @ManyToMany(mappedBy = "tags", fetch = FetchType.LAZY)
    @JsonIgnore
    private Set<Event> events = new HashSet<>();
    
    // Constructors
    public EventTag() {}
    
    public EventTag(Long id, String tag) {
        this.id = id;
        this.tag = tag;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getTag() { return tag; }
    public void setTag(String tag) { this.tag = tag; }
    
    public Set<Event> getEvents() { return events; }
    public void setEvents(Set<Event> events) { this.events = events; }
}
