import React from 'react';
import type { IEvent } from '../../types/interfaces';

/**
 * IEventViewer - Component for displaying detailed event information (Immutable version)
 * 
 * This component renders detailed information about a selected event, including
 * its reveals, timeline date, tags, and other metadata. It adapts its display
 * based on whether an event is locked or active, and shows different content
 * based on the current playback time.
 * 
 * Key responsibilities:
 * - Displays event details and metadata
 * - Shows the most recent visible reveal based on current time
 * - Handles locked vs active event states
 * - Formats time information for display
 * - Provides fallback content when no event is selected
 * - Displays screenshots when available
 * 
 * Event States:
 * - Locked: Event is pinned and won't change based on time
 * - Active: Event is currently relevant based on time or hover
 * - None: Shows placeholder content
 * 
 * Reveal System:
 * - Events have multiple reveals that become visible at different times
 * - Only shows reveals that have been reached by the current time
 * - Displays the most recent visible reveal
 */
interface IEventViewerProps {
  event: IEvent | null;
  currentTime?: number; // Current playhead position in seconds
  episodes?: Array<{ id: string; episodeNumber: number; title: string; duration: number }>;
  isLocked?: boolean; // Whether the current event is locked
}

const IEventViewer: React.FC<IEventViewerProps> = ({ 
  event, 
  currentTime = 0, 
  episodes = [],
  isLocked = false
}) => {
  // Show placeholder when no event is selected
  if (!event) {
    return (
      <div id="event-viewer" className="event-viewer">
        <p className="text-gray-400 italic">Select an event to view details</p>
      </div>
    );
  }

  /**
   * Convert absolute play time to episode and time format
   * Maps a time in seconds to a human-readable episode:time format
   */
  const formatRevealTime = (absolutePlayTime: number) => {
    let cumulativeTime = 0;
    
    for (const episode of episodes) {
      const episodeEndTime = cumulativeTime + episode.duration;
      
      if (absolutePlayTime < episodeEndTime) {
        // We're in this episode
        const timeInEpisode = absolutePlayTime - cumulativeTime;
        const hours = Math.floor(timeInEpisode / 3600);
        const mins = Math.floor((timeInEpisode % 3600) / 60);
        const secs = Math.floor(timeInEpisode % 60);
        
        // Format as Episode mm:ss or Episode hh:mm:ss (only hours if > 60 min)
        const timeStr = hours > 0 
          ? `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
          : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        return `Episode ${episode.episodeNumber} ${timeStr}`;
      }
      
      cumulativeTime = episodeEndTime;
    }
    
    // If we're past all episodes, return the last episode
    const lastEpisode = episodes[episodes.length - 1];
    if (lastEpisode) {
      const timeInEpisode = lastEpisode.duration;
      const hours = Math.floor(timeInEpisode / 3600);
      const mins = Math.floor((timeInEpisode % 3600) / 60);
      const secs = Math.floor(timeInEpisode % 60);
      
      const timeStr = hours > 0 
        ? `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      
      return `Episode ${lastEpisode.number} ${timeStr}`;
    }
    
    // Fallback if no episodes
    return `${absolutePlayTime}s`;
  };


  // Get the visible reveal using the immutable event interface
  const visibleReveal = event.reveals
    .filter(reveal => reveal.playtimeTimestamp <= currentTime)
    .at(-1);

  // Screenshot: in dev use editor API (images from data dir); otherwise use static /images/screenshots/
  const screenshotFilename = event.getScreenshotFilename(currentTime);
  const editorApiUrl = (import.meta.env.VITE_EDITOR_API_URL as string | undefined) ?? (import.meta.env.DEV ? 'http://localhost:5001/api/export/dataset' : '');
  const editorApiBase = editorApiUrl ? new URL(editorApiUrl).origin : '';
  const screenshotSrc = screenshotFilename && visibleReveal
    ? (editorApiBase
        ? `${editorApiBase}/api/tables/reveal/${visibleReveal.id}/image/${screenshotFilename}`
        : `/images/screenshots/${screenshotFilename}`)
    : undefined;

  return (
    <div id="event-viewer" className="event-viewer">

        {/* Screenshot - shown when event has been revealed and has a screenshot */}
        {visibleReveal && screenshotSrc && (
          <div className="flex-shrink-0">
            <img 
              src={screenshotSrc} 
              alt={`Screenshot for ${visibleReveal.title}`}
              className="w-full h-auto rounded border border-gray-300"
            />
          </div>
        )}
      {/* Header with event title and lock status */}
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-xl font-bold">
          {visibleReveal?.title || event.getTitle(currentTime)}
        </h2>
        {isLocked && (
          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
            Locked
          </span>
        )}
      </div>
      
      {/* Scrollable content area */}
      <div className="space-y-4 flex-1 overflow-y-auto min-h-0">
        {/* Reveal content - shown when event has been revealed */}
        {visibleReveal && (
          <div className="flex-shrink-0">
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="whitespace-pre-wrap">{visibleReveal.description}</p>
          </div>
        )}
        

        
        {/* Fallback content - shown when event hasn't been revealed yet */}
        {!visibleReveal && (
          <div className="flex-shrink-0">
            <p className="text-gray-500 italic">
              This event hasn't been revealed yet. 
              (First reveal at {formatRevealTime(Math.min(...event.reveals.map(r => r.playtimeTimestamp)))})
            </p>
          </div>
        )}
        
        {/* Event metadata */}
        <div className="flex-shrink-0">
          <h3 className="font-semibold mb-2">Event Details</h3>
          <p className="text-sm text-gray-500">
            Narrative Date: {visibleReveal?.apparentTimeline || event.eventGroup.subSegment.segment.timeline.id} {event.narrativeTimestamp.toLocaleDateString()}
          </p>
          {visibleReveal && (
            <p className="text-sm text-gray-500">
              Reveal Time: {formatRevealTime(visibleReveal.playtimeTimestamp)}
            </p>
          )}
          {event.soundtrack && (
            <p className="text-sm text-gray-500">
              Soundtrack: <a 
                href={event.soundtrack.mediaUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {event.soundtrack.title}
              </a>
            </p>
          )}
        </div>
        
        {/* Event tags */}
        {event.tags.length > 0 && (
          <div className="flex-shrink-0">
            <h3 className="font-semibold mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {event.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-gray-100 rounded-full text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IEventViewer; 