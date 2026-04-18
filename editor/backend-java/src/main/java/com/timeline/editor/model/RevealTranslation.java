package com.timeline.editor.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "reveal_translation")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class RevealTranslation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "reveal_id", nullable = false)
    private Long revealId;

    @Column(name = "language_id", nullable = false)
    private Long languageId;

    @Column(name = "displayed_date")
    private String displayedDate;

    @Column(name = "displayed_title")
    private String displayedTitle;

    @Column(name = "displayed_description")
    private String displayedDescription;

    @Column(name = "source")
    private String source;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reveal_id", insertable = false, updatable = false)
    @JsonIgnore
    private Reveal reveal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "language_id", insertable = false, updatable = false)
    @JsonIgnore
    private Language language;

    public RevealTranslation() {}

    public RevealTranslation(
            Long id,
            Long revealId,
            Long languageId,
            String displayedDate,
            String displayedTitle,
            String displayedDescription,
            String source,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        this.id = id;
        this.revealId = revealId;
        this.languageId = languageId;
        this.displayedDate = displayedDate;
        this.displayedTitle = displayedTitle;
        this.displayedDescription = displayedDescription;
        this.source = source;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getRevealId() {
        return revealId;
    }

    public void setRevealId(Long revealId) {
        this.revealId = revealId;
    }

    public Long getLanguageId() {
        return languageId;
    }

    public void setLanguageId(Long languageId) {
        this.languageId = languageId;
    }

    public String getDisplayedDate() {
        return displayedDate;
    }

    public void setDisplayedDate(String displayedDate) {
        this.displayedDate = displayedDate;
    }

    public String getDisplayedTitle() {
        return displayedTitle;
    }

    public void setDisplayedTitle(String displayedTitle) {
        this.displayedTitle = displayedTitle;
    }

    public String getDisplayedDescription() {
        return displayedDescription;
    }

    public void setDisplayedDescription(String displayedDescription) {
        this.displayedDescription = displayedDescription;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Reveal getReveal() {
        return reveal;
    }

    public void setReveal(Reveal reveal) {
        this.reveal = reveal;
    }

    public Language getLanguage() {
        return language;
    }

    public void setLanguage(Language language) {
        this.language = language;
    }
}
