import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { Platform } from './hooks/usePlatform'
import EpisodeTimeSelector from './controller/EpisodeTimeSelector'
import Playbar from './controller/Playbar'

interface ControllerProps {
  currentTime: number;
  onTimeChange: (newTime: number) => void;
  totalDuration: number; // Total duration in seconds
  episodes?: Array<{ id: string; episodeNumber: number; title: string; duration: number }>;
  episodeLabel?: string;
  platform?: Platform;
  compactLandscape?: boolean;
  onPlaybackToggle?: (playing: boolean) => void;
  onEpisodeMarkerClick?: (payload: {
    marker: 'episode' | 'end';
    episode_id?: string;
    episode_number?: number;
    start_time_seconds: number;
  }) => void;
  onScrubInteraction?: (payload: { phase: 'start' | 'end'; time_seconds: number }) => void;
}

const SPEEDS_DESKTOP = [1, 60, 120, 600];
const SPEEDS_MOBILE = [1, 60, 600];

const Controller: React.FC<ControllerProps> = ({
  currentTime,
  onTimeChange,
  totalDuration,
  episodes = [],
  episodeLabel,
  platform = 'computer',
  compactLandscape = false,
  onPlaybackToggle,
  onEpisodeMarkerClick,
  onScrubInteraction,
}) => {
  const isCompactUi = platform === 'mobile' || compactLandscape;
  const useNativeSelects = platform !== 'computer';
  const speeds = isCompactUi ? SPEEDS_MOBILE : SPEEDS_DESKTOP;
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [scrubbingLocation, setScrubbingLocation] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [overlayAwake, setOverlayAwake] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>(0);
  const startPositionRef = useRef<number>(0);
  const onTimeChangeRef = useRef(onTimeChange);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update the ref when onTimeChange changes
  useEffect(() => {
    onTimeChangeRef.current = onTimeChange;
  }, [onTimeChange]);

  const wakeOverlay = useCallback(() => {
    if (!compactLandscape) return;
    setOverlayAwake(true);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => setOverlayAwake(false), 2600);
  }, [compactLandscape]);

  useEffect(() => {
    if (!compactLandscape) {
      setOverlayAwake(true);
      if (overlayTimerRef.current) {
        clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = null;
      }
      return;
    }
    wakeOverlay();
    return () => {
      if (overlayTimerRef.current) {
        clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = null;
      }
    };
  }, [compactLandscape, wakeOverlay]);

  // Handle play/pause toggle
  const handlePlayPause = useCallback(() => {
    wakeOverlay();
    setIsPlaying((prev) => {
      const next = !prev;
      onPlaybackToggle?.(next);
      return next;
    });
  }, [onPlaybackToggle, wakeOverlay]);

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
    wakeOverlay();
    setScrubbingLocation(newLocation);
  };

  // Same two-column layout for all: left = scrub bar + play + speeds, right = ep/time. Episode markers hidden only on mobile via CSS.
  return (
    <div
      className={`player-controls ${isCompactUi ? 'player-controls--mobile' : ''}${compactLandscape ? ' player-controls--floating' : ''}${compactLandscape && !overlayAwake ? ' player-controls--dormant' : ''}`}
      onPointerDown={wakeOverlay}
      onPointerMove={wakeOverlay}
      onFocusCapture={wakeOverlay}
    >
      <div className="player-controls-mobile-cols">
        <div className="player-controls-mobile-left">
          <div className="player-controls-mobile-buttons">
            <button
              className="player-controls-play"
              onClick={handlePlayPause}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <label className={`player-controls-speed-select-wrap${useNativeSelects ? ' player-controls-speed-select-wrap--native' : ''}`}>
              <span className="sr-only">Playback speed</span>
              <select
                className={`player-controls-speed-select${useNativeSelects ? ' player-controls-speed-select--native' : ''}`}
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                aria-label="Playback speed"
              >
                {speeds.map((speed) => (
                  <option key={speed} value={speed}>
                    {speed}x
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="player-controls-scrub">
            <Playbar
              currentTime={currentTime}
              totalDuration={totalDuration}
              onTimeChange={onTimeChange}
              updateScrubbingLocation={updateScrubbingLocation}
              isScrubbing={isScrubbing}
              episodes={episodes}
              episodeLabel={episodeLabel}
              showEpisodeMarkers={!isCompactUi}
              onScrubInteraction={onScrubInteraction}
              onEpisodeMarkerClick={onEpisodeMarkerClick}
            />
          </div>
        </div>
        <div className="player-controls-mobile-right">
          <EpisodeTimeSelector
            currentTime={currentTime}
            onTimeChange={onTimeChange}
            episodes={episodes}
            updateScrubbingLocation={updateScrubbingLocation}
            stacked
            nativeSelect={useNativeSelects}
          />
        </div>
      </div>
    </div>
  )
}

export default Controller 