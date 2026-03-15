import React, { useState, useRef, useEffect } from 'react'
import EpisodeTimeSelector from './controller/EpisodeTimeSelector'
import Playbar from './controller/Playbar'

interface ControllerProps {
  currentTime: number;
  onTimeChange: (newTime: number) => void;
  totalDuration: number; // Total duration in seconds
  episodes?: Array<{ id: string; episodeNumber: number; title: string; duration: number }>;
  episodeLabel?: string;
}

const Controller: React.FC<ControllerProps> = ({ currentTime, onTimeChange, totalDuration, episodes = [], episodeLabel }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 60x, 120x
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

  return (
    <div className="player-controls">
      <div className="flex items-center gap-4">
        {/* Playback Speed Controls */}
        <div className="flex flex-col gap-1">
          <div className="flex flex-col gap-1">
            {[1, 60, 120, 600].map((speed) => (
              <label key={speed} className="cursor-pointer">
                <input
                  type="radio"
                  name="playbackSpeed"
                  value={speed}
                  checked={playbackSpeed === speed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="sr-only"
                />
                <span className={`block px-2 py-1 text-xs rounded transition-colors text-center ${
                  playbackSpeed === speed 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}>
                  {speed}x
                </span>
              </label>
            ))}
          </div>
        </div>
        
        <button 
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors text-lg w-10 h-8 flex items-center justify-center"
          onClick={handlePlayPause}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        
        <Playbar 
          currentTime={currentTime}
          totalDuration={totalDuration}
          onTimeChange={onTimeChange}
          updateScrubbingLocation={updateScrubbingLocation}
          isScrubbing={isScrubbing}
          episodes={episodes}
          episodeLabel={episodeLabel}
        />
        <EpisodeTimeSelector 
          currentTime={currentTime}
          onTimeChange={onTimeChange}
          episodes={episodes}
          updateScrubbingLocation={updateScrubbingLocation}
        />
      </div>
    </div>
  )
}

export default Controller 