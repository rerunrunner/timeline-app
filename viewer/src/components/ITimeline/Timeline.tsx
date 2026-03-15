import React from 'react';
import type { ITimeline, ISegment, IEvent } from '../../types/interfaces';
import Segment from './Segment';

interface ITimelineComponentProps {
  timeline: ITimeline;
  events: IEvent[];
  onEventClick: (event: IEvent) => void;
  onEventHover: (event: IEvent) => void;
  onEventHoverEnd: () => void;
  globalStartTime: number;
  globalEndTime: number;
  currentTime: number;
  lockedEvent: IEvent | null;
  activeEvent: IEvent | null;
  timelineIndex: number;
  allTimelines: ITimeline[];
  timelineSpacing: number;
  globalTimeslipInEvents: IEvent[];
}

export default function ITimelineComponent(props: ITimelineComponentProps) {
  
  
  // don't mark as erased 
  const narrativeStatus = props.timeline.getNarrativeState(props.currentTime) == 'not-reached' ? 'not-reached' : 'canonical';
  
  
  return (
    <div 
      className={`i-timeline ${narrativeStatus}`}
      id={`timeline-${props.timeline.id}`}
    >
      {/* Render segments using Segment component */}
      {props.timeline.segments.map((segment, segmentIndex) => (
        <Segment
          key={segment.id}
          segment={segment}
          timelineId={props.timeline.id}
          segmentIndex={segmentIndex}
          onEventClick={props.onEventClick}
          onEventHover={props.onEventHover}
          onEventHoverEnd={props.onEventHoverEnd}
          currentTime={props.currentTime}
          lockedEvent={props.lockedEvent}
          activeEvent={props.activeEvent}
          timelineIndex={props.timelineIndex}
          allTimelines={props.allTimelines}
          timelineSpacing={props.timelineSpacing}
        />
      ))}
    </div>
  );
} 