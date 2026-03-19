import React, { useState, useRef, useEffect } from 'react'
import type { Platform } from '../hooks/usePlatform'
import EpisodeTimeSelector from './controller/EpisodeTimeSelector'
import Playbar from './controller/Playbar'

interface ControllerProps {
  currentTime: number;
  onTimeChange: (newTime: number) => void;
  totalDuration: number; // Total duration in seconds
  episodes?: Array<{ id: string; episodeNumber: number; title: string; duration: number }>;
  episodeLabel?: string;
  platform?: Platform;
}

const SPEEDS_DESKTOP = [1, 60, 120, 600];
const SPEEDS_MOBILE = [1, 60, 600];

const Controller: React.FC<ControllerProps> = ({ currentTime, onTimeChange, totalDuration, episodes = [], episodeLabel, platform = 'computer' }) => {
  const isMobile = platform === 'mobile';
  const speeds = isMobile ? SPEEDS_MOBILE : SPEEDS_DESKTOP;
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [scrubbingLocation, setScrubbingLocation] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>(0);
  const startPositionRef = useRef<number>(0);
  const onTimeChangeRef = useRef(onTimeChange);

  // Update the ref when onTimeChange changes
  useEffect(() => {
    onTimeChangeRef.current = onTimeChange;
  }, [onTimeChange]);

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle play/pause toggle
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle spacebar when not typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scroll
        handlePlayPause();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlePlayPause]);

  // Effect for play/pause
  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = Date.now();
      startPositionRef.current = currentTime;
      
      // Calculate interval based on speed (faster speed = shorter interval)
      const intervalMs = Math.max(1000 / playbackSpeed, 40);
      
      intervalRef.current = setInterval(() => {
        const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
        const newTime = Math.min(startPositionRef.current + (elapsedSeconds * playbackSpeed), totalDuration);
        onTimeChangeRef.current(newTime);
        
        if (newTime >= totalDuration) {
          setIsPlaying(false);
        }
      }, intervalMs);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, totalDuration, playbackSpeed]);

  // Update the start time and position when scrubbing
  useEffect(() => {
    if (scrubbingLocation === null) return;
    
    setIsScrubbing(true);
    startTimeRef.current = Date.now();
    startPositionRef.current = scrubbingLocation;
    onTimeChangeRef.current(scrubbingLocation); // Update the actual time
    setScrubbingLocation(null); // Reset after handling
    
    // Reset scrubbing flag after a short delay
    setTimeout(() => setIsScrubbing(false), 100);
  }, [scrubbingLocation]);

  // Function to update scrubbing location (used by child components)
  const updateScrubbingLocation = (newLocation: number) => {
    setScrubbingLocation(newLocation);
  };

  // Same two-column layout for all: left = scrub bar + play + speeds, right = ep/time. Episode markers hidden only on mobile via CSS.
  return (
    <div className={`player-controls ${isMobile ? 'player-controls--mobile' : ''}`}>
      <div className="player-controls-mobile-cols">
        <div className="player-controls-mobile-left">
          <div className="player-controls-scrub">
            <Playbar
              currentTime={currentTime}
              totalDuration={totalDuration}
              onTimeChange={onTimeChange}
              updateScrubbingLocation={updateScrubbingLocation}
              isScrubbing={isScrubbing}
              episodes={episodes}
              episodeLabel={episodeLabel}
            />
          </div>
          <div className="player-controls-mobile-buttons">
            <button
              className="player-controls-play"
              onClick={handlePlayPause}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <div className="player-controls-speeds">
              {speeds.map((speed) => (
                <label key={speed} className="player-controls-speed-label">
                  <input
                    type="radio"
                    name="playbackSpeed"
                    value={speed}
                    checked={playbackSpeed === speed}
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                    className="sr-only"
                  />
                  <span className={`player-controls-speed-btn ${playbackSpeed === speed ? 'player-controls-speed-btn--active' : ''}`}>
                    {speed}x
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="player-controls-mobile-right">
          <EpisodeTimeSelector
            currentTime={currentTime}
            onTimeChange={onTimeChange}
            episodes={episodes}
            updateScrubbingLocation={updateScrubbingLocation}
            compact
          />
        </div>
      </div>
    </div>
  )
}

export default Controller 