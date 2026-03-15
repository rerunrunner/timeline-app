import React, { useState } from 'react';
import type { IEvent, ITimeline } from '../../types/interfaces';
import ITimelineContent from './TimelineContent';

/**
 * ViewPort - Component that provides the scrollable viewport for timeline visualization
 * 
 * This component serves as a container that applies the timeline-viewer styling
 * and provides the scrollable area for the timeline content. It sits between
 * ITimelineContainer and ITimelineContent to separate layout concerns.
 * 
 * Key responsibilities:
 * - Provides the scrollable viewport with timeline-viewer styling
 * - Contains the ITimelineContent component
 * - Manages the visual presentation of the timeline area
 */
interface ViewPortProps {
  timelines: ITimeline[];
  events: IEvent[];
  isLoading: boolean;
  currentTime: number;
  onEventClick: (event: IEvent) => void;
  onEventHover: (event: IEvent) => void;
  onEventHoverEnd: () => void;
  lockedEvent: IEvent | null;
  activeEvent: IEvent | null;
}

export default function ViewPort({
  timelines,
  events,
  isLoading,
  currentTime,
  onEventClick,
  onEventHover,
  onEventHoverEnd,
  lockedEvent,
  activeEvent
}: ViewPortProps) {
  const [timelineWidth, setTimelineWidth] = useState(100); // Default to 200%
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false); // Default to enabled

  return (
    <div className="timeline-viewport-container">
      {/* Timeline Controls - Fixed position outside scrollable area */}
      <div className="timeline-controls">
        <div className="timeline-width-control">
          <label htmlFor="timeline-width-slider" className="width-control-label">
            Timeline Width: {timelineWidth}%
          </label>
          <input
            id="timeline-width-slider"
            type="range"
            min="100"
            max="400"
            value={timelineWidth}
            onChange={(e) => setTimelineWidth(Number(e.target.value))}
            className="width-control-slider"
          />
        </div>
        
        <div className="auto-scroll-control">
          <label className="auto-scroll-label">
            <input
              type="checkbox"
              checked={autoScrollEnabled}
              onChange={(e) => setAutoScrollEnabled(e.target.checked)}
              className="auto-scroll-checkbox"
            />
            Auto-scroll to new events
          </label>
        </div>
      </div>

      {/* Scrollable timeline viewer */}
      <div id="timeline-viewer" className="timeline-viewer" data-testid="immutable-timeline-viewer">
        <ITimelineContent
          timelines={timelines}
          events={events}
          isLoading={isLoading}
          currentTime={currentTime}
          onEventClick={onEventClick}
          onEventHover={onEventHover}
          onEventHoverEnd={onEventHoverEnd}
          lockedEvent={lockedEvent}
          activeEvent={activeEvent}
          timelineWidth={timelineWidth}
          autoScrollEnabled={autoScrollEnabled}
        />
      </div>
    </div>
  );
} 