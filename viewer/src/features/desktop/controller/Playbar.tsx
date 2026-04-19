import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import './controller.css';

interface PlaybarProps {
  currentTime: number;
  totalDuration: number;
  onTimeChange: (newTime: number) => void;
  updateScrubbingLocation: (newLocation: number) => void;
  isScrubbing: boolean;
  onDragChange?: (isDragging: boolean) => void;
  episodes?: Array<{ id: string; episodeNumber: number; title: string; duration: number }>;
  episodeLabel?: string;
  showEpisodeMarkers?: boolean;
  /** Scrub bar drag on the track (not episode markers). */
  onScrubInteraction?: (payload: { phase: 'start' | 'end'; time_seconds: number }) => void;
  /** Episode markers or End marker above the scrub bar. */
  onEpisodeMarkerClick?: (payload: {
    marker: 'episode' | 'end';
    episode_id?: string;
    episode_number?: number;
    start_time_seconds: number;
  }) => void;
}

const Playbar: React.FC<PlaybarProps> = ({
  currentTime,
  totalDuration,
  onTimeChange,
  updateScrubbingLocation,
  isScrubbing,
  onDragChange,
  episodes = [],
  episodeLabel = 'Ep',
  showEpisodeMarkers = true,
  onScrubInteraction,
  onEpisodeMarkerClick,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draftTime, setDraftTime] = useState<number | null>(null);
  const lastScrubTimeSecondsRef = useRef(0);

  // Calculate playhead position as percentage
  const displayedTime = draftTime ?? currentTime;
  const playheadPosition = totalDuration > 0 ? (displayedTime / totalDuration) * 100 : 0;

  // Calculate episode start positions
  const episodeMarkers = useMemo(() => episodes.map((episode, index) => {
    const startTime = episodes
      .slice(0, index)
      .reduce((sum, ep) => sum + ep.duration, 0);
    const position = totalDuration > 0 ? (startTime / totalDuration) * 100 : 0;
    return {
      ...episode,
      startTime,
      position
    };
  }), [episodes, totalDuration]);

  const beginDragging = useCallback((timeSeconds: number) => {
    if (isDragging) return;
    setIsDragging(true);
    onDragChange?.(true);
    onScrubInteraction?.({
      phase: 'start',
      time_seconds: timeSeconds,
    });
  }, [isDragging, onDragChange, onScrubInteraction]);

  const stopDragging = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    onDragChange?.(false);
    onScrubInteraction?.({
      phase: 'end',
      time_seconds: lastScrubTimeSecondsRef.current,
    });
  }, [isDragging, onDragChange, onScrubInteraction]);

  const handleRangeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    lastScrubTimeSecondsRef.current = newTime;
    if (!isDragging) {
      beginDragging(newTime);
    }
    setDraftTime(newTime);
    updateScrubbingLocation(newTime);
  }, [beginDragging, isDragging, updateScrubbingLocation]);

  // Handle episode marker click
  const handleEpisodeClick = useCallback(
    (episode: (typeof episodeMarkers)[0]) => {
      updateScrubbingLocation(episode.startTime);
      onEpisodeMarkerClick?.({
        marker: 'episode',
        episode_id: episode.id,
        episode_number: episode.episodeNumber,
        start_time_seconds: episode.startTime,
      });
    },
    [onEpisodeMarkerClick, updateScrubbingLocation]
  );

  useEffect(() => {
    return () => {
      stopDragging();
    };
  }, [stopDragging]);

  useEffect(() => {
    if (!isDragging && !isScrubbing) {
      setDraftTime(null);
    }
  }, [currentTime, isDragging, isScrubbing]);

  return (
    <div className="playbar-container">
      {/* Episode Markers - positioned above */}
      <div className={`episode-markers-container${showEpisodeMarkers ? '' : ' episode-markers-container--hidden'}`}>
        {episodeMarkers.map((episode) => (
          <div
            key={episode.id}
            className={`episode-marker ${episode.position === 0 ? '' : 'shifted'}`}
            style={{ 
              left: episode.position === 0 ? '0%' : `${episode.position}%`
            }}
            onClick={() => handleEpisodeClick(episode)}
          >
            <div className="episode-marker-label">
              <div className="episode-marker-badge">
                {episodeLabel} {episode.episodeNumber}
              </div>
              {/* Connecting line */}
              <div className="episode-marker-line"></div>
            </div>
          </div>
        ))}
        
        {/* End marker - right aligned */}
        <div 
          className="end-marker"
          onClick={() => {
            updateScrubbingLocation(totalDuration);
            onEpisodeMarkerClick?.({
              marker: 'end',
              start_time_seconds: totalDuration,
            });
          }}
        >
          <div className="end-marker-label">
            <div className="end-marker-badge">
              End
            </div>
            {/* Connecting line */}
            <div className="end-marker-line"></div>
          </div>
        </div>
      </div>

      {/* Playbar - centered with other controls */}
      <div className="playbar-track">
        <div
          className="playbar-progress"
          style={{ width: `${playheadPosition}%` }}
        />
        <input
          type="range"
          min={0}
          max={Math.max(totalDuration, 0)}
          step={1}
          value={Math.round(displayedTime)}
          className={`playbar-range ${isDragging ? 'dragging' : ''}`}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          onBlur={stopDragging}
          onChange={handleRangeChange}
          aria-label="Timeline scrubber"
        />
      </div>
    </div>
  );
};

export default Playbar;