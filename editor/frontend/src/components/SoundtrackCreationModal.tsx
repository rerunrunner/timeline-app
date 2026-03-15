import React, { useState } from 'react';
import { createRecord } from '../api/client';

interface SoundtrackCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  nextPosition?: number; // Position for the new soundtrack
}

const SoundtrackCreationModal: React.FC<SoundtrackCreationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  nextPosition = 0
}) => {
  const [title, setTitle] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      await createRecord('soundtrack', {
        position: nextPosition,
        title: title.trim(),
        youtubeLink: youtubeLink.trim() || null
      });
      
      // Reset form
      setTitle('');
      setYoutubeLink('');
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create soundtrack');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setYoutubeLink('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Create New Soundtrack</h2>
          <button onClick={handleCancel} className="modal-close">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter soundtrack title"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="youtubeLink">YouTube Link</label>
            <input
              type="url"
              id="youtubeLink"
              value={youtubeLink}
              onChange={(e) => setYoutubeLink(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
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
              onClick={handleCancel}
              disabled={isSubmitting}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? 'Creating...' : 'Create Soundtrack'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SoundtrackCreationModal;
