import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createRecord, getTableData } from '../api/client';

interface EventCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newEvent: any) => void;
    timelines: any[];
}

interface EventFormData {
    timelineId: string;
    shortDescription: string;
    narrativeDate: string;
}

const EventCreationModal: React.FC<EventCreationModalProps> = ({ 
    isOpen, 
    onClose, 
    onSuccess, 
    timelines 
}) => {
    const [formData, setFormData] = useState<EventFormData>({
        timelineId: '',
        shortDescription: '',
        narrativeDate: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setFormData({
                timelineId: '',
                shortDescription: '',
                narrativeDate: ''
            });
            setError(null);
        }
    }, [isOpen]);

    const handleInputChange = (field: keyof EventFormData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!formData.timelineId || !formData.shortDescription || !formData.narrativeDate) {
            setError('All fields are required');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const eventData = {
                timelineId: parseInt(formData.timelineId),
                shortDescription: formData.shortDescription.trim(),
                narrativeDate: formData.narrativeDate
            };

            const newEvent = await createRecord('event', eventData);
            onSuccess(newEvent);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create event');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
                <div className="modal-header">
                    <h2>Create New Event</h2>
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
                        <label htmlFor="timelineId">Timeline *</label>
                        <select
                            id="timelineId"
                            value={formData.timelineId}
                            onChange={(e) => handleInputChange('timelineId', e.target.value)}
                            required
                            disabled={isSubmitting}
                        >
                            <option value="">Select a timeline</option>
                            {timelines.map(timeline => (
                                <option key={timeline.id} value={timeline.id}>
                                    {timeline.shortId}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="shortDescription">Description *</label>
                        <input
                            type="text"
                            id="shortDescription"
                            value={formData.shortDescription}
                            onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                            placeholder="Enter event description"
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="narrativeDate">Narrative Date *</label>
                        <input
                            type="datetime-local"
                            id="narrativeDate"
                            value={formData.narrativeDate}
                            onChange={(e) => handleInputChange('narrativeDate', e.target.value)}
                            required
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
                            {isSubmitting ? 'Creating...' : 'Create Event'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EventCreationModal;
