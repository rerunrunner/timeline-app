import type { NarrativeDate } from '../../types/interfaces';
import type { RawEvent, RawSegment, RawEventGroup, RawSubSegment, RawTimeline } from './types';

/**
 * Internal interfaces for subsegment data structures during hydration.
 */

/**
 * Step 4: Create subsegments within each segment
 * Subsegments are determined by timeslip events (events that cause timeline transitions)
 * This adapts the existing createSubSegments algorithm from SegmentView
 * 
 * SubSegmentation Rules:
 * - timeslip-in: Starts a new subsegment
 * - timeslip-out: Stays in the same subsegment as the previous timeslip-in
 * - Multiple timeslips at the same timestamp: Throws error
 * - Timeslips at segment boundaries: Included in first/last subsegment (no zero-length subsegments)
 */
export function createSubSegmentsWithinSegments(
  timelines: RawTimeline[],
  rawEvents: RawEvent[]
): void {
  // Identify all timeslip events that can create subsegment boundaries
      const timeslipEvents = rawEvents.filter(event =>
        event.eventType === 'timeslip-in' ||
        event.eventType === 'timeslip-out'
      );
  
  // Process each timeline's segments
  timelines.forEach((timeline: RawTimeline) => {
    if (!timeline.segments) {
      return;
    }
    
    timeline.segments.forEach((segment: RawSegment, segmentIndex: number) => {
      const segmentId = segment.id;
      const segmentStart = segment.start.getTime();
      const segmentEnd = segment.end.getTime();
      
      // Find ALL timeslip events that fall within this segment (from any timeline)
      // This matches the legacy system behavior where global timeslip events create subsegment boundaries
      const segmentTimeslipEvents = timeslipEvents.filter(event => {
        const eventTime = new Date(event.narrativeDate).getTime();
        return eventTime >= segmentStart && eventTime <= segmentEnd;
      });
      
      // Check for multiple timeslips at the same timestamp WITHIN THE SAME TIMELINE
      // Timeslips from different timelines can occur at the same timestamp
      const eventsByTimeline = new Map<string, RawEvent[]>();
      segmentTimeslipEvents.forEach(event => {
        if (!eventsByTimeline.has(event.timelineId)) {
          eventsByTimeline.set(event.timelineId, []);
        }
        eventsByTimeline.get(event.timelineId)!.push(event);
      });
      
      // Check each timeline for duplicate timestamps
      for (const [timelineId, timelineEvents] of eventsByTimeline) {
        const timeslipTimestamps = timelineEvents.map(event => new Date(event.narrativeDate).getTime());
        const uniqueTimestamps = [...new Set(timeslipTimestamps)];
        if (uniqueTimestamps.length !== timeslipTimestamps.length) {
          const duplicateTimestamps = timeslipTimestamps.filter((timestamp, index) => 
            timeslipTimestamps.indexOf(timestamp) !== index
          );
          const duplicateTime = new Date(duplicateTimestamps[0]).toISOString();
          throw new Error(
            `Multiple timeslip events found at the same timestamp (${duplicateTime}) in timeline ${timelineId}, segment ${segmentId}. ` +
            `Please stagger the timeslips by at least 1 second to avoid conflicts.`
          );
        }
      }
      
      // Create subsegment boundaries based on timeslip-in events only
      // timeslip-out events do not create boundaries
          const boundaryEvents = segmentTimeslipEvents.filter(event =>
            event.eventType === 'timeslip-in'
          );
      
      // Create subsegment boundaries
      const boundaries = [segmentStart];
      
      // Add timeslip-in event times as boundaries (excluding segment boundaries)
      boundaryEvents.forEach(event => {
        const eventTime = new Date(event.narrativeDate).getTime();
        if (eventTime > segmentStart && eventTime < segmentEnd) {
          boundaries.push(eventTime);
        }
      });
      
      // Add the segment end time
      boundaries.push(segmentEnd);
      
      // Sort boundaries chronologically and remove duplicates
      const uniqueBoundaries = [...new Set(boundaries)].sort((a, b) => a - b);
      
      // Handle zero-duration segments by ensuring at least one subsegment
      if (uniqueBoundaries.length === 1) {
        uniqueBoundaries.push(uniqueBoundaries[0]);
      }
      
      // Create subsegments between boundaries
      const subSegments: RawSubSegment[] = [];
      for (let i = 0; i < uniqueBoundaries.length - 1; i++) {
        const subSegmentStart = uniqueBoundaries[i];
        const subSegmentEnd = uniqueBoundaries[i + 1];
        
        // Find events that belong to this subsegment (only from this timeline)
        const subSegmentEvents = rawEvents.filter(event => {
          const eventTime = new Date(event.narrativeDate).getTime();
          // Only include events from this timeline
          if (event.timelineId !== timeline.id) {
            return false;
          }
          // Include events that are exactly at the start boundary or within the subsegment
          // For the last subsegment, include events at the end boundary
          if (i === uniqueBoundaries.length - 2) {
            // Last subsegment includes the end boundary
            return eventTime >= subSegmentStart && eventTime <= subSegmentEnd;
          } else {
            // Other subsegments include start boundary but exclude end boundary
            return eventTime >= subSegmentStart && eventTime < subSegmentEnd;
          }
        });
        
        // Calculate subsegment fraction based on time duration
        const segmentDuration = segmentEnd - segmentStart;
        const subSegmentDuration = subSegmentEnd - subSegmentStart;
        const fractionOfSegment = segmentDuration > 0 ? subSegmentDuration / segmentDuration : 1.0 / (uniqueBoundaries.length - 1);
        
        const subSegment: RawSubSegment = {
          id: `${segmentId}-subsegment-${i}`,
          start: new Date(subSegmentStart),
          end: new Date(subSegmentEnd),
          events: subSegmentEvents,
          eventGroups: [], // Will be populated in Step 5
          fractionOfSegment
        };
        
        subSegments.push(subSegment);
      }
      
      // Add subsegments to the segment
      segment.subSegments = subSegments;
    });
  });
}
