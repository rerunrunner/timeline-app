package com.timeline.editor.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.HashSet;

@Entity
@Table(name = "event")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Event extends BaseEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;
    
    @NotNull
    @Column(name = "timeline_id")
    private Long timelineId;
    
    @NotNull
    @Column(name = "short_description")
    private String shortDescription;
    
    @NotNull
    @Column(name = "narrative_date")
    private LocalDateTime narrativeDate;
    
    @Column(name = "notes")
    private String notes;
    
    @Column(name = "event_type_id")
    private Long eventTypeId;
    
    @Column(name = "linked_event_id")
    private Long linkedEventId;
    
    @Column(name = "ost_track_id")
    private Long ostTrackId;
    
    // Many-to-many relationship with tags
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "event_tag",
        joinColumns = @JoinColumn(name = "event_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private Set<EventTag> tags = new HashSet<>();
    
    // Foreign key relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "timeline_id", insertable = false, updatable = false)
    @JsonIgnore
    private Timeline timeline;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_type_id", insertable = false, updatable = false)
    @JsonIgnore
    private EventType eventType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_event_id", insertable = false, updatable = false)
    @JsonIgnore
    private Event linkedEvent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ost_track_id", insertable = false, updatable = false)
    @JsonIgnore
    private Soundtrack soundtrack;
    
    // Constructors
    public Event() {}
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Long getTimelineId() { return timelineId; }
    public void setTimelineId(Long timelineId) { this.timelineId = timelineId; }
    
    public String getShortDescription() { return shortDescription; }
    public void setShortDescription(String shortDescription) { this.shortDescription = shortDescription; }
    
    public LocalDateTime getNarrativeDate() { return narrativeDate; }
    public void setNarrativeDate(LocalDateTime narrativeDate) { this.narrativeDate = narrativeDate; }
    
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    
    public Long getEventTypeId() { return eventTypeId; }
    public void setEventTypeId(Long eventTypeId) { this.eventTypeId = eventTypeId; }
    
    public Long getLinkedEventId() { return linkedEventId; }
    public void setLinkedEventId(Long linkedEventId) { this.linkedEventId = linkedEventId; }
    
    public Long getOstTrackId() { return ostTrackId; }
    public void setOstTrackId(Long ostTrackId) { this.ostTrackId = ostTrackId; }
    
    public Set<EventTag> getTags() { return tags; }
    public void setTags(Set<EventTag> tags) { this.tags = tags; }
    
    public Timeline getTimeline() { return timeline; }
    public void setTimeline(Timeline timeline) { this.timeline = timeline; }
    
    public EventType getEventType() { return eventType; }
    public void setEventType(EventType eventType) { this.eventType = eventType; }
    
    public Event getLinkedEvent() { return linkedEvent; }
    public void setLinkedEvent(Event linkedEvent) { this.linkedEvent = linkedEvent; }
    
    public Soundtrack getSoundtrack() { return soundtrack; }
    public void setSoundtrack(Soundtrack soundtrack) { this.soundtrack = soundtrack; }
    
    // Convenience method to get semantic ID
    public String getSemanticId() {
        if (timelineId == null || shortDescription == null) {
            return null;
        }
        // This will need the timeline shortId, so we'll need to pass it in or get it from the timeline relationship
        // For now, we'll return a placeholder that can be completed in the service
        return shortDescription;
    }
    
    // Method to get semantic ID with timeline shortId
    public String getSemanticId(String timelineShortId) {
        if (timelineShortId == null || shortDescription == null) {
            return null;
        }
        return timelineShortId + "-" + shortDescription;
    }
}
