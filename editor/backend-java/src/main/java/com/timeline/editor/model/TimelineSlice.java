package com.timeline.editor.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;

@Entity
@Table(name = "timeline_slice")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class TimelineSlice extends BaseEntity {
    
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
    @Column(name = "start_timestamp")
    private LocalDateTime startTimestamp;
    
    @NotNull
    @Column(name = "end_timestamp")
    private LocalDateTime endTimestamp;
    
    @NotNull
    @Column(name = "importance")
    private String importance;
    
    @Column(name = "notes")
    private String notes;
    
    // Foreign key relationship
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "timeline_id", insertable = false, updatable = false)
    @JsonIgnore
    private Timeline timeline;
    
    // Constructors
    public TimelineSlice() {}
    
    public TimelineSlice(Long id, Long timelineId, String shortDescription, 
                        LocalDateTime startTimestamp, LocalDateTime endTimestamp, 
                        String importance, String notes) {
        this.id = id;
        this.timelineId = timelineId;
        this.shortDescription = shortDescription;
        this.startTimestamp = startTimestamp;
        this.endTimestamp = endTimestamp;
        this.importance = importance;
        this.notes = notes;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Long getTimelineId() { return timelineId; }
    public void setTimelineId(Long timelineId) { this.timelineId = timelineId; }
    
    public String getShortDescription() { return shortDescription; }
    public void setShortDescription(String shortDescription) { this.shortDescription = shortDescription; }
    
    public LocalDateTime getStartTimestamp() { return startTimestamp; }
    public void setStartTimestamp(LocalDateTime startTimestamp) { this.startTimestamp = startTimestamp; }
    
    public LocalDateTime getEndTimestamp() { return endTimestamp; }
    public void setEndTimestamp(LocalDateTime endTimestamp) { this.endTimestamp = endTimestamp; }
    
    public String getImportance() { return importance; }
    public void setImportance(String importance) { this.importance = importance; }
    
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    
    public Timeline getTimeline() { return timeline; }
    public void setTimeline(Timeline timeline) { this.timeline = timeline; }
}
