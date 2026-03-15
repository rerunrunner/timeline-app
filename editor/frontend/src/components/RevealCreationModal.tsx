import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createRecord } from '../api/client';

interface RevealCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newReveal: any) => void;
    events: Array<{ id: number; shortDescription: string; timelineId: number }>;
    episodes: Array<{ id: number; number: number; title: string }>;
    timelines: Array<{ id: number; shortId: string; title: string }>;
    defaultEventId?: number;
    displayedDatePlaceholder?: string;
    displayedTitlePlaceholder?: string;
}

interface RevealFormData {
    eventId: string;
    apparentTimelineId: string;
    episodeId: string;
    episodeTime: string;
    displayedDate: string;
    displayedTitle: string;
    displayedDescription: string;
    screenshotLink: string;
}

const RevealCreationModal: React.FC<RevealCreationModalProps> = ({ 
    isOpen, 
    onClose, 
    onSuccess, 
    events,
    episodes,
    timelines,
    defaultEventId,
    displayedDatePlaceholder,
    displayedTitlePlaceholder
}) => {
    const [formData, setFormData] = useState<RevealFormData>({
        eventId: '',
        apparentTimelineId: '',
        episodeId: '',
        episodeTime: '',
        displayedDate: '',
        displayedTitle: '',
        displayedDescription: '',
        screenshotLink: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setFormData({
                eventId: defaultEventId?.toString() || '',
                apparentTimelineId: '',
                episodeId: '',
                episodeTime: '',
                displayedDate: '',
                displayedTitle: '',
                displayedDescription: '',
                screenshotLink: ''
            });
            setError(null);
        }
    }, [isOpen, defaultEventId]);

    const handleInputChange = (field: keyof RevealFormData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        setError(null);
    };

    const parseEpisodeTime = (timeString: string): number => {
        const parts = timeString.split(':').map(Number);
        if (parts.length === 2) {
            // mm:ss format
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            // h:mm:ss format
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!formData.eventId || !formData.episodeId || !formData.episodeTime) {
            setError('Event, Episode, and Episode Time are required');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const revealData = {
                eventId: parseInt(formData.eventId),
                apparentTimelineId: formData.apparentTimelineId ? parseInt(formData.apparentTimelineId) : null,
                episodeId: parseInt(formData.episodeId),
                episodeTime: parseEpisodeTime(formData.episodeTime),
                displayedDate: formData.displayedDate.trim() || null,
                displayedTitle: formData.displayedTitle.trim() || null,
                displayedDescription: formData.displayedDescription.trim() || null,
                screenshotLink: formData.screenshotLink.trim() || null
            };

            const newReveal = await createRecord('reveal', revealData);
            onSuccess(newReveal);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create reveal');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    const eventOptions = events.map(event => {
        const timeline = timelines.find(tl => tl.id === event.timelineId);
        return {
            value: event.id,
            label: `${timeline?.shortId || 'Unknown'} - ${event.shortDescription}`
        };
    });

    const episodeOptions = episodes.map(ep => ({
        value: ep.id,
        label: `Episode ${ep.number}`
    }));

    const timelineOptions = timelines.map(tl => ({
        value: tl.id,
        label: tl.shortId
    }));

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
                <div className="modal-header">
                    <h2>Create New Reveal</h2>
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="modal-close"
                        disabled={isSubmitting}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="eventId">Event *</label>
                        <select
                            id="eventId"
                            value={formData.eventId}
                            onChange={(e) => handleInputChange('eventId', e.target.value)}
                            required
                            disabled={isSubmitting}
                        >
                            <option value="">Select an event</option>
                            {eventOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="apparentTimelineId">Apparent Timeline</label>
                        <select
                            id="apparentTimelineId"
                            value={formData.apparentTimelineId}
                            onChange={(e) => handleInputChange('apparentTimelineId', e.target.value)}
                            disabled={isSubmitting}
                        >
                            <option value="">None</option>
                            {timelineOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="episodeId">Episode *</label>
                        <select
                            id="episodeId"
                            value={formData.episodeId}
                            onChange={(e) => handleInputChange('episodeId', e.target.value)}
                            required
                            disabled={isSubmitting}
                        >
                            <option value="">Select an episode</option>
                            {episodeOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="episodeTime">Episode Time *</label>
                        <input
                            type="text"
                            id="episodeTime"
                            value={formData.episodeTime}
                            onChange={(e) => handleInputChange('episodeTime', e.target.value)}
                            placeholder="mm:ss or h:mm:ss"
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className={`form-group ${displayedDatePlaceholder ? 'inherited-placeholder' : ''}`}>
                        <label htmlFor="displayedDate">Displayed Date</label>
                        <input
                            type="text"
                            id="displayedDate"
                            value={formData.displayedDate}
                            onChange={(e) => handleInputChange('displayedDate', e.target.value)}
                            placeholder={displayedDatePlaceholder ? `↓ ${displayedDatePlaceholder}` : "e.g., 2024-01-15"}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className={`form-group ${displayedTitlePlaceholder ? 'inherited-placeholder' : ''}`}>
                        <label htmlFor="displayedTitle">Displayed Title</label>
                        <input
                            type="text"
                            id="displayedTitle"
                            value={formData.displayedTitle}
                            onChange={(e) => handleInputChange('displayedTitle', e.target.value)}
                            placeholder={displayedTitlePlaceholder ? `↓ ${displayedTitlePlaceholder}` : "Title for this reveal"}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="displayedDescription">Displayed Description</label>
                        <textarea
                            id="displayedDescription"
                            value={formData.displayedDescription}
                            onChange={(e) => handleInputChange('displayedDescription', e.target.value)}
                            placeholder="Description of this reveal"
                            rows={4}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="screenshotLink">Screenshot Link</label>
                        <input
                            type="url"
                            id="screenshotLink"
                            value={formData.screenshotLink}
                            onChange={(e) => handleInputChange('screenshotLink', e.target.value)}
                            placeholder="https://example.com/screenshot.jpg"
                            disabled={isSubmitting}
                        />
                    </div>

                    {error && (
                        <div className="form-error">
                            {error}
                        </div>
                    )}

                    <div className="form-actions">
                        <button 
                            type="button" 
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Reveal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RevealCreationModal;
