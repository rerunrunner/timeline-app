import type { ISegment, ITimeline } from '../types/interfaces';

/**
 * Calculate the apparent timeline transform for an immutable segment
 * 
 * @param segment - The immutable segment with events and methods
 * @param currentTime - Current playhead position in seconds
 * @param timelineId - The canonical timeline ID for this segment
 * @param timelineIndex - The index of the canonical timeline
 * @param allTimelines - Array of all timelines for index lookup
 * @param timelineSpacing - Vertical spacing between timeline rows in pixels
 * @returns The transform value in pixels, or 0 if no transform needed
 */
export function calculateImmutableApparentTimelineTransform(
  segment: ISegment,
  currentTime: number,
  timelineId: string,
  timelineIndex: number,
  allTimelines: ITimeline[],
  timelineSpacing: number = 80
): number {
  const apparentTimelineId = segment.getApparentTimeline(currentTime, timelineId);
  const apparentTimelineIndex = allTimelines.findIndex(t => t.id === apparentTimelineId);
  
  if (apparentTimelineIndex === -1) return 0;
  
  const delta = apparentTimelineIndex - timelineIndex;
  return delta * timelineSpacing;
}

/**
 * Get timeline index by ID
 * 
 * @param timelineId - The timeline ID to find
 * @param allTimelines - Array of all timelines
 * @returns The index of the timeline, or -1 if not found
 */
export function getTimelineIndex(timelineId: string, allTimelines: Array<{ id: string }>): number {
  return allTimelines.findIndex(t => t.id === timelineId);
} 