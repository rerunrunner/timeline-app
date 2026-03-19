import React, { useState, useRef, useCallback, useEffect } from 'react';
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
}

const Playbar: React.FC<PlaybarProps> = ({ currentTime, totalDuration, onTimeChange, updateScrubbingLocation, isScrubbing, onDragChange, episodes = [], episodeLabel = "Ep" }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [animatedTime, setAnimatedTime] = useState(currentTime);
  const playbarRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const animationRef = useRef<number>();
  const previousTimeRef = useRef(currentTime);

  // Calculate playhead position as percentage
  const playheadPosition = totalDuration > 0 ? (animatedTime / totalDuration) * 100 : 0;

  // Calculate episode start positions
  const episodeMarkers = episodes.map((episode, index) => {
    const startTime = episodes
      .slice(0, index)
      .reduce((sum, ep) => sum + ep.duration, 0);
    const position = (startTime / totalDuration) * 100;
    return {
      ...episode,
      startTime,
      position
    };
  });

  const updateTimeFromClientX = useCallback((clientX: number) => {
    if (!playbarRef.current || totalDuration <= 0) return;

    const rect = playbarRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const newTime = (percentage / 100) * totalDuration;

    updateScrubbingLocation(newTime);
  }, [totalDuration, updateScrubbingLocation]);

  // Handle pointer down on playbar
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    activePointerIdRef.current = e.pointerId;
    onDragChange?.(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateTimeFromClientX(e.clientX);
  }, [onDragChange, updateTimeFromClientX]);

  // Handle pointer move during drag
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || activePointerIdRef.current !== e.pointerId) return;
    updateTimeFromClientX(e.clientX);
  }, [isDragging, updateTimeFromClientX]);

  // Handle pointer up to end drag
  const stopDragging = useCallback((pointerId?: number) => {
    if (pointerId !== undefined && activePointerIdRef.current !== pointerId) return;

    setIsDragging(false);
    activePointerIdRef.current = null;
    onDragChange?.(false);
  }, [onDragChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    stopDragging(e.pointerId);
  }, [stopDragging]);

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    stopDragging(e.pointerId);
  }, [stopDragging]);

  // Handle episode marker click
  const handleEpisodeClick = useCallback((episode: typeof episodeMarkers[0]) => {
    updateScrubbingLocation(episode.startTime);
  }, [updateScrubbingLocation]);

  useEffect(() => {
    return () => {
      stopDragging();
    };
  }, [stopDragging]);

  // Smooth animation between time updates
  useEffect(() => {
    
    // If dragging or scrubbing, use currentTime directly (no animation)
    if (isDragging || isScrubbing) {
      setAnimatedTime(currentTime);
      previousTimeRef.current = currentTime;
      return;
    }

    // Only animate if we have a time change and we're not dragging or scrubbing
    if (!isDragging && !isScrubbing && currentTime !== previousTimeRef.current && !animationRef.current) {
      
      // Start smooth animation from previous to current time
      const startTime = previousTimeRef.current;
      const endTime = currentTime;
      const startTimestamp = performance.now();
      
      const animate = (timestamp: number) => {
        const elapsed = timestamp - startTimestamp;
        const progress = Math.min(elapsed / 1000, 1); // 1 second duration
        
        // Interpolate between start and end time
        const interpolatedTime = startTime + (endTime - startTime) * progress;
        setAnimatedTime(interpolatedTime);
        
        // Continue animation if not complete
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Animation complete, clear ref
          animationRef.current = undefined;
        }
      };

      animationRef.current = requestAnimationFrame(animate);
      previousTimeRef.current = currentTime;
    }

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    };
  }, [currentTime, isDragging, isScrubbing]);

  return (
    <div className="playbar-container">
      {/* Episode Markers - positioned above */}
      <div className="episode-markers-container">
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
          onClick={() => updateScrubbingLocation(totalDuration)}
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
      <div 
        ref={playbarRef}
        className="playbar-track"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* Progress bar */}
        <div 
          className="playbar-progress"
          style={{ width: `${playheadPosition}%` }}
        />
        {/* Playhead */}
        <div 
          className={`playbar-playhead ${isDragging ? 'dragging' : ''}`}
          style={{ 
            transform: `translateX(${playheadPosition}%)`
          }}
        />
      </div>
    </div>
  );
};

export default Playbar;