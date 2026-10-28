import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { IReveal } from '../../types/interfaces';
import { getNarrativeDateLabel } from '../shared';
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

const COMPACT_LANDSCAPE_QUERY =
  '(orientation: landscape) and (max-height: 560px)';
const LANDSCAPE_COLLAPSED_WIDTH = 32;

function screenshotSource(reveal: IReveal): string | undefined {
  if (!reveal.screenshotFilename) return undefined;
  const editorApiUrl =
    (import.meta.env.VITE_EDITOR_API_URL as string | undefined) ??
    (import.meta.env.DEV ? 'http://localhost:5001/api/export/dataset' : '');
  if (!editorApiUrl) return `/images/screenshots/${reveal.screenshotFilename}`;
  return `${new URL(editorApiUrl).origin}/api/tables/reveal/${reveal.id}/image/${reveal.screenshotFilename}`;
}

function maximumSheetOffset(
  sheet: HTMLElement | null,
  handle: HTMLElement | null,
  horizontal = isCompactLandscape()
): number {
  if (horizontal) {
    return Math.max(
      0,
      (sheet?.clientWidth ?? 0) - LANDSCAPE_COLLAPSED_WIDTH
    );
  }
  return Math.max(0, (sheet?.clientHeight ?? 0) - (handle?.clientHeight ?? 0));
}

function isCompactLandscape(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia(COMPACT_LANDSCAPE_QUERY).matches
  );
}

function sameNarrativeDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
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
  const eventTimelineId = model.eventTimelineIds.get(event.id);
  const dateGroupEvents = model.events.filter(
    candidate =>
      model.eventTimelineIds.get(candidate.id) === eventTimelineId &&
      sameNarrativeDay(candidate.narrativeTimestamp, event.narrativeTimestamp)
  );
  const narrativeDate = getNarrativeDateLabel(
    dateGroupEvents,
    Number.POSITIVE_INFINITY
  );
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
  const sheetRef = useRef<HTMLElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    horizontal: boolean;
    startPosition: number;
    startOffset: number;
    startTime: number;
  } | null>(null);
  const draggedRef = useRef(false);
  const internalOpenChangeRef = useRef(false);
  const previousOpenRef = useRef(open);
  const [sheetOffset, setSheetOffset] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

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

  useEffect(() => {
    if (previousOpenRef.current === open) return;
    previousOpenRef.current = open;
    if (internalOpenChangeRef.current) {
      internalOpenChangeRef.current = false;
      return;
    }
    setSheetOffset(null);
  }, [open]);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      setSheetOffset(current =>
        current === null
          ? null
          : Math.min(current, maximumSheetOffset(sheet, handleRef.current))
      );
    });
    observer.observe(sheet);
    return () => observer.disconnect();
  }, []);

  const notifyOpenChange = (nextOpen: boolean) => {
    if (nextOpen === open) return;
    internalOpenChangeRef.current = true;
    onOpenChange(nextOpen);
  };

  const handlePointerDown = (pointerEvent: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointerEvent.button !== 0) return;
    const horizontal = isCompactLandscape();
    const maximumOffset = maximumSheetOffset(
      sheetRef.current,
      handleRef.current,
      horizontal
    );
    dragRef.current = {
      pointerId: pointerEvent.pointerId,
      horizontal,
      startPosition: horizontal ? pointerEvent.clientX : pointerEvent.clientY,
      startOffset: sheetOffset ?? (open ? 0 : maximumOffset),
      startTime: performance.now(),
    };
    draggedRef.current = false;
    setDragging(true);
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
  };

  const handlePointerMove = (pointerEvent: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== pointerEvent.pointerId) return;
    const currentPosition = drag.horizontal
      ? pointerEvent.clientX
      : pointerEvent.clientY;
    const delta = currentPosition - drag.startPosition;
    if (Math.abs(delta) > 4) draggedRef.current = true;
    const maximumOffset = maximumSheetOffset(
      sheetRef.current,
      handleRef.current,
      drag.horizontal
    );
    setSheetOffset(Math.min(maximumOffset, Math.max(0, drag.startOffset + delta)));
  };

  const handlePointerUp = (pointerEvent: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== pointerEvent.pointerId) return;
    const maximumOffset = maximumSheetOffset(
      sheetRef.current,
      handleRef.current,
      drag.horizontal
    );
    const currentPosition = drag.horizontal
      ? pointerEvent.clientX
      : pointerEvent.clientY;
    const delta = currentPosition - drag.startPosition;
    const duration = Math.max(1, performance.now() - drag.startTime);
    const swiped = Math.abs(delta) >= 48 && Math.abs(delta) / duration >= 0.35;
    const offset = swiped
      ? delta > 0
        ? maximumOffset
        : 0
      : Math.min(
          maximumOffset,
          Math.max(0, drag.startOffset + delta)
        );
    setSheetOffset(offset);
    setDragging(false);
    dragRef.current = null;
    if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
      pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
    }
    notifyOpenChange(offset < maximumOffset);
  };

  const handlePointerCancel = (pointerEvent: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId !== pointerEvent.pointerId) return;
    setDragging(false);
    dragRef.current = null;
    if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
      pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
    }
  };

  const handleToggle = () => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    const maximumOffset = maximumSheetOffset(sheetRef.current, handleRef.current);
    const currentOffset = sheetOffset ?? (open ? 0 : maximumOffset);
    const targetOffset = currentOffset <= 4 ? maximumOffset : 0;
    setSheetOffset(targetOffset);
    notifyOpenChange(targetOffset < maximumOffset);
  };

  const selectAdjacent = (reveal: IReveal | null) => {
    if (reveal) onRevealSelect(reveal);
  };

  return (
    <aside
      className={`mobile-detail-sheet${open ? ' is-open' : ''}${dragging ? ' is-dragging' : ''}`}
      aria-live="polite"
      ref={sheetRef}
      style={
        sheetOffset === null
          ? undefined
          : {
              '--mobile-detail-offset': `${sheetOffset}px`,
            } as CSSProperties
      }
    >
      <button
        className="mobile-detail-handle"
        type="button"
        aria-expanded={open}
        ref={handleRef}
        onClick={handleToggle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <span className="mobile-detail-handle-copy">
          <small>
            {erased
              ? `Erased on ${timelineShortName(model.timelineById.get(selectedTimelineId)?.name ?? '')}`
              : timelineDisplayName(timeline.name)}
            {' · '}Episode {episode?.episodeNumber ?? '?'}
          </small>
          <span className="mobile-detail-title-line">
            <strong>{selectedReveal.title}</strong>
            {narrativeDate && (
              <span className="mobile-detail-date">
                {narrativeDate}
              </span>
            )}
          </span>
        </span>
      </button>

      <button
        className="mobile-detail-side-handle"
        type="button"
        aria-label={open ? 'Collapse event details' : 'Expand event details'}
        aria-hidden="true"
        tabIndex={-1}
        onClick={handleToggle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      />

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
        <div className="mobile-detail-copy">
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
      </div>
    </aside>
  );
}
