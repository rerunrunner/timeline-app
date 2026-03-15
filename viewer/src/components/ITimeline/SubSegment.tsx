import React from 'react';
import type { ISubSegment, IEvent, ISegment } from '../../types/interfaces';
import EventGroup from './EventGroup';

interface SubSegmentProps {
  subSegment: ISubSegment;
  subSegmentIndex: number;
  onEventClick: (event: IEvent) => void;
  onEventHover: (event: IEvent) => void;
  onEventHoverEnd: () => void;
  currentTime: number;
  segment: ISegment;
  lockedEvent: IEvent | null;
  activeEvent: IEvent | null;
  segmentId: string;
}

const SubSegment: React.FC<SubSegmentProps> = ({
  subSegment,
  subSegmentIndex,
  onEventClick,
  onEventHover,
  onEventHoverEnd,
  currentTime,
  segment,
  lockedEvent,
  activeEvent,
  segmentId
}) => {
  const subSegmentId = `${segmentId}-subseg${subSegmentIndex}`;
  
  // Get narrative status for this subsegment
  const narrativeStatus = subSegment.getNarrativeState(currentTime);
  
  // Helper to calculate position for an event group within this subsegment
  const getEventGroupPosition = (eventGroup: any): number => {
    // Use the event group's date to determine position at midnight boundaries
    // Extract the date from the event group ID (format: timelineId-YYYY-MM-DD)
    const datePart = eventGroup.id.split('-').slice(-3).join('-'); // Get YYYY-MM-DD part
    const midnightTime = new Date(datePart + 'T00:00:00Z').getTime();
    
    const subSegmentStart = subSegment.start.getTime();
    const subSegmentEnd = subSegment.end.getTime();
    const subSegmentDuration = subSegmentEnd - subSegmentStart;
    
    if (subSegmentDuration === 0) return 0;
    
    const eventOffset = midnightTime - subSegmentStart;
    return (eventOffset / subSegmentDuration) * 100;
  };
  
  return (
    <div
      id={subSegmentId}
      className={`i-timeline-subsegment ${narrativeStatus}`}
      style={{
        width: `${subSegment.fractionOfSegment * 100}%`,
        height: '100%'
      }}

      data-start-date={subSegment.start.toISOString().split('T')[0]}
      data-end-date={subSegment.end.toISOString().split('T')[0]}
    >
      {/* Render event groups within this subsegment */}
      {subSegment.eventGroups.map((eventGroup) => (
        <EventGroup
          key={eventGroup.id}
          eventGroup={eventGroup}
          currentTime={currentTime}
          onEventClick={onEventClick}
          onEventHover={onEventHover}
          onEventHoverEnd={onEventHoverEnd}
          lockedEvent={lockedEvent}
          activeEvent={activeEvent}
          position={getEventGroupPosition(eventGroup)}
        />
      ))}
    </div>
  );
};

export default SubSegment;
