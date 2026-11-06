import { describe, it, expect } from 'vitest';
import { groupEventsInSubSegments } from './eventGrouping';
import type { RawEvent, RawTimeline } from './types';

function makeEvent(
  id: string,
  timelineId: string,
  narrativeDate: string
): RawEvent {
  return {
    id,
    timelineId,
    shortDescription: id,
    narrativeDate,
    tags: [],
    reveals: []
  };
}

function makeTimeline(id: string, events: RawEvent[]): RawTimeline {
  return {
    id,
    name: id,
    slices: [],
    segments: [{
      id: `${id}-segment`,
      name: 'Segment',
      start: new Date('2023-01-01T00:00:00Z'),
      end: new Date('2023-01-03T00:00:00Z'),
      scale: 1,
      fractionOfTimeline: 1,
      timelineId: id,
      narrativeStatus: 'active',
      subSegments: [{
        id: `${id}-subsegment`,
        start: new Date('2023-01-01T00:00:00Z'),
        end: new Date('2023-01-03T00:00:00Z'),
        fractionOfSegment: 1,
        events,
        eventGroups: []
      }]
    }]
  };
}

describe('groupEventsInSubSegments', () => {
  it('groups events by timeline and calendar date, then sorts groups', () => {
    const timeline = makeTimeline('timeline-1', [
      makeEvent('event-1', 'timeline-1', '2023-01-01T10:00:00Z'),
      makeEvent('event-2', 'timeline-1', '2023-01-01T14:00:00Z'),
      makeEvent('event-3', 'timeline-1', '2023-01-02T09:00:00Z'),
      makeEvent('event-4', 'timeline-2', '2023-01-01T16:00:00Z')
    ]);

    groupEventsInSubSegments([timeline]);

    const groups = timeline.segments[0].subSegments[0].eventGroups;
    expect(groups).toHaveLength(3);
    expect(groups.map(group => [group.timelineId, group.date])).toEqual([
      ['timeline-1', '2023-01-01'],
      ['timeline-2', '2023-01-01'],
      ['timeline-1', '2023-01-02']
    ]);
    expect(groups[0].events.map(event => event.id)).toEqual(['event-1', 'event-2']);
    expect(groups[1].events.map(event => event.id)).toEqual(['event-4']);
    expect(groups[2].events.map(event => event.id)).toEqual(['event-3']);
  });

  it('leaves an empty subsegment with no event groups', () => {
    const timeline = makeTimeline('timeline-1', []);

    groupEventsInSubSegments([timeline]);

    expect(timeline.segments[0].subSegments[0].eventGroups).toEqual([]);
  });

  it('groups events independently in every segment and subsegment', () => {
    const timeline = makeTimeline('timeline-1', [
      makeEvent('event-1', 'timeline-1', '2023-01-01T10:00:00Z')
    ]);
    timeline.segments.push({
      ...timeline.segments[0],
      id: 'second-segment',
      subSegments: [{
        id: 'second-subsegment',
        start: new Date('2023-01-02T00:00:00Z'),
        end: new Date('2023-01-03T00:00:00Z'),
        fractionOfSegment: 1,
        events: [makeEvent('event-2', 'timeline-1', '2023-01-02T10:00:00Z')],
        eventGroups: []
      }]
    });

    groupEventsInSubSegments([timeline]);

    expect(timeline.segments[0].subSegments[0].eventGroups).toHaveLength(1);
    expect(timeline.segments[1].subSegments[0].eventGroups).toHaveLength(1);
    expect(timeline.segments[1].subSegments[0].eventGroups[0].date).toBe('2023-01-02');
  });

  it('preserves existing subsegment properties while adding groups', () => {
    const timeline = makeTimeline('timeline-1', [
      makeEvent('event-1', 'timeline-1', '2023-01-01T10:00:00Z')
    ]);
    const subsegment = timeline.segments[0].subSegments[0];

    groupEventsInSubSegments([timeline]);

    expect(subsegment.id).toBe('timeline-1-subsegment');
    expect(subsegment.fractionOfSegment).toBe(1);
    expect(subsegment.events).toHaveLength(1);
    expect(subsegment.eventGroups).toHaveLength(1);
  });
});
