import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShareIcon,
  CheckIcon,
  MapPinIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import type { IEvent, IReveal } from '../../../types/interfaces';
import { getNarrativeDateLabel } from '../../shared';

function screenshotSource(reveal: IReveal): string | undefined {
  if (!reveal.screenshotFilename) return undefined;
  const editorApiUrl =
    (import.meta.env.VITE_EDITOR_API_URL as string | undefined) ??
    (import.meta.env.DEV ? 'http://localhost:5001/api/export/dataset' : '');
  if (!editorApiUrl) return `/images/screenshots/${reveal.screenshotFilename}`;
  return `${new URL(editorApiUrl).origin}/api/tables/reveal/${reveal.id}/image/${reveal.screenshotFilename}`;
}

/**
 * Build a shareable link to the current moment.
 *
 * The viewer runs inside the site shell's `<iframe>` (viewer.html), so its own
 * `window.location` points at the bare viewer document — a link to that URL
 * loads the timeline without the site header/footer chrome. When we're embedded
 * and the top page is same-origin reachable, we instead point the link at the
 * shell page (which forwards `t`/`lang` back down into the iframe). We also drop
 * the internal `landing_referrer` analytics param and carry only `t`/`lang`.
 */
function buildShareUrl(t: number): string {
  const viewerParams = new URLSearchParams(window.location.search);
  const shareParams = new URLSearchParams();
  if (t > 0) shareParams.set('t', String(t));
  const lang = viewerParams.get('lang');
  if (lang) shareParams.set('lang', lang);

  let base = `${window.location.origin}${window.location.pathname}`;
  try {
    if (window.top && window.top !== window.self) {
      // Throws on cross-origin embeds; fall back to the viewer's own URL.
      const topLoc = window.top.location;
      base = `${topLoc.origin}${topLoc.pathname}`;
    }
  } catch {
    // Cross-origin embed — keep the viewer URL as the best available base.
  }

  const q = shareParams.toString();
  return q ? `${base}?${q}` : base;
}

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
  /** When true, copy and lock buttons are hidden (e.g. on mobile) */
  hideHeaderActions?: boolean;
  /** Fires when user opens the OST outbound link (PostHog). */
  onSoundtrackOutboundClick?: () => void;
}

const IEventViewer: React.FC<IEventViewerProps> = ({ 
  event, 
  currentTime = 0, 
  episodes = [],
  isLocked = false,
  onToggleLock,
  hideHeaderActions = false,
  onSoundtrackOutboundClick,
}) => {
  const [linkCopied, setLinkCopied] = useState(false);
  const [selectedRevealId, setSelectedRevealId] = useState<string | null>(null);
  const reachedReveals = useMemo(
    () =>
      event?.reveals.filter(
        reveal => reveal.playtimeTimestamp <= currentTime
      ) ?? [],
    [currentTime, event]
  );
  const latestReachedReveal = reachedReveals.at(-1);
  const displayedReveal =
    reachedReveals.find(reveal => reveal.id === selectedRevealId) ??
    latestReachedReveal;
  const imageReveals = useMemo(() => {
    const filenames = new Set<string>();
    return reachedReveals.filter(reveal => {
      if (!reveal.screenshotFilename || filenames.has(reveal.screenshotFilename)) {
        return false;
      }
      filenames.add(reveal.screenshotFilename);
      return true;
    });
  }, [reachedReveals]);
  const screenshotReveal = displayedReveal?.screenshotFilename
    ? displayedReveal
    : imageReveals.at(-1);
  const screenshotSrc = screenshotReveal
    ? screenshotSource(screenshotReveal)
    : undefined;

  useEffect(() => {
    setSelectedRevealId(null);
  }, [currentTime, event?.id]);

  useEffect(() => {
    for (const reveal of imageReveals) {
      const source = screenshotSource(reveal);
      if (source) new Image().src = source;
    }
  }, [imageReveals]);

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
    const url = buildShareUrl(t);
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


  const visibleReveal = displayedReveal;
  const narrativeDate = getNarrativeDateLabel(
    event.eventGroup.events,
    currentTime
  );
  const timelineName =
    event.eventGroup.subSegment.segment.timeline.name;
  const reachedRevealPosition = visibleReveal
    ? reachedReveals.findIndex(reveal => reveal.id === visibleReveal.id) + 1
    : 0;

  return (
    <div id="event-viewer" className="event-viewer">
      <div className="event-viewer-heading">
        <small>
          {timelineName}
          {visibleReveal && (
            <> · {formatRevealTime(visibleReveal.playtimeTimestamp)}</>
          )}
          {reachedReveals.length > 1 && (
            <> · Reveal {reachedRevealPosition} of {reachedReveals.length}</>
          )}
        </small>
        <div className="event-viewer-title-line">
          <h2 className="event-viewer-title">
            {visibleReveal?.title || event.getTitle(currentTime) || 'Unrevealed event'}
          </h2>
          <span>{narrativeDate}</span>
        </div>
        {!hideHeaderActions && (
          <div className="event-viewer-actions">
            <button
              type="button"
              onClick={() => void copyLinkToMoment()}
              className={`event-viewer-action${linkCopied ? ' is-confirmed' : ''}`}
              aria-label={
                linkCopied
                  ? 'Link copied to clipboard'
                  : 'Copy link to this moment in the show'
              }
              title="Copy link to this moment in the show"
            >
              {linkCopied ? (
                <CheckIcon aria-hidden="true" />
              ) : (
                <ShareIcon aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={onToggleLock}
              className={`event-viewer-action${isLocked ? ' is-pinned' : ''}`}
              aria-label={isLocked ? 'Unpin event' : 'Pin event'}
              title={isLocked ? 'Unpin event' : 'Pin event'}
              disabled={!onToggleLock}
            >
              <MapPinIcon aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <div className="event-viewer-scroll">
        {screenshotSrc && screenshotReveal && (
          <section className="event-viewer-image">
            <img
              src={screenshotSrc}
              alt={`Screenshot for ${screenshotReveal.title}`}
            />
            {imageReveals.length > 1 && (
              <div className="event-viewer-image-dots" aria-label="Reached event reveals">
                {imageReveals.map((reveal, index) => (
                  <button
                    type="button"
                    className={reveal.id === screenshotReveal.id ? 'is-active' : ''}
                    aria-label={`Show reached reveal ${index + 1} of ${imageReveals.length}`}
                    aria-pressed={reveal.id === screenshotReveal.id}
                    onClick={() => setSelectedRevealId(reveal.id)}
                    key={reveal.id}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {visibleReveal && (
          <section className="event-viewer-description">
            <p>{visibleReveal.description}</p>
          </section>
        )}

        {!visibleReveal && (
          <section className="event-viewer-unrevealed">
            <p>
              This event hasn&apos;t been revealed yet.
              {' '}First reveal at {formatRevealTime(Math.min(...event.reveals.map(r => r.playtimeTimestamp)))}.
            </p>
          </section>
        )}

        {event.tags.length > 0 && (
          <section className="event-viewer-tags" aria-label="Event tags">
            {event.tags.map(tag => (
              <span key={tag}>{tag}</span>
            ))}
          </section>
        )}

        {event.soundtrack && (
          <a
            className="event-viewer-soundtrack"
            href={event.soundtrack.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onSoundtrackOutboundClick}
          >
            <span>♪ {event.soundtrack.title}</span>
            <ArrowTopRightOnSquareIcon aria-hidden="true" />
          </a>
        )}

        {reachedReveals.length > 1 && selectedRevealId && (
          <button
            type="button"
            className="event-viewer-latest-reveal"
            onClick={() => setSelectedRevealId(null)}
          >
            Return to latest reached reveal
          </button>
        )}
      </div>
    </div>
  );
};

export default IEventViewer; 