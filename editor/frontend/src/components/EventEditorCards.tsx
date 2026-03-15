import React, { useState, useEffect, useMemo } from 'react';
import { getTableData, updateRecord, deleteRecord } from '../api/client';
import { Plus, Play } from 'lucide-react';
import { EditorHeader, CardEditor, CardField, RevealCard, PlaytimeSelector, TagSelector, RichTextEditor } from './widgets';
import EventCreationModal from './EventCreationModal';
import RevealCreationModal from './RevealCreationModal';

interface Event {
    id: number;
    timelineId: number;
    shortDescription: string;
    narrativeDate: string;
    notes?: string;
    eventTypeId?: number;
    linkedEventId?: number;
    ostTrackId?: number;
    tags?: Array<{ id: number; tag: string }>;
}

interface Reveal {
    id: number;
    eventId: number;
    apparentTimelineId?: number;
    episodeId: number;
    episodeTime: number;
    displayedDate?: string;
    displayedTitle?: string;
    displayedDescription?: string;
    screenshotFilename?: string;
}

interface Timeline {
    id: number;
    shortId: string;
    title: string;
}

interface EventType {
    id: number;
    type: string;
}

interface Soundtrack {
    id: number;
    title: string;
    youtubeLink: string;
}

interface Episode {
    id: number;
    number: number;
    title: string;
    duration: number;
}

interface Tag {
    id: number;
    tag: string;
}

const EventEditorCards: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [allEvents, setAllEvents] = useState<Event[]>([]); // All events for mentions
    const [reveals, setReveals] = useState<Reveal[]>([]);
    const [timelines, setTimelines] = useState<Timeline[]>([]);
    const [eventTypes, setEventTypes] = useState<EventType[]>([]);
    const [soundtracks, setSoundtracks] = useState<Soundtrack[]>([]);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTimeline, setFilterTimeline] = useState<number | null>(null);
    const [filterTag, setFilterTag] = useState<number | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRevealCreateModal, setShowRevealCreateModal] = useState(false);
    const [selectedEventForReveal, setSelectedEventForReveal] = useState<number | null>(null);
    const [sortBy, setSortBy] = useState<'timeline-date' | 'playtime'>('playtime');

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [eventsData, allEventsData, revealsData, timelinesData, eventTypesData, soundtracksData, episodesData, tagsData] = await Promise.all([
                getTableData('event', searchTerm),
                getTableData('event'), // All events without search filter
                getTableData('reveal'),
                getTableData('timeline'),
                getTableData('event_type'),
                getTableData('soundtrack'),
                getTableData('episode'),
                getTableData('tag')
            ]);

            const events = Array.isArray(eventsData) ? eventsData : [];
            const allEvents = Array.isArray(allEventsData) ? allEventsData : [];
            
            setEvents(events);
            setAllEvents(allEvents);
            setReveals(Array.isArray(revealsData) ? revealsData : []);
            setTimelines(Array.isArray(timelinesData) ? timelinesData : []);
            setEventTypes(Array.isArray(eventTypesData) ? eventTypesData : []);
            setSoundtracks(Array.isArray(soundtracksData) ? soundtracksData : []);
            setEpisodes(Array.isArray(episodesData) ? episodesData : []);
            setTags(Array.isArray(tagsData) ? tagsData : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [searchTerm]);

    // Memoized lookup maps for better performance
    const timelineMap = useMemo(() => {
        const map = new Map();
        timelines.forEach(t => map.set(t.id, t.shortId));
        return map;
    }, [timelines]);


    const soundtrackMap = useMemo(() => {
        const map = new Map();
        soundtracks.forEach(s => map.set(s.id, s));
        return map;
    }, [soundtracks]);

    const episodeMap = useMemo(() => {
        const map = new Map();
        episodes.forEach(e => map.set(e.id, e));
        return map;
    }, [episodes]);

    // Memoized events list for dropdown performance
    const eventsForDropdown = useMemo(() => {
        return events.map(linkedEvent => {
            const timeline = timelineMap.get(linkedEvent.timelineId);
            return {
                id: linkedEvent.id,
                label: `${timeline} - ${linkedEvent.shortDescription}`
            };
        });
    }, [events, timelineMap]);


    // Create events for mention functionality
    const eventsForMention = useMemo(() => {
        if (!Array.isArray(allEvents)) return [];
        return allEvents.map(event => {
            const timeline = timelineMap.get(event.timelineId);
            return {
                id: event.id,
                shortDescription: event.shortDescription,
                timelineId: timeline,
                narrativeDate: event.narrativeDate
            };
        });
    }, [allEvents, timelineMap]);

    // Handle navigation to events when clicking mentions
    const handleEventClick = (eventId: number) => {
        // Clear search filter to make the event visible
        setSearchTerm('');
        
        // Scroll to the event after a short delay to allow re-render
        setTimeout(() => {
            // Look for the CardEditor component, not the mention span
            const eventElement = document.querySelector(`.card-editor[data-event-id="${eventId}"]`);
            
            if (eventElement) {
                eventElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Check if card is already expanded by looking for the content div
                const contentElement = eventElement.querySelector('.card-editor-content');
                const isExpanded = contentElement !== null;
                
                // Only expand the card if it's not already expanded
                const toggleButton = eventElement.querySelector('.card-editor-toggle');
                
                if (toggleButton && !isExpanded) {
                    (toggleButton as HTMLButtonElement).click();
                }
                
                // Add a temporary highlight
                eventElement.classList.add('ring-2', 'ring-blue-500');
                setTimeout(() => {
                    eventElement.classList.remove('ring-2', 'ring-blue-500');
                }, 2000);
            }
        }, 100);
    };

    // Filter and sort events based on search term, filters, and sort option
    const filteredEvents = useMemo(() => {
        let filtered = events;
        
        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(event =>
                event.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
                timelineMap.get(event.timelineId)?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Apply timeline filter
        if (filterTimeline !== null) {
            filtered = filtered.filter(event => event.timelineId === filterTimeline);
        }
        
        // Apply tag filter
        if (filterTag !== null) {
            filtered = filtered.filter(event => 
                event.tags?.some(tag => tag.id === filterTag)
            );
        }
        
        // Apply sorting
        return filtered.sort((a, b) => {
            if (sortBy === 'timeline-date') {
                // Sort by timeline first, then by narrative date
                const timelineA = timelineMap.get(a.timelineId) || '';
                const timelineB = timelineMap.get(b.timelineId) || '';
                
                if (timelineA !== timelineB) {
                    return timelineA.localeCompare(timelineB);
                }
                
                // Same timeline, sort by narrative date
                return new Date(a.narrativeDate).getTime() - new Date(b.narrativeDate).getTime();
            } else if (sortBy === 'playtime') {
                // Sort by first reveal's episode + playtime
                const revealsA = reveals.filter(reveal => reveal.eventId === a.id);
                const revealsB = reveals.filter(reveal => reveal.eventId === b.id);
                
                if (revealsA.length === 0 && revealsB.length === 0) return 0;
                if (revealsA.length === 0) return 1;
                if (revealsB.length === 0) return -1;
                
                const firstRevealA = revealsA[0];
                const firstRevealB = revealsB[0];
                
                const episodeA = episodeMap.get(firstRevealA.episodeId);
                const episodeB = episodeMap.get(firstRevealB.episodeId);
                
                if (!episodeA || !episodeB) return 0;
                
                // Sort by episode number first
                if (episodeA.number !== episodeB.number) {
                    return episodeA.number - episodeB.number;
                }
                
                // Same episode, sort by playtime
                return firstRevealA.episodeTime - firstRevealB.episodeTime;
            }
            
            return 0;
        });
    }, [events, searchTerm, filterTimeline, filterTag, timelineMap, sortBy, episodeMap, reveals]);


    const handleFieldUpdate = async (field: string, value: any, eventId: number) => {
        try {
            const currentEvent = events.find(e => e.id === eventId);
            if (!currentEvent) return;

            const updatedEvent = { ...currentEvent, [field]: value };
            
            // Optimistic update - update UI immediately
            setEvents(prevEvents =>
                prevEvents.map(event =>
                    event.id === eventId ? updatedEvent : event
                )
            );

            // Then update the backend
            await updateRecord('event', eventId.toString(), updatedEvent);
        } catch (error) {
            console.error('Failed to update event:', error);
            // Revert optimistic update on error
            await fetchData();
        }
    };

    const handleDelete = async (eventId: number) => {
        if (!confirm('Are you sure you want to delete this event? This will also delete all associated reveals.')) {
            return;
        }

        try {
            await deleteRecord('event', eventId.toString());
            await fetchData();
        } catch (err) {
            alert('Failed to delete event: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const handleCreate = () => {
        setShowCreateModal(true);
    };

    const handleCreateSuccess = (newEvent: Event) => {
        setEvents(prevEvents => [...prevEvents, newEvent]);
        setShowCreateModal(false);
    };

    const handleCreateCancel = () => {
        setShowCreateModal(false);
    };

    const playSoundtrack = (soundtrackId: number) => {
        const soundtrack = soundtrackMap.get(soundtrackId);
        if (soundtrack?.youtubeLink) {
            window.open(soundtrack.youtubeLink, '_blank');
        }
    };

    const handleRevealUpdate = async (revealId: number, field: string, value: any) => {
        try {
            const reveal = reveals.find(r => r.id === revealId);
            if (!reveal) return;

            const updatedReveal = { ...reveal, [field]: value };
            
            // Optimistic update - update UI immediately
            setReveals(prevReveals => 
                prevReveals.map(r => r.id === revealId ? updatedReveal : r)
            );

            // Then update the backend
            await updateRecord('reveal', revealId.toString(), updatedReveal);
        } catch (error) {
            console.error('Failed to update reveal:', error);
            // Revert optimistic update on error
            await refreshDataInBackground();
        }
    };

    const handleRevealDelete = async (revealId: number) => {
        if (!confirm('Are you sure you want to delete this reveal?')) {
            return;
        }

        try {
            await deleteRecord('reveal', revealId.toString());
            setReveals(prevReveals => prevReveals.filter(r => r.id !== revealId));
        } catch (error) {
            console.error('Failed to delete reveal:', error);
            alert('Failed to delete reveal: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    const handleAddReveal = (eventId: number) => {
        setSelectedEventForReveal(eventId);
        setShowRevealCreateModal(true);
    };

    const handleRevealCreateSuccess = (newReveal: any) => {
        setReveals(prevReveals => [...prevReveals, newReveal]);
        setShowRevealCreateModal(false);
        setSelectedEventForReveal(null);
    };

    const handleRevealCreateCancel = () => {
        setShowRevealCreateModal(false);
        setSelectedEventForReveal(null);
    };

    const refreshDataInBackground = async () => {
        try {
            const [eventsData, revealsData] = await Promise.all([
                getTableData('event', searchTerm),
                getTableData('reveal')
            ]);

            const events = Array.isArray(eventsData) ? eventsData : [];
            
            setEvents(events);
            setReveals(Array.isArray(revealsData) ? revealsData : []);
        } catch (error) {
            console.error('Failed to refresh data in background:', error);
        }
    };

    const handleTagChange = async (eventId: number, tagIds: number[]) => {
        try {
            // Get current event tags
            const currentEvent = events.find(e => e.id === eventId);
            if (!currentEvent) return;

            const currentTagIds = currentEvent.tags?.map(tag => tag.id) || [];
            
            // Find tags to add and remove
            const tagsToAdd = tagIds.filter(id => !currentTagIds.includes(id));
            const tagsToRemove = currentTagIds.filter(id => !tagIds.includes(id));

            // Add new tags
            for (const tagId of tagsToAdd) {
                await fetch(`/api/tables/event/${eventId}/tags/${tagId}`, {
                    method: 'POST',
                });
            }

            // Remove old tags
            for (const tagId of tagsToRemove) {
                await fetch(`/api/tables/event/${eventId}/tags/${tagId}`, {
                    method: 'DELETE',
                });
            }

            // Refresh the specific event to get updated tags
            try {
                const updatedEventResponse = await fetch(`/api/tables/event/${eventId}`);
                if (updatedEventResponse.ok) {
                    const updatedEvent = await updatedEventResponse.json();
                    setEvents(prevEvents => 
                        prevEvents.map(e => 
                            e.id === eventId ? updatedEvent : e
                        )
                    );
                }
            } catch (error) {
                console.error('Failed to refresh event tags:', error);
            }

        } catch (error) {
            console.error('Failed to update event tags:', error);
            // Refresh data on error
            await refreshDataInBackground();
        }
    };

    const getRevealsForEvent = (eventId: number) => {
        return reveals.filter(reveal => reveal.eventId === eventId);
    };

    // Find earlier sibling reveal based on playtime (episode + episodeTime) within the same event
    const findEarlierSiblingReveal = (currentReveal: Reveal): Reveal | null => {
        // Only consider reveals from the same event
        const eventReveals = reveals.filter(reveal => reveal.eventId === currentReveal.eventId);
        
        const sortedReveals = [...eventReveals].sort((a, b) => {
            const episodeA = episodeMap.get(a.episodeId);
            const episodeB = episodeMap.get(b.episodeId);
            
            if (!episodeA || !episodeB) return 0;
            
            // Sort by episode number first
            if (episodeA.number !== episodeB.number) {
                return episodeA.number - episodeB.number;
            }
            
            // Same episode, sort by playtime
            return a.episodeTime - b.episodeTime;
        });

        const currentIndex = sortedReveals.findIndex(r => r.id === currentReveal.id);
        if (currentIndex <= 0) return null;

        return sortedReveals[currentIndex - 1];
    };

    // Recursively find inherited placeholder value
    const getInheritedPlaceholder = (currentReveal: Reveal, field: 'displayedDate' | 'displayedTitle'): string => {
        const earlierSibling = findEarlierSiblingReveal(currentReveal);
        if (!earlierSibling) return '';

        const value = earlierSibling[field];
        if (value) return value;

        // Recursively look for earlier siblings
        return getInheritedPlaceholder(earlierSibling, field);
    };




    return (
        <div className="space-y-6">
            <EditorHeader
                title="Events"
                subtitle={`${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''}`}
                onAddClick={handleCreate}
                addButtonText="Add Event"
                searchConfig={{
                    placeholder: "Search events...",
                    value: searchTerm,
                    onChange: setSearchTerm
                }}
                filterConfigs={[
                    {
                        label: 'Timeline:',
                        value: filterTimeline,
                        onChange: (value) => setFilterTimeline(typeof value === 'number' ? value : null),
                        options: [
                            { value: null, label: 'All Timelines' },
                            ...timelines.map(t => ({ value: t.id, label: t.shortId }))
                        ]
                    },
                    {
                        label: 'Tag:',
                        value: filterTag,
                        onChange: (value) => setFilterTag(typeof value === 'number' ? value : null),
                        options: [
                            { value: null, label: 'All Tags' },
                            ...tags.map(t => ({ value: t.id, label: t.tag }))
                        ]
                    }
                ]}
                sortConfig={{
                    value: sortBy,
                    onChange: (value) => setSortBy(value as 'timeline-date' | 'playtime'),
                    options: [
                        { value: 'timeline-date', label: 'Timeline + Date' },
                        { value: 'playtime', label: 'Episode + Playtime' }
                    ]
                }}
            />

            {loading ? (
                <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading...</p>
                </div>
            ) : error ? (
                <div className="p-8 text-center text-red-600">
                    <p>{error}</p>
                    <button
                        onClick={fetchData}
                        className="mt-2 text-blue-600 hover:text-blue-800"
                    >
                        Try again
                    </button>
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="p-8 text-center text-gray-600">
                    <p>No events found</p>
                    {(searchTerm || filterTimeline !== null || filterTag !== null) && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setFilterTimeline(null);
                                setFilterTag(null);
                            }}
                            className="mt-2 text-blue-600 hover:text-blue-800"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredEvents.map((event) => {
                        const eventReveals = getRevealsForEvent(event.id);

                        return (
                            <CardEditor
                                key={event.id}
                                data-event-id={event.id.toString()}
                                onDelete={() => handleDelete(event.id)}
                                headerFields={
                                    <>
                                        <CardField
                                            label="Timeline"
                                            value={event.timelineId}
                                            type="select"
                                            options={timelines.map(t => ({ value: t.id, label: t.shortId }))}
                                            onChange={(value) => handleFieldUpdate('timelineId', parseInt(value.toString()), event.id)}
                                            className="w-1/12"
                                        />

                                        <CardField
                                            label="Description"
                                            value={event.shortDescription}
                                            onChange={(value) => handleFieldUpdate('shortDescription', value, event.id)}
                                            className="w-1/3"
                                        />

                                        <CardField
                                            label="Narrative Date"
                                            value={event.narrativeDate}
                                            onChange={(value) => handleFieldUpdate('narrativeDate', value, event.id)}
                                            className="w-1/6"
                                        />

                                        <div className="card-editor-composite-field" style={{ width: '20%', display: 'flex', gap: '0.5rem' }}>
                                            <div className="card-editor-field" style={{ flex: '0 0 auto' }}>
                                                <label>&nbsp;</label>
                                                <div className="input-container">
                                                    {event.ostTrackId ? (
                                                        <button
                                                            onClick={() => playSoundtrack(event.ostTrackId!)}
                                                            className="text-blue-600 hover:text-blue-900"
                                                            title="Play soundtrack"
                                                        >
                                                            <Play className="h-4 w-4" />
                                                        </button>
                                                    ) : (
                                                        <span>&nbsp;</span>
                                                    )}
                                                </div>
                                            </div>
                                            <CardField
                                                label="Soundtrack"
                                                value={event.ostTrackId || ''}
                                                type="select"
                                                onChange={(value) => handleFieldUpdate('ostTrackId', value ? parseInt(value.toString()) : null, event.id)}
                                                options={[
                                                    { value: '', label: 'None' },
                                                    ...soundtracks.map(s => ({ value: s.id, label: s.title }))
                                                ]}
                                            />
                                        </div>

                                        <CardField
                                            label="Reveals"
                                            value={`${eventReveals.length} reveal${eventReveals.length !== 1 ? 's' : ''}`}
                                            disabled
                                            className="w-1/12"
                                        />

                                        <CardField
                                            label="First Reveal"
                                            value=""
                                            onChange={() => {}}
                                            className="w-1/10"
                                            customComponent={
                                                <PlaytimeSelector
                                                    episodeId={eventReveals.length > 0 ? eventReveals[0].episodeId : null}
                                                    episodeTime={eventReveals.length > 0 ? eventReveals[0].episodeTime : 0}
                                                    episodes={episodes}
                                                    onEpisodeChange={() => {}} // Read-only for display
                                                    onTimeChange={() => {}} // Read-only for display
                                                    disabled={true}
                                                />
                                            }
                                        />
                                    </>
                                }
                            >
                                {/* Second row - Event Type and Linked Event */}
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                    <CardField
                                        label="Event Type"
                                        value={event.eventTypeId || ''}
                                        type="select"
                                        options={[
                                            { value: '', label: 'None' },
                                            ...eventTypes.map(et => ({ value: et.id, label: et.type }))
                                        ]}
                                        onChange={(value) => handleFieldUpdate('eventTypeId', value ? parseInt(value.toString()) : null, event.id)}
                                        className="w-1/6"
                                    />

                                    <CardField
                                        label="Linked Event"
                                        value={event.linkedEventId || ''}
                                        type="select"
                                        options={[
                                            { value: '', label: 'None' },
                                            ...eventsForDropdown.filter(e => e.id !== event.id).map(e => ({ value: e.id, label: e.label }))
                                        ]}
                                        onChange={(value) => handleFieldUpdate('linkedEventId', value ? parseInt(value.toString()) : null, event.id)}
                                        className="w-1/6"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Notes
                                    </label>
                                    <RichTextEditor
                                        value={event.notes || ''}
                                        onChange={(value) => handleFieldUpdate('notes', value, event.id)}
                                        placeholder="Type @ to mention an event..."
                                        events={eventsForMention}
                                        onEventClick={handleEventClick}
                                    />
                                </div>

                                {/* Tags section */}
                                <div className="card-editor-field-full">
                                    <TagSelector
                                        selectedTagIds={event.tags?.map(tag => tag.id) || []}
                                        onTagsChange={(tagIds) => handleTagChange(event.id, tagIds)}
                                        className="w-full"
                                    />
                                </div>

                                {/* Reveals section */}
                                <div className="card-editor-field-full">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <label>Reveals</label>
                                        <button
                                            onClick={() => handleAddReveal(event.id)}
                                            className="text-blue-600 hover:text-blue-900 text-sm"
                                        >
                                            <Plus className="h-4 w-4 inline mr-1" />
                                            Add Reveal
                                        </button>
                                    </div>

                                    {eventReveals.length === 0 ? (
                                        <div className="text-gray-500 text-sm italic">
                                            No reveals yet. Click "Add Reveal" to create one.
                                        </div>
                                    ) : (
                                        <div className="reveals-container">
                                            {eventReveals.map((reveal) => (
                                                <RevealCard
                                                    key={reveal.id}
                                                    reveal={reveal}
                                                    events={events}
                                                    episodes={episodes}
                                                    timelines={timelines}
                                                    onUpdate={handleRevealUpdate}
                                                    onDelete={handleRevealDelete}
                                                    displayedDatePlaceholder={getInheritedPlaceholder(reveal, 'displayedDate')}
                                                    displayedTitlePlaceholder={getInheritedPlaceholder(reveal, 'displayedTitle')}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardEditor>
                        );
                    })}
                </div>
            )}

            <EventCreationModal
                isOpen={showCreateModal}
                onClose={handleCreateCancel}
                onSuccess={handleCreateSuccess}
                timelines={timelines}
            />

            <RevealCreationModal
                isOpen={showRevealCreateModal}
                onClose={handleRevealCreateCancel}
                onSuccess={handleRevealCreateSuccess}
                events={events}
                episodes={episodes}
                timelines={timelines}
                defaultEventId={selectedEventForReveal || undefined}
                displayedDatePlaceholder=""
                displayedTitlePlaceholder=""
            />
        </div>
    );
};

export default EventEditorCards;
