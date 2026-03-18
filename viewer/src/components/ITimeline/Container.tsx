import React, { useState, useEffect } from 'react';
import type { IEvent, ITimeline } from '../../types/interfaces';
import ViewPort from './ViewPort';
import ResizableEventViewer from './ResizableEventViewer';
import './ITimeline.css';

/**
 * ITimelineContainer - Main container component for immutable timeline visualization
 * 
 * This component serves as the primary interface for timeline interaction, combining
 * the timeline visualization with event details. It manages all timeline-related state
 * locally, including event locking and hover interactions.
 * 
 * Key responsibilities:
 * - Manages lockedEvent and activeEvent state for timeline interactions
 * - Handles event click (lock/unlock toggle) and hover interactions
 * - Automatically determines which event should be active based on current time
 * - Coordinates between ViewPort and IEventViewer components
 * - Provides a unified interface for timeline data and interactions
 * 
 * Layout:
 * - Timeline viewer on the left (flexible width)
 * - Event viewer on the right (fixed width of 384px)
 * - Side-by-side layout for better user experience
 */
interface ITimelineContainerProps {
  timelines: ITimeline[];
  currentTime: number;
  onTimeChange: (time: number) => void;
  episodes?: Array<{ id: string; episodeNumber: number; title: string; duration: number }>;
  dataSelector?: React.ReactNode;
}

const ITimelineContainer: React.FC<ITimelineContainerProps> = ({
  timelines,
  currentTime,
  onTimeChange,
  episodes = [],
  dataSelector
}) => {
  // State for managing timeline interactions
  const [lockedEvent, setLockedEvent] = useState<IEvent | null>(null);
  const [activeEvent, setActiveEvent] = useState<IEvent | null>(null);

  /** Get all events from timelines (same shape as used elsewhere). */
  const getAllEvents = (tls: ITimeline[]) =>
    tls.flatMap(timeline =>
      timeline.segments.flatMap(segment =>
        segment.subSegments.flatMap(subSegment =>
          subSegment.eventGroups.flatMap(group => group.events)
        )
      )
    );

  /**
   * When timelines are replaced (e.g. after WebSocket refresh), re-resolve locked/active
   * event by id so the event viewer gets the new event objects and re-renders updated content.
   */
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
  }, [timelines]);

  /**
   * Automatically update activeEvent based on currentTime when no event is locked
   * This ensures the event viewer shows the most relevant event based on playback position
   */
  useEffect(() => {
    if (!lockedEvent) {
      // If no locked event, find the most recent event with a visible reveal
      let mostRecentEvent: IEvent | null = null;
      let mostRecentTime = -1;
      
      // Get all events from all timelines
      const allEvents = timelines.flatMap(timeline => 
        timeline.segments.flatMap(segment => 
          segment.subSegments.flatMap(subSegment => 
            subSegment.eventGroups.flatMap(group => group.events)
          )
        )
      );
      
      allEvents.forEach(event => {
        const title = event.getTitle(currentTime);
        if (title !== '') {
          // Find the most recent reveal for this event
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
    }
  }, [currentTime, timelines, lockedEvent]);

  /**
   * Handle event click - implements toggle lock/unlock behavior
   * - Click same locked event: unlocks it
   * - Click different event: locks the new event
   */
  const handleEventClick = (event: IEvent) => {
    // Toggle lock/unlock behavior
    if (lockedEvent?.id === event.id) {
      // If clicking the same event that's already locked, unlock it
      setLockedEvent(null);
    } else {
      // Otherwise, lock the clicked event
      setLockedEvent(event);
    }
  };

  /**
   * Handle event hover - sets activeEvent for preview (only when no event is locked)
   */
  const handleEventHover = (event: IEvent) => {
    // Set activeEvent on hover (only if no lockedEvent)
    if (!lockedEvent) {
      setActiveEvent(event);
    }
  };

  /**
   * Handle event hover end - clears activeEvent (only when no event is locked)
   */
  const handleEventHoverEnd = () => {
    // Clear activeEvent on hover end (only if no lockedEvent)
    if (!lockedEvent) {
      setActiveEvent(null);
    }
  };

  // Determine which event to show in the viewer (lockedEvent takes priority over activeEvent)
  const eventToShow = lockedEvent || activeEvent;

  return (
    <div className="timeline-container">
      <ViewPort
        timelines={timelines}
        events={timelines.flatMap(timeline => 
          timeline.segments.flatMap(segment => 
            segment.subSegments.flatMap(subSegment => 
              subSegment.eventGroups.flatMap(group => group.events)
            )
          )
        )}
        isLoading={false}
        currentTime={currentTime}
        onEventClick={handleEventClick}
        onEventHover={handleEventHover}
        onEventHoverEnd={handleEventHoverEnd}
        lockedEvent={lockedEvent}
        activeEvent={activeEvent}
        dataSelector={dataSelector}
      />
      
      <ResizableEventViewer
        event={eventToShow}
        currentTime={currentTime}
        episodes={episodes}
        isLocked={!!lockedEvent}
        initialWidthPercent={15}
        minWidthPercent={10}
        maxWidthPercent={50}
      />
    </div>
  );
};

export { ITimelineContainer }; 