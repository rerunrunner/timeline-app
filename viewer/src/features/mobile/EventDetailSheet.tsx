import { useEffect, useRef } from 'react';
import type { IReveal } from '../../types/interfaces';
import {
  formatEpisodeTime,
  getAdjacentNarrativeReveals,
  getMobileCanonContext,
  timelineDisplayName,
  timelineShortName,
  type MobileTimelineModel,
} from './mobileModel';

interface EventDetailSheetProps {
  model: MobileTimelineModel;
  selectedReveal: IReveal;
  selectedTimelineId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRevealSelect: (reveal: IReveal) => void;
}

function screenshotSource(reveal: IReveal): string | undefined {
  if (!reveal.screenshotFilename) return undefined;
  const editorApiUrl =
    (import.meta.env.VITE_EDITOR_API_URL as string | undefined) ??
    (import.meta.env.DEV ? 'http://localhost:5001/api/export/dataset' : '');
  if (!editorApiUrl) return `/images/screenshots/${reveal.screenshotFilename}`;
  return `${new URL(editorApiUrl).origin}/api/tables/reveal/${reveal.id}/image/${reveal.screenshotFilename}`;
}

export function EventDetailSheet({
  model,
  selectedReveal,
  selectedTimelineId,
  open,
  onOpenChange,
  onRevealSelect,
}: EventDetailSheetProps) {
  const event = selectedReveal.event;
  const timeline = event.eventGroup.subSegment.segment.timeline;
  const episode = model.episodeById.get(selectedReveal.episodeId);
  const erased =
    selectedTimelineId !== 'all' &&
    getMobileCanonContext(model, selectedTimelineId).erasedEventIds.has(event.id);
  const { previous, next } = getAdjacentNarrativeReveals(
    model,
    selectedReveal.id,
    selectedTimelineId
  );
  const imageSource = screenshotSource(selectedReveal);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [selectedReveal.id]);

  useEffect(() => {
    for (const reveal of [previous, next]) {
      if (!reveal) continue;
      const source = screenshotSource(reveal);
      if (source) new Image().src = source;
    }
  }, [next, previous]);

  const selectAdjacent = (reveal: IReveal | null) => {
    if (reveal) onRevealSelect(reveal);
  };

  return (
    <aside
      className={`mobile-detail-sheet${open ? ' is-open' : ''}`}
      aria-live="polite"
    >
      <button
        className="mobile-detail-handle"
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <span className="mobile-detail-handle-copy">
          <small>
            {erased
              ? `Erased on ${timelineShortName(model.timelineById.get(selectedTimelineId)?.name ?? '')}`
              : timelineDisplayName(timeline.name)}
            {' · '}Episode {episode?.episodeNumber ?? '?'}
          </small>
          <strong>{selectedReveal.title}</strong>
        </span>
        <span className="mobile-detail-chevron" aria-hidden="true">⌄</span>
      </button>

      <div className="mobile-detail-content" ref={contentRef}>
        <div className="mobile-detail-image">
          {imageSource ? (
            <img
              src={imageSource}
              alt={`Still from ${selectedReveal.title}`}
            />
          ) : (
            <span className="mobile-detail-image-placeholder" aria-hidden="true">⌁</span>
          )}
          <span className="mobile-detail-time">
            {formatEpisodeTime(selectedReveal.episodeTime)}
          </span>
          <div className="mobile-hero-event-nav" aria-label="Previous and next story moments">
            <button
              type="button"
              disabled={!previous}
              aria-label={previous ? `Previous: ${previous.title}` : 'No previous event'}
              onClick={() => selectAdjacent(previous)}
            >
              ‹
            </button>
            <button
              type="button"
              disabled={!next}
              aria-label={next ? `Next: ${next.title}` : 'No next event'}
              onClick={() => selectAdjacent(next)}
            >
              ›
            </button>
          </div>
        </div>
        <p className="mobile-detail-description">
          {selectedReveal.description || 'No description has been added yet.'}
        </p>
        <div className="mobile-detail-tags">
          {erased && (
            <>
              <span className="mobile-detail-tag is-erased">
                Erased on {timelineShortName(model.timelineById.get(selectedTimelineId)?.name ?? '')}
              </span>
              <span className="mobile-detail-tag">{timelineDisplayName(timeline.name)}</span>
            </>
          )}
          {event.tags.map(tag => (
            <span className="mobile-detail-tag" key={tag}>{tag}</span>
          ))}
        </div>
        {event.soundtrack?.mediaUrl && (
          <a
            className="mobile-soundtrack-link"
            href={event.soundtrack.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>♪ {event.soundtrack.title}</span><span>↗</span>
          </a>
        )}
      </div>
    </aside>
  );
}
