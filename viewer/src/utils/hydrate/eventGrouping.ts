import type { RawEvent, RawEventGroup, RawSubSegment, RawTimeline, RawSegment } from './types';

/**
 * Step 5: Group events into event groups within subsegments
 * 
 * This step groups events within each subsegment by timeline and date.
 * Events with the same timelineId and the same calendar date (YYYY-MM-DD)
 * are grouped together into event groups.
 * 
 * Grouping Rules:
 * - Group by timelineId and date (YYYY-MM-DD from narrativeDate)
 * - Each group contains all events for that timeline/date combination
 * - Groups are sorted chronologically by date, then by timelineId
 */
export function groupEventsInSubSegments(
  timelines: RawTimeline[]
): void {
  timelines.forEach((timeline: RawTimeline) => {
    timeline.segments.forEach((segment: RawSegment) => {
      segment.subSegments.forEach((subSegment: RawSubSegment) => {
        // Group events by timeline and date
        const eventGroups = groupEventsByTimelineAndDate(subSegment.events);
        
        // Update subsegment with event groups
        subSegment.eventGroups = eventGroups;
      });
    });
  });
}

/**
 * Group events by timeline and date
 * @param events Array of events to group
 * @returns Array of RawEventGroup objects
 */
function groupEventsByTimelineAndDate(events: RawEvent[]): RawEventGroup[] {
  // Create a map to group events by timeline and date
  const groupedMap = new Map<string, RawEvent[]>();
  
  // Group events by timelineId + date
  events.forEach(event => {
    const date = event.narrativeDate.slice(0, 10); // Extract YYYY-MM-DD
    const key = `${event.timelineId}:${date}`;
    
    if (!groupedMap.has(key)) {
      groupedMap.set(key, []);
    }
    groupedMap.get(key)!.push(event);
  });
  
  // Convert map to RawEventGroup array
  const groupedEvents: RawEventGroup[] = [];
  
  groupedMap.forEach((events, key) => {
    const [timelineId, date] = key.split(':');
    
    // Sort events chronologically by narrative date within this group
    const sortedEvents = events.sort((a, b) => {
      const dateA = new Date(a.narrativeDate).getTime();
      const dateB = new Date(b.narrativeDate).getTime();
      return dateA - dateB;
    });
    
    groupedEvents.push({
      timelineId,
      date,
      events: sortedEvents
    });
  });
  
  // Sort by date and timeline
  return groupedEvents.sort((a, b) => {
    // First sort by date
    const dateComparison = a.date.localeCompare(b.date);
    if (dateComparison !== 0) return dateComparison;
    
    // Then sort by timeline ID
    return a.timelineId.localeCompare(b.timelineId);
  });
} 