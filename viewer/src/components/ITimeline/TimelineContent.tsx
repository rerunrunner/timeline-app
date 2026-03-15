import React, { useEffect, useRef } from 'react';
import type { ITimeline, IEvent } from '../../types/interfaces';
import ITimelineComponent from './Timeline';
import ITimeRuler from './TimeRuler';

/**
 * ITimelineContent - Component for rendering multiple immutable timeline visualizations
 * 
 * This component is responsible for displaying all timelines in the application,
 * calculating global time segments, and coordinating the rendering of individual
 * timeline components. It serves as the main visualization layer for timeline data.
 * 
 * Key responsibilities:
 * - Calculates global time range across all timelines
 * - Determines global segments for consistent timeline scaling
 * - Renders multiple ITimeline components (one per timeline)
 * - Coordinates event visibility and interaction state
 */
interface ITimelineContentProps {
  timelines: ITimeline[];
  events: IEvent[];
  isLoading: boolean;
  currentTime: number;
  onEventClick: (event: IEvent) => void;
  onEventHover: (event: IEvent) => void;
  onEventHoverEnd: () => void;
  lockedEvent: IEvent | null;
  activeEvent: IEvent | null;
  timelineWidth: number;
  autoScrollEnabled: boolean;
}

export default function ITimelineContent({ 
  timelines, 
  events, 
  isLoading, 
  currentTime, 
  onEventClick,
  onEventHover,
  onEventHoverEnd,
  lockedEvent,
  activeEvent,
  timelineWidth,
  autoScrollEnabled
}: ITimelineContentProps) {
  const previousTimeRef = useRef(currentTime);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Function to get the scrollable viewport element
  const getScrollableViewport = (): HTMLElement | null => {
    // Find the parent timeline-viewer element (the actual scrollable container)
    return document.querySelector('.timeline-viewer') as HTMLElement;
  };

  // Function to check if an element is visible in the viewport
  const isElementInViewport = (element: Element): boolean => {
    const viewport = getScrollableViewport();
    if (!viewport) return false;
    
    const viewportRect = viewport.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    // Check if the element is within the viewport bounds
    return (
      elementRect.left >= viewportRect.left &&
      elementRect.right <= viewportRect.right &&
      elementRect.top >= viewportRect.top &&
      elementRect.bottom <= viewportRect.bottom
    );
  };

  // Function to scroll to a newly revealed event (only if not visible)
  const scrollToNewlyRevealedEvent = (event: IEvent) => {
    const viewport = getScrollableViewport();
    if (!viewport) return;
    
    // Find the event group container for this event
    const eventGroupId = event.eventGroup.id;
    const eventGroupElement = document.querySelector(`[data-event-group-id="${eventGroupId}"]`);
    
    if (eventGroupElement) {
      // Add highlight animation class regardless
      eventGroupElement.classList.add('newly-revealed');
      
      // Only scroll if the element is not visible in the viewport
      if (!isElementInViewport(eventGroupElement)) {
        // Calculate the scroll position to center the element in the viewport
        const viewportRect = viewport.getBoundingClientRect();
        const elementRect = eventGroupElement.getBoundingClientRect();
        
        // Calculate the scroll offset needed to center the element
        const scrollLeft = viewport.scrollLeft + (elementRect.left - viewportRect.left) - (viewportRect.width / 2) + (elementRect.width / 2);
        
        // Smooth scroll to the calculated position
        viewport.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });
      }
      
      // Remove the highlight class after animation
      setTimeout(() => {
        eventGroupElement.classList.remove('newly-revealed');
      }, 2000);
    }
  };

  // Check for newly revealed events when currentTime changes
  useEffect(() => {
    if (previousTimeRef.current !== currentTime) {
      const previousTime = previousTimeRef.current;
      
      // Find events that were just revealed
      events.forEach(event => {
        const wasVisibleBefore = event.reveals.some(reveal => 
          reveal.playtimeTimestamp <= previousTime
        );
        const isVisibleNow = event.reveals.some(reveal => 
          reveal.playtimeTimestamp <= currentTime
        );
        
        // If event just became visible, we're not locked on another event, and auto-scroll is enabled
        if (!wasVisibleBefore && isVisibleNow && !lockedEvent && autoScrollEnabled) {
          scrollToNewlyRevealedEvent(event);
        }
      });
      
      previousTimeRef.current = currentTime;
    }
  }, [currentTime, events, lockedEvent]);

  // Show loading state while timelines are being loaded
  if (isLoading || timelines.length === 0) {
    return <div>Loading timelines...</div>;
  }

  // Use segments from the first timeline (they should all be identical since they're calculated globally)
  const segments = timelines[0].segments;

  // Calculate global time range from the first timeline
  const globalStartTime = timelines[0].start.getTime();
  const globalEndTime = timelines[0].end.getTime();

  // Collect all timeslip-in events from all timelines for subsegment boundary creation
  const globalTimeslipInEvents = events.filter(event => event.eventType === 'timeslip-in');

  return (
    <div 
      id="timeline-content" 
      className="timeline-content" 
      data-testid="immutable-timeline-content"
      ref={viewportRef}
      style={{ width: `${timelineWidth}%`, minWidth: `${timelineWidth}%` }}
    >
        {/* Time Ruler showing anchor dates/years */}
        <ITimeRuler
          globalStartTime={globalStartTime}
          globalEndTime={globalEndTime}
          segments={segments}        
        />
      
      {/* Render each timeline as a separate ITimeline component */}
      {timelines.map((timeline, timelineIndex) => {
        // Get events for this timeline
        const timelineEvents = events.filter(event => 
          event.eventGroup.subSegment.segment.timeline.id === timeline.id
        );

        return (
          <ITimelineComponent
            key={timeline.id}
            timeline={timeline}
            events={timelineEvents}
            onEventClick={onEventClick}
            onEventHover={onEventHover}
            onEventHoverEnd={onEventHoverEnd}
            globalStartTime={globalStartTime}
            globalEndTime={globalEndTime}
            currentTime={currentTime}
            lockedEvent={lockedEvent}
            activeEvent={activeEvent}
            timelineIndex={timelineIndex}
            allTimelines={timelines}
            timelineSpacing={122}
            globalTimeslipInEvents={globalTimeslipInEvents}
          />
        );
      })}
    </div>
  );
} 