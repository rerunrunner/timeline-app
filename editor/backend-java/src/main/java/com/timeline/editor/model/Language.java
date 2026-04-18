package com.timeline.editor.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "language")
public class Language {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "code", nullable = false, length = 10)
    private String code;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "localized_name", nullable = false, length = 100)
    private String localizedName;

    @Column(name = "flag_emoji", length = 16)
    private String flagEmoji;

    @Column(name = "is_default", nullable = false)
    private Boolean isDefault;

    @Column(name = "is_enabled", nullable = false)
    private Boolean isEnabled;

    public Language() {}

    public Language(Long id, String code, String name, Boolean isDefault, Boolean isEnabled) {
        this(id, code, name, name, null, isDefault, isEnabled);
    }

    public Language(Long id, String code, String name, String localizedName, String flagEmoji, Boolean isDefault, Boolean isEnabled) {
        this.id = id;
        this.code = code;
        this.name = name;
        this.localizedName = localizedName;
        this.flagEmoji = flagEmoji;
        this.isDefault = isDefault;
        this.isEnabled = isEnabled;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLocalizedName() {
        return localizedName;
    }

    public void setLocalizedName(String localizedName) {
        this.localizedName = localizedName;
    }

    public String getFlagEmoji() {
        return flagEmoji;
    }

    public void setFlagEmoji(String flagEmoji) {
        this.flagEmoji = flagEmoji;
    }

    public Boolean getIsDefault() {
        return isDefault;
    }

    public void setIsDefault(Boolean isDefault) {
        this.isDefault = isDefault;
    }

    public Boolean getIsEnabled() {
        return isEnabled;
    }

    public void setIsEnabled(Boolean isEnabled) {
        this.isEnabled = isEnabled;
    }
}
