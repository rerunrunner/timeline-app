package com.timeline.editor.service;

import com.timeline.editor.model.*;
import com.timeline.editor.repository.TimelineRepository;
import com.timeline.editor.repository.TimelineSliceRepository;
import com.timeline.editor.repository.EventRepository;
import com.timeline.editor.repository.NoteRepository;
import com.timeline.editor.repository.EpisodeRepository;
import com.timeline.editor.repository.RevealRepository;
import com.timeline.editor.repository.RevealTranslationRepository;
import com.timeline.editor.repository.EventTypeRepository;
import com.timeline.editor.repository.LanguageRepository;
import com.timeline.editor.repository.SoundtrackRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class DatasetExportService {

    @Autowired
    private TimelineRepository timelineRepository;
    
    @Autowired
    private TimelineSliceRepository timelineSliceRepository;
    
    @Autowired
    private EventRepository eventRepository;
    
    @Autowired
    private NoteRepository noteRepository;
    
    @Autowired
    private EpisodeRepository episodeRepository;
    
    @Autowired
    private RevealRepository revealRepository;

    @Autowired
    private RevealTranslationRepository revealTranslationRepository;
    
    @Autowired
    private EventTypeRepository eventTypeRepository;

    @Autowired
    private LanguageRepository languageRepository;
    
    @Autowired
    private SoundtrackRepository soundtrackRepository;
    
    @Autowired
    private DatasetMetadataService datasetMetadataService;

    public Map<String, Object> exportDataset() {
        Map<String, Object> exportData = new LinkedHashMap<>();
        List<Language> enabledLanguages = languageRepository.findByIsEnabledTrueOrderByIsDefaultDescNameAsc();
        Language defaultLanguage = enabledLanguages.stream()
            .filter(language -> Boolean.TRUE.equals(language.getIsDefault()))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("Default language must be enabled for dataset export."));

        exportData.put("defaultLanguageCode", defaultLanguage.getCode());
        exportData.put("languages", exportLanguages(enabledLanguages));
        
        // Export timelines with slices
        List<Map<String, Object>> timelines = exportTimelines();
        exportData.put("timelines", timelines);
        
        // Export events with tags and reveals
        List<Map<String, Object>> events = exportEvents(enabledLanguages, defaultLanguage);
        exportData.put("events", events);
        
        // Export notes
        List<Map<String, Object>> notes = exportNotes();
        exportData.put("notes", notes);
        
        // Export soundtracks
        List<Map<String, Object>> soundtracks = exportSoundtracks();
        exportData.put("soundtracks", soundtracks);
        
        // Export episodes
        List<Map<String, Object>> episodes = exportEpisodes();
        exportData.put("episodes", episodes);
        
        // Export metadata
        Map<String, Object> metadata = exportMetadata();
        exportData.put("metadata", metadata);
        
        return exportData;
    }
    
    private List<Map<String, Object>> exportTimelines() {
        List<Timeline> timelines = timelineRepository.findAll();
        return timelines.stream().map(timeline -> {
            Map<String, Object> timelineData = new LinkedHashMap<>();
            timelineData.put("id", timeline.getShortId());
            timelineData.put("name", timeline.getTitle());
            timelineData.put("description", null); // Timeline doesn't have description field
            
            // Get slices for this timeline
            List<TimelineSlice> slices = timelineSliceRepository.findByTimelineId(timeline.getId());
            List<Map<String, Object>> sliceData = slices.stream().map(slice -> {
                Map<String, Object> sliceMap = new LinkedHashMap<>();
                sliceMap.put("id", slice.getId().toString()); // Keep slice ID as is (no shortId available)
                sliceMap.put("timelineId", timeline.getShortId()); // Use timeline shortId
                sliceMap.put("shortDescription", slice.getShortDescription());
                sliceMap.put("startTimestamp", slice.getStartTimestamp().toString());
                sliceMap.put("endTimestamp", slice.getEndTimestamp().toString());
                sliceMap.put("importance", slice.getImportance());
                sliceMap.put("notes", slice.getNotes());
                return sliceMap;
            }).collect(Collectors.toList());
            
            timelineData.put("slices", sliceData);
            return timelineData;
        }).collect(Collectors.toList());
    }
    
    private List<Map<String, Object>> exportEvents(List<Language> enabledLanguages, Language defaultLanguage) {
        List<Event> events = eventRepository.findAll();
        
        // Create mapping from timeline ID to shortId for consistent references
        List<Timeline> timelines = timelineRepository.findAll();
        Map<Long, String> timelineIdToShortId = timelines.stream()
            .collect(Collectors.toMap(Timeline::getId, Timeline::getShortId));
        
        // Create mapping from event type ID to semantic ID (using type name)
        List<EventType> eventTypes = eventTypeRepository.findAll();
        Map<Long, String> eventTypeIdToSemanticId = eventTypes.stream()
            .collect(Collectors.toMap(
                EventType::getId,
                EventType::getType
            ));
        
        // Create mapping from event ID to semantic ID for linked events
        Map<Long, String> eventIdToSemanticId = events.stream()
            .collect(Collectors.toMap(
                Event::getId,
                event -> {
                    String timelineShortId = timelineIdToShortId.get(event.getTimelineId());
                    return event.getSemanticId(timelineShortId);
                }
            ));
        
        // Create mapping from soundtrack ID to semantic ID
        List<Soundtrack> soundtracks = soundtrackRepository.findAll();
        Map<Long, String> soundtrackIdToSemanticId = soundtracks.stream()
            .collect(Collectors.toMap(
                Soundtrack::getId,
                Soundtrack::getSemanticId
            ));
        
        // Get all episodes for absolutePlayTime calculation
        List<Episode> episodes = episodeRepository.findAll();
        
        return events.stream()
            .sorted((event1, event2) -> {
                // Get first reveal for each event to determine sort order
                List<Reveal> reveals1 = revealRepository.findByEventId(event1.getId());
                List<Reveal> reveals2 = revealRepository.findByEventId(event2.getId());
                
                if (reveals1.isEmpty() && reveals2.isEmpty()) {
                    return 0; // Both have no reveals, maintain original order
                }
                if (reveals1.isEmpty()) {
                    return 1; // event1 has no reveals, put it after event2
                }
                if (reveals2.isEmpty()) {
                    return -1; // event2 has no reveals, put it after event1
                }
                
                // Sort by first reveal's episode time
                Integer time1 = reveals1.get(0).getEpisodeTime();
                Integer time2 = reveals2.get(0).getEpisodeTime();
                
                if (time1 == null && time2 == null) {
                    return 0;
                }
                if (time1 == null) {
                    return 1;
                }
                if (time2 == null) {
                    return -1;
                }
                
                return time1.compareTo(time2);
            })
            .map(event -> {
            Map<String, Object> eventData = new LinkedHashMap<>();
            // Create semantic event ID: <timeline.shortId>-<event.shortDescription>
            String timelineShortId = timelineIdToShortId.get(event.getTimelineId());
            String semanticEventId = event.getSemanticId(timelineShortId);
            eventData.put("id", semanticEventId);
            eventData.put("timelineId", timelineShortId); // Use timeline shortId
            eventData.put("shortDescription", event.getShortDescription());
            eventData.put("narrativeDate", event.getNarrativeDate().toString());
            eventData.put("notes", event.getNotes());
            eventData.put("eventType", event.getEventTypeId() != null ? 
                eventTypeIdToSemanticId.get(event.getEventTypeId()) : null);
            eventData.put("linkedEventId", event.getLinkedEventId() != null ? 
                eventIdToSemanticId.get(event.getLinkedEventId()) : null);
            eventData.put("soundtrackId", event.getOstTrackId() != null ? 
                soundtrackIdToSemanticId.get(event.getOstTrackId()) : null);
            
            // Export tags for this event
            List<String> eventTags = event.getTags().stream()
                .map(EventTag::getTag)
                .collect(Collectors.toList());
            eventData.put("tags", eventTags);
            
            // Export reveals for this event (sorted by episode time)
            List<Reveal> reveals = revealRepository.findByEventId(event.getId())
                .stream()
                .sorted((r1, r2) -> {
                    Integer time1 = r1.getEpisodeTime();
                    Integer time2 = r2.getEpisodeTime();
                    if (time1 == null && time2 == null) return 0;
                    if (time1 == null) return 1;
                    if (time2 == null) return -1;
                    return time1.compareTo(time2);
                })
                .collect(Collectors.toList());
            Map<Long, Map<Long, RevealTranslation>> translationsByRevealId = loadTranslationsByRevealId(reveals);
            Map<Long, Map<String, Object>> resolvedTranslationsByReveal = buildResolvedTranslationsForEvent(
                event,
                reveals,
                enabledLanguages,
                defaultLanguage,
                translationsByRevealId
            );
            List<Map<String, Object>> revealData = reveals.stream().map(reveal -> {
                Map<String, Object> resolvedTranslations = resolvedTranslationsByReveal.get(reveal.getId());
                if (resolvedTranslations == null) {
                    throw new IllegalStateException("Missing resolved translations for reveal " + reveal.getId());
                }
                Map<String, Object> revealMap = new LinkedHashMap<>();
                revealMap.put("id", reveal.getId().toString());
                // Use semantic event ID: <timeline.shortId>-<event.shortDescription>
                String eventTimelineShortId = timelineIdToShortId.get(event.getTimelineId());
                String eventSemanticId = eventTimelineShortId + "-" + event.getShortDescription();
                revealMap.put("eventId", eventSemanticId);
                // Convert apparentTimelineId from Long to shortId if it exists
                String apparentTimelineShortId = null;
                if (reveal.getApparentTimelineId() != null) {
                    apparentTimelineShortId = timelineIdToShortId.get(reveal.getApparentTimelineId());
                }
                revealMap.put("apparentTimelineId", apparentTimelineShortId);
                revealMap.put("episodeId", reveal.getEpisodeId().toString());
                revealMap.put("episodeTime", reveal.getEpisodeTime());
                
                // Calculate absolute play time
                Integer absolutePlayTime = calculateAbsolutePlayTime(reveal.getEpisodeId(), reveal.getEpisodeTime(), episodes);
                revealMap.put("absolutePlayTime", absolutePlayTime);
                
                revealMap.put("translations", resolvedTranslations.get("translations"));
                revealMap.put("narrativeTimeframeSpecificityLevel", resolvedTranslations.get("narrativeTimeframeSpecificityLevel"));
                revealMap.put("screenshotFilename", reveal.getScreenshotFilename());
                return revealMap;
            }).collect(Collectors.toList());
            
            eventData.put("reveals", revealData);
            return eventData;
        }).collect(Collectors.toList());
    }
    
    private List<Map<String, Object>> exportNotes() {
        List<Note> notes = noteRepository.findAll();
        
        // Create mapping from event ID to semantic event ID
        List<Event> events = eventRepository.findAll();
        List<Timeline> timelines = timelineRepository.findAll();
        Map<Long, String> timelineIdToShortId = timelines.stream()
            .collect(Collectors.toMap(Timeline::getId, Timeline::getShortId));
        Map<Long, String> eventIdToSemanticId = events.stream()
            .collect(Collectors.toMap(
                Event::getId, 
                event -> {
                    String timelineShortId = timelineIdToShortId.get(event.getTimelineId());
                    return event.getSemanticId(timelineShortId);
                }
            ));
        
        // Create mapping from event type ID to semantic ID (using type name)
        List<EventType> eventTypes = eventTypeRepository.findAll();
        Map<Long, String> eventTypeIdToSemanticId = eventTypes.stream()
            .collect(Collectors.toMap(
                EventType::getId,
                EventType::getType
            ));
        
        return notes.stream().map(note -> {
            Map<String, Object> noteData = new LinkedHashMap<>();
            noteData.put("id", note.getId().toString());
            // Convert event ID to semantic event ID if it exists
            String semanticEventId = null;
            if (note.getContextEventId() != null) {
                semanticEventId = eventIdToSemanticId.get(note.getContextEventId());
            }
            noteData.put("eventId", semanticEventId);
            noteData.put("title", note.getTitle());
            noteData.put("body", note.getBody());
            return noteData;
        }).collect(Collectors.toList());
    }
    
    private List<Map<String, Object>> exportEpisodes() {
        List<Episode> episodes = episodeRepository.findAll();
        return episodes.stream().map(episode -> {
            Map<String, Object> episodeData = new LinkedHashMap<>();
            episodeData.put("id", episode.getId().toString());
            episodeData.put("title", episode.getTitle());
            episodeData.put("duration", episode.getDuration());
            episodeData.put("episodeNumber", episode.getNumber());
            return episodeData;
        }).collect(Collectors.toList());
    }
    
    private Map<String, Object> exportMetadata() {
        DatasetMetadata metadata = datasetMetadataService.getMetadata();
        Map<String, Object> metadataData = new LinkedHashMap<>();
        metadataData.put("id", metadata.getId());
        metadataData.put("version", metadata.getVersion());
        metadataData.put("name", metadata.getName());
        metadataData.put("description", metadata.getDescription());
        return metadataData;
    }

    private List<Map<String, Object>> exportLanguages(List<Language> languages) {
        return languages.stream()
            .map(language -> {
                Map<String, Object> languageData = new LinkedHashMap<>();
                languageData.put("code", language.getCode());
                languageData.put("name", language.getName());
                languageData.put("isDefault", language.getIsDefault());
                return languageData;
            })
            .collect(Collectors.toList());
    }
    
    private List<Map<String, Object>> exportSoundtracks() {
        List<Soundtrack> soundtracks = soundtrackRepository.findAll();
        return soundtracks.stream()
            .sorted((s1, s2) -> s1.getPosition().compareTo(s2.getPosition()))
            .map(soundtrack -> {
                Map<String, Object> soundtrackData = new LinkedHashMap<>();
                soundtrackData.put("id", soundtrack.getSemanticId());
                soundtrackData.put("title", soundtrack.getTitle());
                soundtrackData.put("mediaUrl", soundtrack.getYoutubeLink());
                return soundtrackData;
            })
            .collect(Collectors.toList());
    }
    
    private Integer calculateAbsolutePlayTime(Long episodeId, Integer episodeTime, List<Episode> episodes) {
        if (episodeId == null || episodeTime == null) {
            return null;
        }

        Episode targetEpisode = episodes.stream()
            .filter(episode -> episode.getId().equals(episodeId))
            .findFirst()
            .orElse(null);
        if (targetEpisode == null) {
            return null;
        }

        // Get all episodes with numbers less than the target episode
        int cumulativeDuration = episodes.stream()
            .filter(ep -> ep.getNumber() < targetEpisode.getNumber())
            .sorted((e1, e2) -> e1.getNumber().compareTo(e2.getNumber()))
            .map(Episode::getDuration)
            .reduce(0, Integer::sum);

        return cumulativeDuration + episodeTime;
    }

    private Map<Long, Map<Long, RevealTranslation>> loadTranslationsByRevealId(List<Reveal> reveals) {
        List<Long> revealIds = reveals.stream()
            .map(Reveal::getId)
            .collect(Collectors.toList());
        if (revealIds.isEmpty()) {
            return Collections.emptyMap();
        }

        return revealTranslationRepository.findByRevealIdIn(revealIds).stream()
            .collect(Collectors.groupingBy(
                RevealTranslation::getRevealId,
                Collectors.toMap(RevealTranslation::getLanguageId, translation -> translation)
            ));
    }

    private Map<Long, Map<String, Object>> buildResolvedTranslationsForEvent(
        Event event,
        List<Reveal> reveals,
        List<Language> enabledLanguages,
        Language defaultLanguage,
        Map<Long, Map<Long, RevealTranslation>> translationsByRevealId
    ) {
        Map<String, String> currentTitleByLanguage = new HashMap<>();
        Map<String, String> currentDateByLanguage = new HashMap<>();
        Map<String, String> currentDescriptionByLanguage = new HashMap<>();

        Map<Long, Map<String, Object>> resolvedByReveal = new LinkedHashMap<>();
        String defaultLanguageCode = defaultLanguage.getCode();

        for (Reveal reveal : reveals) {
            if (hasNonEmptyString(reveal.getDisplayedTitle())) {
                currentTitleByLanguage.put(defaultLanguageCode, reveal.getDisplayedTitle());
            }
            if (hasValue(reveal.getDisplayedDate())) {
                currentDateByLanguage.put(defaultLanguageCode, reveal.getDisplayedDate());
            }
            if (hasValue(reveal.getDisplayedDescription())) {
                currentDescriptionByLanguage.put(defaultLanguageCode, reveal.getDisplayedDescription());
            }

            Map<Long, RevealTranslation> translationsForReveal = translationsByRevealId.getOrDefault(reveal.getId(), Collections.emptyMap());
            Map<String, Object> translations = new LinkedHashMap<>();

            for (Language language : enabledLanguages) {
                String languageCode = language.getCode();
                if (!languageCode.equals(defaultLanguageCode)) {
                    RevealTranslation translation = translationsForReveal.get(language.getId());
                    if (translation != null) {
                        if (hasNonEmptyString(translation.getDisplayedTitle())) {
                            currentTitleByLanguage.put(languageCode, translation.getDisplayedTitle());
                        }
                        if (hasValue(translation.getDisplayedDate())) {
                            currentDateByLanguage.put(languageCode, translation.getDisplayedDate());
                        }
                        if (hasValue(translation.getDisplayedDescription())) {
                            currentDescriptionByLanguage.put(languageCode, translation.getDisplayedDescription());
                        }
                    }
                }

                String resolvedTitle = languageCode.equals(defaultLanguageCode)
                    ? currentTitleByLanguage.get(languageCode)
                    : firstNonNull(currentTitleByLanguage.get(languageCode), currentTitleByLanguage.get(defaultLanguageCode));
                String resolvedDate = languageCode.equals(defaultLanguageCode)
                    ? currentDateByLanguage.get(languageCode)
                    : firstNonNull(currentDateByLanguage.get(languageCode), currentDateByLanguage.get(defaultLanguageCode));
                String resolvedDescription = languageCode.equals(defaultLanguageCode)
                    ? currentDescriptionByLanguage.get(languageCode)
                    : firstNonNull(currentDescriptionByLanguage.get(languageCode), currentDescriptionByLanguage.get(defaultLanguageCode));

                Map<String, Object> translationData = new LinkedHashMap<>();
                translationData.put("displayedDate", resolvedDate);
                translationData.put("displayedTitle", resolvedTitle);
                translationData.put("displayedDescription", resolvedDescription);
                translations.put(languageCode, translationData);
            }

            Map<String, Object> resolvedReveal = new LinkedHashMap<>();
            resolvedReveal.put("translations", translations);
            resolvedReveal.put(
                "narrativeTimeframeSpecificityLevel",
                calculateNarrativeTimeframeSpecificityLevel(
                    currentDateByLanguage.get(defaultLanguageCode),
                    event.getNarrativeDate() != null ? event.getNarrativeDate().toLocalDate().toString() : null
                )
            );
            resolvedByReveal.put(reveal.getId(), resolvedReveal);
        }

        return resolvedByReveal;
    }

    private Integer calculateNarrativeTimeframeSpecificityLevel(String displayedDate, String fallbackNarrativeDate) {
        String value = firstNonNull(displayedDate, fallbackNarrativeDate);
        if (value == null || value.isBlank()) {
            return 0;
        }

        String trimmedValue = value.trim();
        String lowerValue = trimmedValue.toLowerCase(Locale.ROOT);

        if (trimmedValue.matches("^\\d{1,4}[/-]\\d{1,2}[/-]\\d{1,4}$")) {
            return 9;
        }

        String monthNames = "(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)";
        if (trimmedValue.matches("(?i)^" + monthNames + "\\s+\\d{1,2},?\\s+\\d{4}$")) {
            return 9;
        }

        String modifiers = "(?:late|early|mid)";
        if (trimmedValue.matches("(?i)^" + modifiers + "\\s+" + monthNames + "\\s*,?\\s*\\d{4}$")) {
            return 8;
        }
        if (trimmedValue.matches("(?i)^" + monthNames + "\\s*,?\\s*\\d{4}$")) {
            return 7;
        }

        String seasons = "(?:spring|summer|fall|autumn|winter)";
        if (trimmedValue.matches("(?i)^" + modifiers + "\\s+" + seasons + "\\s*,?\\s*\\d{4}$")) {
            return 6;
        }
        if (trimmedValue.matches("(?i)^" + seasons + "\\s*,?\\s*\\d{4}$")) {
            return 5;
        }
        if (trimmedValue.matches("(?i)^" + modifiers + "\\s+\\d{4}$")) {
            return 4;
        }
        if (trimmedValue.matches("^\\d{4}$")) {
            return 3;
        }
        if (trimmedValue.matches("(?i)^" + modifiers + "\\s+\\d{3}0s$")) {
            return 2;
        }
        if (trimmedValue.matches("^\\d{3}0s$")) {
            return 1;
        }
        if (lowerValue.matches("^(?:sometime\\s+in\\s+the\\s+future|future|unknown|tbd|later|eventually)$")) {
            return 0;
        }

        return -1;
    }

    private boolean hasNonEmptyString(String value) {
        return value != null && !value.isEmpty();
    }

    private boolean hasValue(String value) {
        return value != null;
    }

    private String firstNonNull(String primary, String fallback) {
        return primary != null ? primary : fallback;
    }
}
