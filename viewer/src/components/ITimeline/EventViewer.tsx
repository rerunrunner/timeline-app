import React, { useState, useCallback } from 'react';
import { ShareIcon, CheckIcon, LockClosedIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
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
  onToggleLock?: () => void;
}

const IEventViewer: React.FC<IEventViewerProps> = ({ 
  event, 
  currentTime = 0, 
  episodes = [],
  isLocked = false,
  onToggleLock
}) => {
  const [linkCopied, setLinkCopied] = useState(false);
  const headerActionClassName =
    'inline-flex h-7 w-7 items-center justify-center rounded-lg border shadow-sm transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]';
  const sectionLabelClassName =
    'mb-3 text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-slate-400';
  const detailLabelClassName =
    'text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-400';

  /** Playtime (seconds) for this event’s current beat: visible reveal, else first reveal. */
  const copyLinkToMoment = useCallback(async () => {
    if (!event) return;
    const visibleAtPlayhead = event.reveals
      .filter((reveal) => reveal.playtimeTimestamp <= currentTime)
      .at(-1);
    const playTimeSeconds = visibleAtPlayhead
      ? visibleAtPlayhead.playtimeTimestamp
      : Math.min(...event.reveals.map((r) => r.playtimeTimestamp));
    const t = Math.round(playTimeSeconds);
    const params = new URLSearchParams(window.location.search);
    if (t <= 0) params.delete('t');
    else params.set('t', String(t));
    const q = params.toString();
    const url = `${window.location.origin}${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setLinkCopied(true);
        window.setTimeout(() => setLinkCopied(false), 2500);
      } catch {
        // ignore
      }
    }
  }, [event, currentTime]);

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
      
      return `Episode ${lastEpisode.episodeNumber} ${timeStr}`;
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
      <div className="mb-3 w-full flex-shrink-0">
        <h2
          className="event-viewer-title min-w-0 truncate whitespace-nowrap text-[1rem] font-bold uppercase leading-none tracking-[0.18em] text-sky-800"
          title={visibleReveal?.title || event.getTitle(currentTime)}
        >
          {visibleReveal?.title || event.getTitle(currentTime)}
        </h2>
      </div>

      {/* Screenshot - shown when event has been revealed and has a screenshot */}
      {visibleReveal && screenshotSrc && (
        <div className="mb-3 flex-shrink-0">
          <img 
            src={screenshotSrc} 
            alt={`Screenshot for ${visibleReveal.title}`}
            className="h-auto w-full rounded-2xl border border-slate-200/80 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]"
          />
        </div>
      )}

      {/* Header actions */}
      <div className="mb-6 flex w-full flex-shrink-0 items-center justify-end gap-2 border-b border-slate-100 pb-4">
          <button
            type="button"
            onClick={() => void copyLinkToMoment()}
            className={`${headerActionClassName} ${
              linkCopied
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 focus-visible:ring-emerald-400'
                : 'border-gray-200 bg-white text-gray-600 hover:border-sky-200 hover:bg-sky-50/90 hover:text-sky-800 hover:shadow-md focus-visible:ring-sky-400'
            }`}
            aria-label={
              linkCopied
                ? 'Link copied to clipboard'
                : 'Copy link to this moment in the show'
            }
            title="Copy link to this moment in the show"
          >
            <span
              className={`inline-flex h-4 w-4 items-center justify-center transition-transform duration-300 ${
                linkCopied ? 'scale-110' : ''
              }`}
              aria-hidden="true"
            >
              {linkCopied ? (
                <CheckIcon className="h-4 w-4 text-emerald-600" strokeWidth={2.25} />
              ) : (
                <ShareIcon className="h-4 w-4 text-sky-600/90" strokeWidth={1.75} />
              )}
            </span>
          </button>
          <button
            type="button"
            onClick={onToggleLock}
            className={`${headerActionClassName} ${
              isLocked
                ? 'border-rose-200/80 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100'
                : 'border-gray-200 bg-white text-gray-400 hover:border-sky-200 hover:bg-sky-50/90 hover:text-sky-700 hover:shadow-md'
            }`}
            aria-label={isLocked ? 'Unlock event' : 'Lock event'}
            title={isLocked ? 'Unlock event' : 'Lock event'}
            disabled={!onToggleLock}
          >
            <span aria-hidden="true">
              <LockClosedIcon className="h-4 w-4" strokeWidth={1.9} />
            </span>
          </button>
      </div>
      
      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="space-y-8">
        {/* Reveal content - shown when event has been revealed */}
        {visibleReveal && (
          <section className="flex-shrink-0">
            <p className="max-w-[34rem] whitespace-pre-wrap text-[1rem] leading-6 text-slate-700">
              {visibleReveal.description}
            </p>
          </section>
        )}

        {/* Fallback content - shown when event hasn't been revealed yet */}
        {!visibleReveal && (
          <section className="flex-shrink-0">
            <p className="max-w-[34rem] text-[0.92rem] italic leading-6 text-slate-500">
              This event hasn&apos;t been revealed yet.
              {' '}First reveal at {formatRevealTime(Math.min(...event.reveals.map(r => r.playtimeTimestamp)))}.
            </p>
          </section>
        )}

        {/* Event metadata */}
        <section className="flex-shrink-0">
          <h3 className={sectionLabelClassName}>Event Details</h3>
          <div className="grid max-w-[34rem] grid-cols-[max-content_1fr] items-baseline gap-x-4 gap-y-3">
            <p className={`${detailLabelClassName} mb-0 whitespace-nowrap`}>Narrative Date</p>
            <p className="text-[0.875rem] text-slate-700">
              {visibleReveal?.apparentTimeline || event.eventGroup.subSegment.segment.timeline.id} {event.narrativeTimestamp.toLocaleDateString()}
            </p>
            {visibleReveal && (
              <>
                <p className={`${detailLabelClassName} mb-0 whitespace-nowrap`}>Reveal Time</p>
                <p className="text-[0.875rem] text-slate-700">
                  {formatRevealTime(visibleReveal.playtimeTimestamp)}
                </p>
              </>
            )}
            {event.soundtrack && (
              <>
                <p className={`${detailLabelClassName} mb-0 whitespace-nowrap`}>OST</p>
                <p className="text-[0.875rem] text-slate-700">
                  <a 
                    href={event.soundtrack.mediaUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-slate-700 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-sky-700 hover:decoration-sky-300"
                  >
                    {event.soundtrack.title}
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                  </a>
                </p>
              </>
            )}
          </div>
        </section>

        {/* Event tags */}
        {event.tags.length > 0 && (
          <section className="flex-shrink-0">
            <h3 className={sectionLabelClassName}>Tags</h3>
            <div className="flex flex-wrap gap-2">
              {event.tags.map(tag => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-[0.875rem] font-medium text-slate-600 ring-1 ring-slate-200/80"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}
        </div>
      </div>
    </div>
  );
};

export default IEventViewer; 