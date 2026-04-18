import React from 'react';
import { Trash2 } from 'lucide-react';
import { CardField, PlaytimeSelector } from './index';
import { RevealCardData } from './RevealCard.types';

interface RevealCardHeaderProps {
    reveal: RevealCardData;
    events: Array<{ id: number; shortDescription: string; timelineId: number }>;
    episodes: Array<{ id: number; number: number; title: string }>;
    timelines: Array<{ id: number; shortId: string; title: string }>;
    onUpdate: (revealId: number, field: string, value: any) => void;
    onDelete: (revealId: number) => void;
    displayedDatePlaceholder?: string;
    displayedTitlePlaceholder?: string;
}

const RevealCardHeader: React.FC<RevealCardHeaderProps> = ({
    reveal,
    events,
    episodes,
    timelines,
    onUpdate,
    onDelete,
    displayedDatePlaceholder,
    displayedTitlePlaceholder
}) => {
    const timelineOptions = timelines.map((timeline) => ({
        value: timeline.id,
        label: timeline.shortId
    }));

    const eventOptions = events.map((event) => {
        const timeline = timelines.find((entry) => entry.id === event.timelineId);
        return {
            value: event.id,
            label: `${timeline?.shortId || 'Unknown'} - ${event.shortDescription}`
        };
    });

    return (
        <div className="reveal-card-header">
            <div className="reveal-card-fields-header">
                <CardField
                    label="Event"
                    value={reveal.eventId || ''}
                    type="select"
                    onChange={(value) => {
                        if (value !== null) {
                            onUpdate(reveal.id, 'eventId', parseInt(value.toString(), 10));
                        }
                    }}
                    options={[
                        { value: '', label: 'Select event' },
                        ...eventOptions
                    ]}
                    className="reveal-header-field"
                    title="Move this reveal to a different event"
                />

                <CardField
                    label="Apparent Timeline"
                    value={reveal.apparentTimelineId || ''}
                    type="select"
                    onChange={(value) => onUpdate(reveal.id, 'apparentTimelineId', value ? parseInt(value.toString(), 10) : null)}
                    options={[
                        { value: '', label: 'None' },
                        ...timelineOptions
                    ]}
                    className="reveal-header-field"
                />

                <CardField
                    label="Episode & Time"
                    value=""
                    onChange={() => {}}
                    className="reveal-header-field"
                    customComponent={
                        <PlaytimeSelector
                            episodeId={reveal.episodeId}
                            episodeTime={reveal.episodeTime}
                            episodes={episodes}
                            onEpisodeChange={(episodeId) => onUpdate(reveal.id, 'episodeId', episodeId)}
                            onTimeChange={(timeInSeconds) => onUpdate(reveal.id, 'episodeTime', timeInSeconds)}
                        />
                    }
                />

                <CardField
                    label="Displayed Date"
                    value={reveal.displayedDate || ''}
                    onChange={(value) => onUpdate(reveal.id, 'displayedDate', value)}
                    placeholder={displayedDatePlaceholder ? `↓ ${displayedDatePlaceholder}` : undefined}
                    className={`reveal-header-field ${displayedDatePlaceholder ? 'inherited-placeholder' : ''}`}
                />

                <CardField
                    label="Displayed Title"
                    value={reveal.displayedTitle || ''}
                    onChange={(value) => onUpdate(reveal.id, 'displayedTitle', value)}
                    placeholder={displayedTitlePlaceholder ? `↓ ${displayedTitlePlaceholder}` : undefined}
                    className={`reveal-header-field ${displayedTitlePlaceholder ? 'inherited-placeholder' : ''}`}
                />
            </div>

            <div className="reveal-card-actions">
                <button
                    onClick={() => onDelete(reveal.id)}
                    className="reveal-action-btn reveal-delete-btn"
                    title="Delete reveal"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

export default RevealCardHeader;
