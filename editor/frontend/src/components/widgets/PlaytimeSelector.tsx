import React, { useState, useRef, useEffect } from 'react';

interface Episode {
  id: number;
  number: number;
  title?: string;
}

interface PlaytimeSelectorProps {
  episodeId: number | null;
  episodeTime: number; // Time in seconds
  episodes: Episode[];
  onEpisodeChange: (episodeId: number | null) => void;
  onTimeChange: (timeInSeconds: number) => void;
  disabled?: boolean;
  className?: string;
}

export const PlaytimeSelector: React.FC<PlaytimeSelectorProps> = ({
  episodeId,
  episodeTime,
  episodes,
  onEpisodeChange,
  onTimeChange,
  disabled = false,
  className = ''
}) => {
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editTimeValue, setEditTimeValue] = useState('');
  const [hasError, setHasError] = useState(false);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const formatEpisodeTime = (seconds: number): string => {
    if (!seconds || seconds === 0) return '00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const parseEpisodeTime = (timeString: string): number => {
    if (!timeString.trim()) return 0;
    
    const trimmed = timeString.trim();
    
    // Single regex to match all valid duration formats
    const timeRegex = /^\d{1,3}(?::\d{1,2}(?::\d{1,2})?)?$/;
    
    if (!timeRegex.test(trimmed)) {
      throw new Error('Invalid time format. Use: seconds (90), mm:ss (23:45), or h:mm:ss (1:23:45)');
    }
    
    const parts = trimmed.split(':').map(Number);
    
    if (parts.length === 1) {
      // Just seconds: "90"
      const seconds = parts[0];
      if (seconds < 0) throw new Error('Time cannot be negative');
      return seconds;
    } else if (parts.length === 2) {
      // Minutes:seconds: "23:45"
      const [minutes, seconds] = parts;
      if (minutes < 0 || seconds < 0) throw new Error('Time cannot be negative');
      if (seconds >= 60) throw new Error('Seconds must be less than 60');
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      // Hours:minutes:seconds: "1:23:45"
      const [hours, minutes, seconds] = parts;
      if (hours < 0 || minutes < 0 || seconds < 0) throw new Error('Time cannot be negative');
      if (minutes >= 60 || seconds >= 60) throw new Error('Minutes and seconds must be less than 60');
      return hours * 3600 + minutes * 60 + seconds;
    }
    
    throw new Error('Invalid time format');
  };

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow digits, colons, and spaces (for formatting)
    // Remove any other characters
    const filtered = value.replace(/[^\d:\s]/g, '');
    
    // Clean up multiple spaces and normalize
    const normalized = filtered.replace(/\s+/g, ' ').trim();
    
    setEditTimeValue(normalized);
  };

  const handleTimeClick = () => {
    if (!disabled && !isEditingTime) {
      setIsEditingTime(true);
      setEditTimeValue(formatEpisodeTime(episodeTime));
      setHasError(false);
      // Focus the input immediately after state update
      setTimeout(() => {
        if (timeInputRef.current) {
          timeInputRef.current.focus();
          timeInputRef.current.select();
        }
      }, 0);
    }
  };

  const handleTimeSave = () => {
    try {
      setHasError(false);
      
      const seconds = parseEpisodeTime(editTimeValue);
      
      // Additional validation: ensure the result is valid
      if (isNaN(seconds) || seconds < 0) {
        throw new Error('Invalid time format');
      }
      
      onTimeChange(seconds);
      setIsEditingTime(false);
    } catch (error) {
      console.error('Failed to save time:', error);
      // Show error state and revert to original value
      setHasError(true);
      setEditTimeValue(formatEpisodeTime(episodeTime));
      // Don't exit edit mode so user can fix the input
      
      // Clear error state after a short delay
      setTimeout(() => setHasError(false), 2000);
    }
  };

  const handleTimeCancel = () => {
    setIsEditingTime(false);
    setEditTimeValue('');
  };

  const handleTimeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTimeSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleTimeCancel();
    }
  };

  const handleTimeBlur = () => {
    // Only save on blur if the value has changed
    if (editTimeValue !== formatEpisodeTime(episodeTime)) {
      handleTimeSave();
    } else {
      handleTimeCancel();
    }
  };

  const handleEpisodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onEpisodeChange(value ? parseInt(value) : null);
  };

  const selectedEpisode = episodes.find(ep => ep.id === episodeId);

  return (
    <div className={`input-container playtime-selector ${className} ${disabled ? 'disabled' : ''}`}>
        <select
          value={episodeId || ''}
          onChange={handleEpisodeChange}
          disabled={disabled}
          className="input-widget"
          style={{
            color: disabled ? '#374151' : 'inherit',
            cursor: disabled ? 'default' : 'pointer'
          }}
        >
          <option value="">None</option>
          {episodes.map(episode => (
            <option key={episode.id} value={episode.id}>
              Ep {episode.number}
            </option>
          ))}
        </select>
      
        {isEditingTime && !disabled ? (
          <input
            ref={timeInputRef}
            type="text"
            value={editTimeValue}
            onChange={handleTimeInputChange}
            onKeyDown={handleTimeKeyDown}
            onBlur={handleTimeBlur}
            placeholder="hh:mm:ss"
            title="Press Enter to save, Esc to cancel"
            className="input-widget"
            style={{
              color: hasError ? '#dc2626' : 'inherit'
            }}
          />
        ) : (
          <span
            onClick={disabled ? undefined : handleTimeClick}
            className="input-widget"
            style={{ 
              color: disabled ? '#374151' : 'inherit',
              cursor: disabled ? 'default' : 'pointer'
            }}
            title={disabled ? '' : 'Click to edit time (Enter to save, Esc to cancel)'}
          >
            {formatEpisodeTime(episodeTime)}
          </span>
        )}
    </div>
  );
};
