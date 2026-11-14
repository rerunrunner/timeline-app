import type { IEventGroup, ISegment, ITimeline } from '../types/interfaces';

/**
 * Calculate the apparent-timeline offset for an event group.
 *
 * The most recently reached reveal in this group determines where the group
 * appears. A reveal without an apparentTimeline returns it to its canonical
 * timeline. The offset is relative to the timeline that owns the group.
 */
export function calculateEventGroupApparentTimelineTransform(
  eventGroup: IEventGroup,
  currentTime: number,
  allTimelines: ITimeline[],
  timelineSpacing: number = 80
): number {
  const canonicalTimelineId = eventGroup.subSegment.segment.timeline.id;
  let mostRecentApparentTimeline: string | undefined;
  let mostRecentRevealTime = -1;
  let hasReachedReveal = false;

  for (const event of eventGroup.events) {
    for (const reveal of event.reveals) {
      if (reveal.playtimeTimestamp <= currentTime && reveal.playtimeTimestamp > mostRecentRevealTime) {
        mostRecentRevealTime = reveal.playtimeTimestamp;
        mostRecentApparentTimeline = reveal.apparentTimeline;
        hasReachedReveal = true;
      }
    }
  }

  const targetTimelineId = hasReachedReveal
    ? mostRecentApparentTimeline ?? canonicalTimelineId
    : canonicalTimelineId;
  const canonicalTimelineIndex = allTimelines.findIndex(timeline => timeline.id === canonicalTimelineId);
  const targetTimelineIndex = allTimelines.findIndex(timeline => timeline.id === targetTimelineId);

  if (canonicalTimelineIndex === -1 || targetTimelineIndex === -1) return 0;

  return (targetTimelineIndex - canonicalTimelineIndex) * timelineSpacing;
}

/**
 * Get timeline index by ID.
 */
export function getTimelineIndex(timelineId: string, allTimelines: Array<{ id: string }>): number {
  return allTimelines.findIndex(timeline => timeline.id === timelineId);
}

// Retained for callers outside the desktop event-group renderer.
export function calculateImmutableApparentTimelineTransform(
  segment: ISegment,
  currentTime: number,
  timelineId: string,
  timelineIndex: number,
  allTimelines: ITimeline[],
  timelineSpacing: number = 80
): number {
  const apparentTimelineId = segment.getApparentTimeline(currentTime, timelineId);
  const apparentTimelineIndex = allTimelines.findIndex(timeline => timeline.id === apparentTimelineId);
  if (apparentTimelineIndex === -1) return 0;
  return (apparentTimelineIndex - timelineIndex) * timelineSpacing;
}
