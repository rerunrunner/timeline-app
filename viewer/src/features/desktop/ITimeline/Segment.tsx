import React from 'react';
import type { ISegment, IEvent, ITimeline } from '../../../types/interfaces';
import SubSegment from './SubSegment';

/**
 * Segment - Component for rendering an immutable timeline segment
 * 
 * This component represents a single segment within an immutable timeline, containing
 * multiple subsegments and events. It handles the layout and positioning
 * of events within the segment boundaries.
 * 
 * Key responsibilities:
 * - Renders segment structure and layout
 * - Positions events within the segment based on their narrative timestamps
 * - Manages segment visibility and interaction states
 * - Coordinates with ISubSegment components for rendering
 * - Handles event positioning calculations
 * - Passes timeline context to event groups for apparent-timeline positioning
 */
interface SegmentProps {
  segment: ISegment;
  timelineId: string;
  segmentIndex: number;
  onEventClick: (event: IEvent) => void;
  onEventHover: (event: IEvent) => void;
  onEventHoverEnd: () => void;
  currentTime: number;
  lockedEvent: IEvent | null;
  activeEvent: IEvent | null;
  allTimelines: ITimeline[];
  timelineSpacing?: number;
}

const Segment: React.FC<SegmentProps> = ({
  segment,
  timelineId,
  segmentIndex,
  onEventClick,
  onEventHover,
  onEventHoverEnd,
  currentTime,
  lockedEvent,
  activeEvent,
  allTimelines,
  timelineSpacing = 80
}) => {
  // Get narrative status for this segment
  const narrativeStatus = segment.getNarrativeState(currentTime);
  
  // Determine segment CSS classes based on position and visibility
  const segmentClasses = [
    'i-timeline-segment',
    segment.isFirst ? 'leftmost' : '',
    segment.isLast ? 'rightmost' : '',
    Math.floor(segmentIndex / 2) % 2 === 1 ? 'event-card-lower' : '',
    narrativeStatus
  ].filter(Boolean).join(' ');

  const segmentId = `${timelineId}-seg${segmentIndex}`;
  
  return (
    <div
      id={segmentId}
      className={segmentClasses}
      style={{ 
        width: `${segment.fractionOfTimeline}%`
      }}
      data-start-date={segment.start.toISOString().split('T')[0]}
      data-end-date={segment.end.toISOString().split('T')[0]}
    >
      {/* Render subsegments within this segment */}
      {segment.subSegments.map((subSegment, subSegmentIndex) => (
        <SubSegment
          key={`subsegment-${subSegmentIndex}`}
          subSegment={subSegment}
          subSegmentIndex={subSegmentIndex}
          onEventClick={onEventClick}
          onEventHover={onEventHover}
          onEventHoverEnd={onEventHoverEnd}
          currentTime={currentTime}
          segment={segment}
          lockedEvent={lockedEvent}
          activeEvent={activeEvent}
          segmentId={segmentId}
          allTimelines={allTimelines}
          timelineSpacing={timelineSpacing}
        />
      ))}
    </div>
  );
};

export default Segment; 