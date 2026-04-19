import { useCallback, useEffect, useRef, useState } from 'react';
import { usePostHog } from '@posthog/react';
import type { IEvent, ITimeline } from '../../../types/interfaces';
import { isPosthogActive } from '../../../utils/posthogEnabled';

/**
 * Desktop-only event selection and interaction logic.
 *
 * Encapsulates the current timeline canvas interaction paradigm:
 * - `lockedEvent` pins an event open until explicitly cleared
 * - `activeEvent` tracks the playhead-driven or hover-driven focus
 * - click toggles lock/unlock/switch and emits analytics
 * - hover updates `activeEvent` when nothing is locked (throttled analytics)
 *
 * This hook is intentionally scoped to `features/desktop`. The mobile
 * experience is expected to be designed from the ground up with a
 * fundamentally different navigation paradigm (card-per-event + next/back
 * + mini-map), so these concepts should not be elevated into
 * `features/shared`.
 */
type UseEventSelectionArgs = {
  timelines: ITimeline[];
  currentTime: number;
  datasetId?: string;
};

type UseEventSelectionResult = {
  lockedEvent: IEvent | null;
  activeEvent: IEvent | null;
  eventToShow: IEvent | null;
  handleEventClick: (event: IEvent) => void;
  handleEventHover: (event: IEvent) => void;
  handleEventHoverEnd: () => void;
  handleViewerLockToggle: () => void;
};

function getAllEvents(tls: ITimeline[]): IEvent[] {
  return tls.flatMap(timeline =>
    timeline.segments.flatMap(segment =>
      segment.subSegments.flatMap(subSegment =>
        subSegment.eventGroups.flatMap(group => group.events)
      )
    )
  );
}

/** Throttle repeated hover analytics for the same event (mouse drift). */
const HOVER_THROTTLE_MS = 2000;

export function useEventSelection({
  timelines,
  currentTime,
  datasetId,
}: UseEventSelectionArgs): UseEventSelectionResult {
  const posthog = usePostHog();
  const analyticsEnabled = isPosthogActive;

  const [lockedEvent, setLockedEvent] = useState<IEvent | null>(null);
  const [activeEvent, setActiveEvent] = useState<IEvent | null>(null);
  const hoverThrottleRef = useRef<{ eventId: string; at: number } | null>(null);

  // When timelines are replaced (e.g. after WebSocket refresh), re-resolve
  // locked/active event by id so the event viewer picks up fresh objects.
  useEffect(() => {
    if (timelines.length === 0) return;
    const allEvents = getAllEvents(timelines);
    const findById = (id: string) => allEvents.find(e => e.id === id) ?? null;
    if (lockedEvent) {
      const next = findById(lockedEvent.id);
      if (next && next !== lockedEvent) setLockedEvent(next);
    }
    if (activeEvent && !lockedEvent) {
      const next = findById(activeEvent.id);
      if (next && next !== activeEvent) setActiveEvent(next);
    }
    // lockedEvent/activeEvent intentionally omitted: only re-resolve when timelines change.
     
  }, [timelines]);

  // Playhead-driven active event when nothing is locked.
  useEffect(() => {
    if (lockedEvent) return;

    let mostRecentEvent: IEvent | null = null;
    let mostRecentTime = -1;

    const allEvents = getAllEvents(timelines);
    allEvents.forEach(event => {
      const title = event.getTitle(currentTime);
      if (title !== '') {
        const visibleReveal = event.reveals
          .filter(reveal => reveal.playtimeTimestamp <= currentTime)
          .at(-1);

        if (visibleReveal && visibleReveal.playtimeTimestamp > mostRecentTime) {
          mostRecentEvent = event;
          mostRecentTime = visibleReveal.playtimeTimestamp;
        }
      }
    });

    setActiveEvent(mostRecentEvent);
  }, [currentTime, timelines, lockedEvent]);

  const handleEventClick = useCallback(
    (event: IEvent) => {
      const lockAction: 'lock' | 'unlock' | 'switch' =
        lockedEvent?.id === event.id
          ? 'unlock'
          : lockedEvent
            ? 'switch'
            : 'lock';

      if (analyticsEnabled) {
        posthog.capture('timeline_event_group_click', {
          event_group_id: event.eventGroup.id,
          event_id: event.id,
          lock_action: lockAction,
          ...(lockAction === 'switch' && lockedEvent
            ? { previous_locked_event_id: lockedEvent.id }
            : {}),
          ...(datasetId ? { dataset_id: datasetId } : {}),
        });
      }

      if (lockedEvent?.id === event.id) {
        setLockedEvent(null);
      } else {
        setLockedEvent(event);
      }
    },
    [analyticsEnabled, datasetId, lockedEvent, posthog]
  );

  const handleEventHover = useCallback(
    (event: IEvent) => {
      if (!lockedEvent) {
        setActiveEvent(event);
      }
      if (analyticsEnabled) {
        const now = Date.now();
        const last = hoverThrottleRef.current;
        if (last && last.eventId === event.id && now - last.at < HOVER_THROTTLE_MS) {
          return;
        }
        hoverThrottleRef.current = { eventId: event.id, at: now };
        posthog.capture('timeline_event_hover', {
          event_group_id: event.eventGroup.id,
          event_id: event.id,
          ...(datasetId ? { dataset_id: datasetId } : {}),
        });
      }
    },
    [analyticsEnabled, datasetId, lockedEvent, posthog]
  );

  const handleEventHoverEnd = useCallback(() => {
    if (!lockedEvent) {
      setActiveEvent(null);
    }
  }, [lockedEvent]);

  const eventToShow = lockedEvent || activeEvent;

  const handleViewerLockToggle = useCallback(() => {
    if (eventToShow) {
      handleEventClick(eventToShow);
    }
  }, [eventToShow, handleEventClick]);

  return {
    lockedEvent,
    activeEvent,
    eventToShow,
    handleEventClick,
    handleEventHover,
    handleEventHoverEnd,
    handleViewerLockToggle,
  };
}
