import { describe, expect, it } from 'vitest';
import type { IEventGroup, ITimeline } from '../types/interfaces';
import { calculateEventGroupApparentTimelineTransform } from './timelineTransforms';

function makeEventGroup(reveals: Array<{ playtimeTimestamp: number; apparentTimeline?: string }>): IEventGroup {
  return {
    events: [{ reveals }],
    subSegment: { segment: { timeline: { id: 'timeline-5' } } },
  } as unknown as IEventGroup;
}

const timelines = [
  { id: 'timeline-4' },
  { id: 'timeline-5' },
] as ITimeline[];

describe('calculateEventGroupApparentTimelineTransform', () => {
  it('keeps a group on its apparent timeline until a later reveal returns it to canonical', () => {
    const group = makeEventGroup([
      { playtimeTimestamp: 10, apparentTimeline: 'timeline-4' },
      { playtimeTimestamp: 20 },
    ]);

    expect(calculateEventGroupApparentTimelineTransform(group, 15, timelines)).toBe(-80);
    expect(calculateEventGroupApparentTimelineTransform(group, 20, timelines)).toBe(0);
  });

  it('uses the canonical timeline before the group has a reached reveal', () => {
    const group = makeEventGroup([
      { playtimeTimestamp: 10, apparentTimeline: 'timeline-4' },
    ]);

    expect(calculateEventGroupApparentTimelineTransform(group, 9, timelines)).toBe(0);
  });
});
