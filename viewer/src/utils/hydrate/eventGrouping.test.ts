import { describe, it, expect } from 'vitest';
import { groupEventsInSubSegments } from './eventGrouping';
import type { RawEvent, RawSegment } from './types';

/**
 * Unit tests for eventGrouping.ts
 * 
 * These tests verify the event grouping logic that groups events within subsegments
 * by timeline and date. Event groups represent collections of events that occur
 * on the same calendar date within the same timeline.
 * 
 * Test Structure:
 * - Each test includes detailed documentation of inputs and expected outputs
 * - Tests cover various scenarios: single timeline, multiple timelines, same date, different dates
 * - Edge cases: no events, single events, multiple events at same time
 * - Validation of group properties: timelineId, date, events array
 */

describe('groupEventsInSubSegments', () => {
  describe('Basic functionality', () => {
    it('should group events by timeline and date within subsegments', () => {
      /**
       * Input:
       * - 1 subsegment with 4 events:
       *   - 2 events on timeline-1, date 2023-01-01
       *   - 1 event on timeline-1, date 2023-01-02
       *   - 1 event on timeline-2, date 2023-01-01
       * 
       * Expected Output:
       * - 3 event groups:
       *   - Group 1: timeline-1, 2023-01-01, 2 events
       *   - Group 2: timeline-2, 2023-01-01, 1 event
       *   - Group 3: timeline-1, 2023-01-02, 1 event
       * - Groups sorted by date, then by timelineId
       */
      
      const subsegmentsBySegmentId = new Map<string, any[]>([
        ['segment-1', [{
          id: 'subsegment-1',
          name: 'SubSegment 1',
          start: new Date('2023-01-01T00:00:00Z'),
          end: new Date('2023-01-03T00:00:00Z'),
          width: 100,
          events: [
            {
              id: 'event-1',
              shortDescription: 'Event 1',
              narrativeDate: '2023-01-01T10:00:00Z',
              timelineId: 'timeline-1',
              tags: [],
              reveals: []
            },
            {
              id: 'event-2',
              shortDescription: 'Event 2',
              narrativeDate: '2023-01-01T14:00:00Z',
              timelineId: 'timeline-1',
              tags: [],
              reveals: []
            },
            {
              id: 'event-3',
              shortDescription: 'Event 3',
              narrativeDate: '2023-01-02T09:00:00Z',
              timelineId: 'timeline-1',
              tags: [],
              reveals: []
            },
            {
              id: 'event-4',
              shortDescription: 'Event 4',
              narrativeDate: '2023-01-01T16:00:00Z',
              timelineId: 'timeline-2',
              tags: [],
              reveals: []
            }
          ],
          timeslipEvents: [],
          segmentId: 'segment-1',
          eventGroups: []
        }]]
      ]);

      const result = groupEventsInSubSegments(subsegmentsBySegmentId);

      expect(result.size).toBe(1);
      const subsegments = result.get('segment-1');
      expect(subsegments).toHaveLength(1);
      
      const subSegment = subsegments![0];
      expect(subSegment.eventGroups).toHaveLength(3);
      
      // Group 1: timeline-1, 2023-01-01
      const group1 = subSegment.eventGroups[0];
      expect(group1.timelineId).toBe('timeline-1');
      expect(group1.date).toBe('2023-01-01');
      expect(group1.events).toHaveLength(2);
      expect(group1.events.map(e => e.id)).toEqual(['event-1', 'event-2']);
      
      // Group 2: timeline-2, 2023-01-01 (alphabetical order when dates are equal)
      const group2 = subSegment.eventGroups[1];
      expect(group2.timelineId).toBe('timeline-2');
      expect(group2.date).toBe('2023-01-01');
      expect(group2.events).toHaveLength(1);
      expect(group2.events[0].id).toBe('event-4');
      
      // Group 3: timeline-1, 2023-01-02
      const group3 = subSegment.eventGroups[2];
      expect(group3.timelineId).toBe('timeline-1');
      expect(group3.date).toBe('2023-01-02');
      expect(group3.events).toHaveLength(1);
      expect(group3.events[0].id).toBe('event-3');
    });

    it('should handle subsegments with no events', () => {
      /**
       * Input:
       * - 1 subSegment with 0 events
       * 
       * Expected Output:
       * - 0 event groups
       */
      
      const subsegmentsBySegmentId = new Map<string, any[]>([
        ['segment-1', [{
          id: 'subsegment-1',
          name: 'Empty SubSegment',
          start: new Date('2023-01-01T00:00:00Z'),
          end: new Date('2023-01-02T00:00:00Z'),
          width: 100,
          events: [],
          timeslipEvents: [],
          segmentId: 'segment-1',
          eventGroups: []
        }]]
      ]);

      const result = groupEventsInSubSegments(subsegmentsBySegmentId);

      const subsegments = result.get('segment-1');
      expect(subsegments).toHaveLength(1);
      expect(subsegments![0].eventGroups).toHaveLength(0);
    });
  });

  describe('Multiple subsegments and segments', () => {
    it('should group events across multiple subsegments and segments', () => {
      /**
       * Input:
       * - Segment 1: 1 subSegment with events on timeline-1, 2023-01-01
       * - Segment 2: 1 subSegment with events on timeline-2, 2023-01-02
       * 
       * Expected Output:
       * - Segment 1: 1 event group (timeline-1, 2023-01-01)
       * - Segment 2: 1 event group (timeline-2, 2023-01-02)
       */
      
      const subsegmentsBySegmentId = new Map<string, any[]>([
        ['segment-1', [{
          id: 'subsegment-1',
          name: 'SubSegment 1',
          start: new Date('2023-01-01T00:00:00Z'),
          end: new Date('2023-01-02T00:00:00Z'),
          width: 100,
          events: [
            {
              id: 'event-1',
              shortDescription: 'Event 1',
              narrativeDate: '2023-01-01T10:00:00Z',
              timelineId: 'timeline-1',
              tags: [],
              reveals: []
            }
          ],
          timeslipEvents: [],
          segmentId: 'segment-1',
          eventGroups: []
        }]],
        ['segment-2', [{
          id: 'subsegment-2',
          name: 'SubSegment 2',
          start: new Date('2023-01-02T00:00:00Z'),
          end: new Date('2023-01-03T00:00:00Z'),
          width: 100,
          events: [
            {
              id: 'event-2',
              shortDescription: 'Event 2',
              narrativeDate: '2023-01-02T10:00:00Z',
              timelineId: 'timeline-2',
              tags: [],
              reveals: []
            }
          ],
          timeslipEvents: [],
          segmentId: 'segment-2',
          eventGroups: []
        }]]
      ]);

      const result = groupEventsInSubSegments(subsegmentsBySegmentId);

      expect(result.size).toBe(2);
      
      // Segment 1
      const segment1SubSegments = result.get('segment-1');
      expect(segment1SubSegments).toHaveLength(1);
      expect(segment1SubSegments![0].eventGroups).toHaveLength(1);
      expect(segment1SubSegments![0].eventGroups[0].timelineId).toBe('timeline-1');
      expect(segment1SubSegments![0].eventGroups[0].date).toBe('2023-01-01');
      
      // Segment 2
      const segment2SubSegments = result.get('segment-2');
      expect(segment2SubSegments).toHaveLength(1);
      expect(segment2SubSegments![0].eventGroups).toHaveLength(1);
      expect(segment2SubSegments![0].eventGroups[0].timelineId).toBe('timeline-2');
      expect(segment2SubSegments![0].eventGroups[0].date).toBe('2023-01-02');
    });
  });

  describe('Sorting behavior', () => {
    it('should sort event groups by date, then by timelineId', () => {
      /**
       * Input:
       * - 1 subSegment with events in mixed order:
       *   - timeline-2, 2023-01-01
       *   - timeline-1, 2023-01-02
       *   - timeline-1, 2023-01-01
       *   - timeline-2, 2023-01-02
       * 
       * Expected Output:
       * - 4 event groups sorted as:
       *   - timeline-1, 2023-01-01
       *   - timeline-2, 2023-01-01
       *   - timeline-1, 2023-01-02
       *   - timeline-2, 2023-01-02
       */
      
      const subsegmentsBySegmentId = new Map<string, any[]>([
        ['segment-1', [{
          id: 'subsegment-1',
          name: 'SubSegment 1',
          start: new Date('2023-01-01T00:00:00Z'),
          end: new Date('2023-01-03T00:00:00Z'),
          width: 100,
          events: [
            {
              id: 'event-1',
              shortDescription: 'Event 1',
              narrativeDate: '2023-01-01T10:00:00Z',
              timelineId: 'timeline-2',
              tags: [],
              reveals: []
            },
            {
              id: 'event-2',
              shortDescription: 'Event 2',
              narrativeDate: '2023-01-02T10:00:00Z',
              timelineId: 'timeline-1',
              tags: [],
              reveals: []
            },
            {
              id: 'event-3',
              shortDescription: 'Event 3',
              narrativeDate: '2023-01-01T14:00:00Z',
              timelineId: 'timeline-1',
              tags: [],
              reveals: []
            },
            {
              id: 'event-4',
              shortDescription: 'Event 4',
              narrativeDate: '2023-01-02T14:00:00Z',
              timelineId: 'timeline-2',
              tags: [],
              reveals: []
            }
          ],
          timeslipEvents: [],
          segmentId: 'segment-1',
          eventGroups: []
        }]]
      ]);

      const result = groupEventsInSubSegments(subsegmentsBySegmentId);

      const subsegments = result.get('segment-1');
      const eventGroups = subsegments![0].eventGroups;
      expect(eventGroups).toHaveLength(4);
      
      // Check sorting order
      expect(eventGroups[0].timelineId).toBe('timeline-1');
      expect(eventGroups[0].date).toBe('2023-01-01');
      
      expect(eventGroups[1].timelineId).toBe('timeline-2');
      expect(eventGroups[1].date).toBe('2023-01-01');
      
      expect(eventGroups[2].timelineId).toBe('timeline-1');
      expect(eventGroups[2].date).toBe('2023-01-02');
      
      expect(eventGroups[3].timelineId).toBe('timeline-2');
      expect(eventGroups[3].date).toBe('2023-01-02');
    });
  });

  describe('Edge cases', () => {
    it('should handle events with different time components on the same date', () => {
      /**
       * Input:
       * - 1 subSegment with 3 events on the same date but different times:
       *   - 2023-01-01T00:00:00Z
       *   - 2023-01-01T12:00:00Z
       *   - 2023-01-01T23:59:59Z
       * 
       * Expected Output:
       * - 1 event group with all 3 events (same date)
       */
      
      const subsegmentsBySegmentId = new Map<string, any[]>([
        ['segment-1', [{
          id: 'subsegment-1',
          name: 'SubSegment 1',
          start: new Date('2023-01-01T00:00:00Z'),
          end: new Date('2023-01-02T00:00:00Z'),
          width: 100,
          events: [
            {
              id: 'event-1',
              shortDescription: 'Event 1',
              narrativeDate: '2023-01-01T00:00:00Z',
              timelineId: 'timeline-1',
              tags: [],
              reveals: []
            },
            {
              id: 'event-2',
              shortDescription: 'Event 2',
              narrativeDate: '2023-01-01T12:00:00Z',
              timelineId: 'timeline-1',
              tags: [],
              reveals: []
            },
            {
              id: 'event-3',
              shortDescription: 'Event 3',
              narrativeDate: '2023-01-01T23:59:59Z',
              timelineId: 'timeline-1',
              tags: [],
              reveals: []
            }
          ],
          timeslipEvents: [],
          segmentId: 'segment-1',
          eventGroups: []
        }]]
      ]);

      const result = groupEventsInSubSegments(subsegmentsBySegmentId);

      const subsegments = result.get('segment-1');
      const eventGroups = subsegments![0].eventGroups;
      expect(eventGroups).toHaveLength(1);
      
      const group = eventGroups[0];
      expect(group.timelineId).toBe('timeline-1');
      expect(group.date).toBe('2023-01-01');
      expect(group.events).toHaveLength(3);
      expect(group.events.map(e => e.id)).toEqual(['event-1', 'event-2', 'event-3']);
    });

    it('should preserve original subSegment properties', () => {
      /**
       * Input:
       * - 1 subSegment with various properties
       * 
       * Expected Output:
       * - SubSegment should retain all original properties
       * - Only eventGroups should be updated
       */
      
      const originalSubSegment = {
        id: 'subsegment-1',
        name: 'Test SubSegment',
        start: new Date('2023-01-01T00:00:00Z'),
        end: new Date('2023-01-02T00:00:00Z'),
        width: 50,
        events: [
          {
            id: 'event-1',
            shortDescription: 'Event 1',
            narrativeDate: '2023-01-01T10:00:00Z',
            timelineId: 'timeline-1',
            tags: [],
            reveals: []
          }
        ],
        timeslipEvents: [],
        segmentId: 'segment-1',
        eventGroups: []
      };

      const subsegmentsBySegmentId = new Map<string, any[]>([
        ['segment-1', [originalSubSegment]]
      ]);

      const result = groupEventsInSubSegments(subsegmentsBySegmentId);

      const subsegments = result.get('segment-1');
      const updatedSubSegment = subsegments![0];
      
      // Check that original properties are preserved
      expect(updatedSubSegment.id).toBe(originalSubSegment.id);
      expect(updatedSubSegment.name).toBe(originalSubSegment.name);
      expect(updatedSubSegment.start).toEqual(originalSubSegment.start);
      expect(updatedSubSegment.end).toEqual(originalSubSegment.end);
      expect(updatedSubSegment.width).toBe(originalSubSegment.width);
      expect(updatedSubSegment.events).toEqual(originalSubSegment.events);
      expect(updatedSubSegment.timeslipEvents).toEqual(originalSubSegment.timeslipEvents);
      expect(updatedSubSegment.segmentId).toBe(originalSubSegment.segmentId);
      
      // Check that eventGroups is updated
      expect(updatedSubSegment.eventGroups).toHaveLength(1);
      expect(updatedSubSegment.eventGroups[0].timelineId).toBe('timeline-1');
      expect(updatedSubSegment.eventGroups[0].date).toBe('2023-01-01');
    });
  });
}); 