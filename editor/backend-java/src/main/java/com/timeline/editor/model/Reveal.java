package com.timeline.editor.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "reveal")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Reveal extends BaseEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;
    
    @NotNull
    @Column(name = "event_id")
    private Long eventId;
    
    @Column(name = "apparent_timeline_id")
    private Long apparentTimelineId;
    
    @NotNull
    @Column(name = "episode_id")
    private Long episodeId;
    
    @NotNull
    @Column(name = "episode_time")
    private Integer episodeTime; // time position in episode (seconds)
    
    @Column(name = "displayed_date")
    private String displayedDate;
    
    @Column(name = "displayed_title")
    private String displayedTitle;
    
    @Column(name = "displayed_description")
    private String displayedDescription;
    
    @Column(name = "screenshot_filename")
    private String screenshotFilename;
    
    // Foreign key relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", insertable = false, updatable = false)
    @JsonIgnore
    private Event event;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apparent_timeline_id", insertable = false, updatable = false)
    @JsonIgnore
    private Timeline apparentTimeline;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "episode_id", insertable = false, updatable = false)
    @JsonIgnore
    private Episode episode;
    
    // Constructors
    public Reveal() {}
    
    public Reveal(Long id, Long eventId, Long apparentTimelineId, Long episodeId, 
                  Integer episodeTime, String displayedDate, String displayedTitle, 
                  String displayedDescription, String screenshotFilename) {
        this.id = id;
        this.eventId = eventId;
        this.apparentTimelineId = apparentTimelineId;
        this.episodeId = episodeId;
        this.episodeTime = episodeTime;
        this.displayedDate = displayedDate;
        this.displayedTitle = displayedTitle;
        this.displayedDescription = displayedDescription;
        this.screenshotFilename = screenshotFilename;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }
    
    public Long getApparentTimelineId() { return apparentTimelineId; }
    public void setApparentTimelineId(Long apparentTimelineId) { this.apparentTimelineId = apparentTimelineId; }
    
    public Long getEpisodeId() { return episodeId; }
    public void setEpisodeId(Long episodeId) { this.episodeId = episodeId; }
    
    public Integer getEpisodeTime() { return episodeTime; }
    public void setEpisodeTime(Integer episodeTime) { this.episodeTime = episodeTime; }
    
    public String getDisplayedDate() { return displayedDate; }
    public void setDisplayedDate(String displayedDate) { this.displayedDate = displayedDate; }
    
    public String getDisplayedTitle() { return displayedTitle; }
    public void setDisplayedTitle(String displayedTitle) { this.displayedTitle = displayedTitle; }
    
    public String getDisplayedDescription() { return displayedDescription; }
    public void setDisplayedDescription(String displayedDescription) { this.displayedDescription = displayedDescription; }
    
    public String getScreenshotFilename() { return screenshotFilename; }
    public void setScreenshotFilename(String screenshotFilename) { this.screenshotFilename = screenshotFilename; }
    
    public Event getEvent() { return event; }
    public void setEvent(Event event) { this.event = event; }
    
    public Timeline getApparentTimeline() { return apparentTimeline; }
    public void setApparentTimeline(Timeline apparentTimeline) { this.apparentTimeline = apparentTimeline; }
    
    public Episode getEpisode() { return episode; }
    public void setEpisode(Episode episode) { this.episode = episode; }
}
