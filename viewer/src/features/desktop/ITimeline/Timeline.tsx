import React, { type CSSProperties } from 'react';
import type { ITimeline, IEvent } from '../../../types/interfaces';
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
  const timelineColors = ['#62c8ff', '#f0bd64', '#ed7890', '#9a8cff', '#67d2a0'];
  const timelineColor =
    timelineColors[props.timelineIndex % timelineColors.length];

  // don't mark as erased 
  const narrativeStatus = props.timeline.getNarrativeState(props.currentTime) == 'not-reached' ? 'not-reached' : 'canonical';
  
  
  return (
    <div 
      className={`i-timeline ${narrativeStatus}`}
      id={`timeline-${props.timeline.id}`}
      style={{ '--timeline-color': timelineColor } as CSSProperties}
    >
      <span className="desktop-timeline-label">{props.timeline.name}</span>
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