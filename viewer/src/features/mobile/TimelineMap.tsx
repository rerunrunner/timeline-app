import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { EventType } from '../../types/timeline';
import type { IEvent } from '../../types/interfaces';
import {
  MOBILE_TIMELINE_COLORS,
  getMobileCanonContext,
  layoutMobileTimeline,
  timelineDisplayName,
  timelineShortName,
  type MobileTimelineModel,
} from './mobileModel';

interface TimelineMapProps {
  model: MobileTimelineModel;
  selectedRevealId: string | null;
  selectedTimelineId: string;
  onTimelineChange: (timelineId: string) => void;
  onEventSelect: (event: IEvent) => void;
}

function wavyPath(x: number, timelineIndex: number, height: number): string {
  const top = 92;
  const bottom = height - 70;
  const segmentHeight = 360;
  let y = top;
  let direction = timelineIndex % 2 === 0 ? 1 : -1;
  let path = `M ${x} ${top}`;

  while (y < bottom) {
    const nextY = Math.min(y + segmentHeight, bottom);
    const distance = nextY - y;
    const amplitude = 5 + timelineIndex * 0.7;
    path += ` C ${x + amplitude * direction} ${y + distance * 0.32}, ${x - amplitude * direction} ${y + distance * 0.68}, ${x} ${nextY}`;
    direction *= -1;
    y = nextY;
  }
  return path;
}

function jumpPath(
  departure: { x: number; y: number; timelineIndex: number },
  arrival: { x: number; y: number },
  laneGap: number
): string {
  const sameLane = departure.x === arrival.x;
  const bendDirection = departure.timelineIndex % 2 === 0 ? 1 : -1;
  const bendX = sameLane
    ? departure.x + bendDirection * Math.min(28, laneGap * 0.34)
    : (departure.x + arrival.x) / 2;
  const verticalDirection = arrival.y < departure.y ? -1 : 1;
  const turnRadius = Math.min(
    90,
    Math.max(40, Math.abs(arrival.y - departure.y) * 0.08)
  );
  return `M ${departure.x} ${departure.y} C ${bendX} ${departure.y + verticalDirection * turnRadius}, ${bendX} ${arrival.y - verticalDirection * turnRadius}, ${arrival.x} ${arrival.y}`;
}

export function TimelineMap({
  model,
  selectedRevealId,
  selectedTimelineId,
  onTimelineChange,
  onEventSelect,
}: TimelineMapProps) {
  const viewRef = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? 375 : Math.min(window.innerWidth, 640)
  );

  useLayoutEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const updateWidth = () => setWidth(view.clientWidth || window.innerWidth);
    updateWidth();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
    const observer = new ResizeObserver(updateWidth);
    observer.observe(view);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(
    () => layoutMobileTimeline(model, width),
    [model, width]
  );
  const canon = useMemo(
    () => getMobileCanonContext(model, selectedTimelineId),
    [model, selectedTimelineId]
  );
  const selectedEventId = selectedRevealId
    ? model.revealById.get(selectedRevealId)?.event.id
    : undefined;
  const laneGap =
    layout.laneX.length > 1 ? layout.laneX[1] - layout.laneX[0] : layout.width;

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !selectedEventId) return;
    const node = [...view.querySelectorAll<HTMLElement>('[data-mobile-event-id]')]
      .find(candidate => candidate.dataset.mobileEventId === selectedEventId);
    if (!node) return;
    const desiredTop = Math.max(0, node.offsetTop - view.clientHeight * 0.48);
    view.scrollTo({ top: desiredTop, behavior: 'smooth' });
  }, [selectedEventId]);

  const ownEventCount =
    selectedTimelineId === 'all'
      ? model.events.length
      : model.events.filter(
          event => model.eventTimelineIds.get(event.id) === selectedTimelineId
        ).length;
  const inheritedCount = canon.activeEventIds.size - ownEventCount;

  return (
    <section
      className="mobile-explorer-view mobile-map-view"
      ref={viewRef}
      role="tabpanel"
      aria-labelledby="mobile-map-tab"
    >
      <div className="mobile-view-toolbar">
        <div className="mobile-view-toolbar-copy">
          <strong>
            {selectedTimelineId === 'all'
              ? 'Timelines in story order'
              : timelineShortName(model.timelineById.get(selectedTimelineId)?.name ?? '')}
          </strong>
          <span>
            {selectedTimelineId === 'all'
              ? `${model.events.length} events · all ${model.timelines.length} paths`
              : `${ownEventCount} on this path · ${inheritedCount} inherited · ${canon.erasedEventIds.size} erased`}
          </span>
        </div>
        <select
          className="mobile-filter-select"
          aria-label="Filter the map by timeline"
          value={selectedTimelineId}
          onChange={event => onTimelineChange(event.target.value)}
        >
          <option value="all">All timelines</option>
          {model.timelines.map(timeline => (
            <option key={timeline.id} value={timeline.id}>
              {timelineShortName(timeline.name)}
            </option>
          ))}
        </select>
      </div>

      <div
        className="mobile-map-canvas"
        style={{ height: `${layout.height}px` }}
      >
        <div
          className="mobile-lane-headings"
          style={{
            gridTemplateColumns: `repeat(${model.timelines.length}, minmax(0, 1fr))`,
          }}
        >
          {model.timelines.map((timeline, index) => {
            const ancestor = canon.ancestorTimelineIds.has(timeline.id);
            const muted =
              selectedTimelineId !== 'all' &&
              selectedTimelineId !== timeline.id &&
              !ancestor;
            return (
              <span
                className={[
                  'mobile-lane-heading',
                  ancestor ? 'is-ancestor' : '',
                  muted ? 'is-muted' : '',
                ].filter(Boolean).join(' ')}
                style={{ '--timeline-color': MOBILE_TIMELINE_COLORS[index % MOBILE_TIMELINE_COLORS.length] } as CSSProperties}
                key={timeline.id}
              >
                {timelineDisplayName(timeline.name)}
              </span>
            );
          })}
        </div>

        <svg
          className="mobile-curve-svg"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {model.timelines.map((timeline, index) => {
            const ancestor = canon.ancestorTimelineIds.has(timeline.id);
            const muted =
              selectedTimelineId !== 'all' &&
              selectedTimelineId !== timeline.id &&
              !ancestor;
            return (
              <path
                className={[
                  'mobile-curve-path',
                  ancestor ? 'is-ancestor' : '',
                  muted ? 'is-muted' : '',
                ].filter(Boolean).join(' ')}
                style={{ '--timeline-color': MOBILE_TIMELINE_COLORS[index % MOBILE_TIMELINE_COLORS.length] } as CSSProperties}
                d={wavyPath(layout.laneX[index], index, layout.height)}
                key={timeline.id}
              />
            );
          })}
          {model.events
            .filter(event => event.eventType === EventType.TIMESLIP_OUT)
            .flatMap(departure =>
              departure.correlatedEvents.slice(0, 1).map(arrival => {
                const departurePosition = layout.eventPositions.get(departure.id);
                const arrivalPosition = layout.eventPositions.get(arrival.id);
                if (!departurePosition || !arrivalPosition) return null;
                const arrivalTimelineId = model.eventTimelineIds.get(arrival.id) ?? '';
                const arrivalTimelineIndex =
                  model.timelineIndexById.get(arrivalTimelineId) ?? 0;
                const muted =
                  selectedTimelineId !== 'all' &&
                  !canon.activeEventIds.has(arrival.id);
                return (
                  <path
                    className={`mobile-curve-jump${muted ? ' is-muted' : ''}`}
                    style={{ '--timeline-color': MOBILE_TIMELINE_COLORS[arrivalTimelineIndex % MOBILE_TIMELINE_COLORS.length] } as CSSProperties}
                    d={jumpPath(departurePosition, arrivalPosition, laneGap)}
                    data-jump-from={departure.id}
                    data-jump-to={arrival.id}
                    key={`${departure.id}-${arrival.id}`}
                  />
                );
              })
            )}
        </svg>

        {layout.dateGroups.map((group, index) => {
          const previousYear =
            index > 0
              ? new Date(layout.dateGroups[index - 1].timestamp).getFullYear()
              : null;
          const year = new Date(group.timestamp).getFullYear();
          return (
            <span key={group.key}>
              {year !== previousYear && (
                <span
                  className="mobile-year-marker"
                  style={{ top: `${group.top + 5}px` }}
                >
                  {year}
                </span>
              )}
              {group.timelineCount > 1 && (
                <span
                  className="mobile-parallel-marker"
                  style={{ top: `${group.top + 24}px` }}
                >
                  {new Intl.DateTimeFormat(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }).format(new Date(group.timestamp))}{' '}
                  · parallel
                </span>
              )}
            </span>
          );
        })}

        {model.events.map(event => {
          const position = layout.eventPositions.get(event.id);
          if (!position) return null;
          const timelineId = model.eventTimelineIds.get(event.id) ?? '';
          const timelineIndex = model.timelineIndexById.get(timelineId) ?? 0;
          const displayReveal = event.reveals.at(-1);
          const selected = selectedEventId === event.id;
          const inherited =
            selectedTimelineId !== 'all' &&
            timelineId !== selectedTimelineId &&
            canon.activeEventIds.has(event.id);
          const erased = canon.erasedEventIds.has(event.id);
          const edgeClass =
            position.timelineIndex === 0
              ? 'edge-left'
              : position.timelineIndex === model.timelines.length - 1
                ? 'edge-right'
                : '';
          return (
            <button
              className={[
                'mobile-event-node',
                event.eventType ? 'is-timeslip' : '',
                position.parallel ? 'is-parallel' : '',
                selected ? 'is-selected' : '',
                inherited ? 'is-inherited' : '',
                erased ? 'is-erased' : '',
                'has-label',
                edgeClass,
              ].filter(Boolean).join(' ')}
              type="button"
              data-mobile-event-id={event.id}
              style={{
                '--timeline-color':
                  MOBILE_TIMELINE_COLORS[timelineIndex % MOBILE_TIMELINE_COLORS.length],
                '--node-label-width': `${Math.max(52, laneGap - 8)}px`,
                left: `${position.x}px`,
                top: `${position.y}px`,
              } as CSSProperties}
              aria-label={`${displayReveal?.title ?? event.id}, ${displayReveal?.narrativeTimeframe ?? ''}${erased ? ', erased on this path' : ''}`}
              aria-pressed={selected}
              onClick={() => onEventSelect(event)}
              key={event.id}
            >
              <span className="mobile-node-core" />
              <span className="mobile-node-label">
                {displayReveal?.title ?? event.id}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
