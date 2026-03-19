import React, { useState, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import './controller.css';

interface EpisodeTimeSelectorProps {
  currentTime: number;
  onTimeChange: (newTime: number) => void;
  episodes?: Array<{ id: string; episodeNumber: number; title: string; duration: number }>;
  selectedEpisode?: string;
  onEpisodeChange?: (episodeId: string) => void;
  updateScrubbingLocation: (newLocation: number) => void;
  /** Stack ep + time vertically, single control flush right (for mobile) */
  compact?: boolean;
}

const EpisodeTimeSelector: React.FC<EpisodeTimeSelectorProps> = ({ 
  currentTime, 
  onTimeChange, 
  episodes = [],
  selectedEpisode,
  onEpisodeChange,
  updateScrubbingLocation,
  compact = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Calculate which episode we're currently in and time within that episode
  const getCurrentEpisodeAndTime = () => {
    let cumulativeTime = 0;
    
    for (const episode of episodes) {
      const episodeEndTime = cumulativeTime + episode.duration;
      
      if (currentTime < episodeEndTime) {
        // We're in this episode
        const timeInEpisode = currentTime - cumulativeTime;
        return {
          episodeId: episode.id,
          episodeNumber: episode.episodeNumber,
          timeInEpisode: Math.max(0, timeInEpisode)
        };
      }
      
      cumulativeTime = episodeEndTime;
    }
    
    // If we're past all episodes, return the last episode
    const lastEpisode = episodes[episodes.length - 1];
    return {
      episodeId: lastEpisode?.id || '',
      episodeNumber: lastEpisode?.episodeNumber || 1,
      timeInEpisode: lastEpisode?.duration || 0
    };
  };

  // Format time as hh:mm:ss or mm:ss (shows hours only when needed)
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const { episodeId, episodeNumber, timeInEpisode } = getCurrentEpisodeAndTime();

  // Update input value when not editing
  useEffect(() => {
    if (!isEditing) {
      setInputValue(formatTime(timeInEpisode));
    }
  }, [timeInEpisode, isEditing]);

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleTimeInputBlur = () => {
    setIsEditing(false);
    
    // Parse hh:mm:ss or mm:ss format and convert to seconds within the episode
    const timeStr = inputValue;
    
    // Validate input format (hh:mm:ss, mm:ss, or just numbers)
    // More specific pattern to distinguish between hh:mm:ss and mm:ss
    const hhmmssPattern = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/;
    const mmssPattern = /^(\d{1,2}):(\d{1,2})$/;
    
    let hours = 0;
    let mins = 0;
    let secs = 0;
    
    if (hhmmssPattern.test(timeStr)) {
      // hh:mm:ss format
      const match = timeStr.match(hhmmssPattern);
      if (match) {
        hours = parseInt(match[1]) || 0;
        mins = parseInt(match[2]) || 0;
        secs = parseInt(match[3]) || 0;
      }
    } else if (mmssPattern.test(timeStr)) {
      // mm:ss format
      const match = timeStr.match(mmssPattern);
      if (match) {
        mins = parseInt(match[1]) || 0;
        secs = parseInt(match[2]) || 0;
      }
    } else {
      // Invalid format, reset to current time
      setInputValue(formatTime(timeInEpisode));
      return;
    }
    
    // Validate seconds (0-59)
    if (secs >= 60) {
      mins += Math.floor(secs / 60);
      secs = secs % 60;
    }
    
    // Validate minutes (0-59)
    if (mins >= 60) {
      hours += Math.floor(mins / 60);
      mins = mins % 60;
    }
    
    const requestedTimeInEpisode = hours * 3600 + mins * 60 + secs;
    
    // Get the selected episode's duration
    const selectedEpisode = episodes.find(ep => ep.id === episodeId);
    const maxTimeInEpisode = selectedEpisode?.duration || 0;
    
    // If time exceeds episode duration, clamp to last second
    const clampedTimeInEpisode = Math.min(requestedTimeInEpisode, maxTimeInEpisode);
    
    // Calculate absolute time by adding cumulative time of previous episodes
    let cumulativeTime = 0;
    for (const episode of episodes) {
      if (episode.id === episodeId) {
        break;
      }
      cumulativeTime += episode.duration;
    }
    
    const absoluteTime = cumulativeTime + clampedTimeInEpisode;
    
    // Set scrubbing location for smooth animation
    updateScrubbingLocation(absoluteTime);
    
    // Update input to show the actual value (in case it was clamped)
    setInputValue(formatTime(clampedTimeInEpisode));
  };

  const handleTimeInputFocus = () => {
    setIsEditing(true);
  };

  const handleEpisodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEpisodeId = e.target.value;
    onEpisodeChange?.(newEpisodeId);
    
    // Calculate the start time of the selected episode
    let cumulativeTime = 0;
    for (const episode of episodes) {
      if (episode.id === newEpisodeId) {
        // Jump to the beginning of this episode
        const newTime = cumulativeTime;
        
        // Set scrubbing location for smooth animation
        updateScrubbingLocation(newTime);
        
        break;
      }
      cumulativeTime += episode.duration;
    }
  };

  return (
    <div className={`episode-time-selector ${compact ? 'episode-time-selector--compact' : ''}`}>
      <div className={`episode-time-selector-container ${compact ? 'episode-time-selector-container--compact' : ''}`}>
        <select 
          className="episode-select"
          value={episodeId}
          onChange={handleEpisodeChange}
        >
          {episodes.map(episode => (
            <option key={episode.id} value={episode.id}>
              Ep {episode.episodeNumber}
            </option>
          ))}
        </select>
        {!compact && <div className="episode-time-divider"></div>}
        <input 
          className="episode-time-input" 
          placeholder="mm:ss"
          maxLength={8}
          value={inputValue}
          onChange={handleTimeInputChange}
          onFocus={handleTimeInputFocus}
          onBlur={handleTimeInputBlur}
        />
      </div>
    </div>
  );
};

export default EpisodeTimeSelector; 