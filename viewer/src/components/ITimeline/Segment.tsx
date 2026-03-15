import React from 'react';
import type { ISegment, IEvent, ITimeline } from '../../types/interfaces';
import { calculateImmutableApparentTimelineTransform } from '../../utils/timelineTransforms';
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
 * - Applies apparent timeline transforms for smooth transitions
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
  timelineIndex: number;
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
  timelineIndex,
  allTimelines,
  timelineSpacing = 80
}) => {
  // Calculate apparent timeline transform
  const transformY = calculateImmutableApparentTimelineTransform(
    segment,
    currentTime,
    timelineId,
    timelineIndex,
    allTimelines,
    timelineSpacing
  );

  // Get narrative status for this segment
  const narrativeStatus = segment.getNarrativeState(currentTime);
  
  // Determine segment CSS classes based on position and visibility
  const segmentClasses = [
    'i-timeline-segment',
    segment.isFirst ? 'leftmost' : '',
    segment.isLast ? 'rightmost' : '',
    transformY !== 0 ? 'apparent-timeline' : '',
    narrativeStatus
  ].filter(Boolean).join(' ');

  // Build transform style - combine scaleX (existing) with translateY (apparent timeline)
  const transformStyle = `scaleX(1)${transformY !== 0 ? ` translateY(${transformY}px)` : ''}`;

  const segmentId = `${timelineId}-seg${segmentIndex}`;
  
  return (
    <div
      id={segmentId}
      className={segmentClasses}
      style={{ 
        width: `${segment.fractionOfTimeline}%`,
        transform: transformStyle
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
        />
      ))}
    </div>
  );
};

export default Segment; 