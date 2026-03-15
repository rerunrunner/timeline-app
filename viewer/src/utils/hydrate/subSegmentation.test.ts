import { describe, it, expect } from 'vitest';
import { createSubSegmentsWithinSegments } from './subSegmentation';
import type { RawEvent, RawSegment, RawTimeline } from './types';

/**
 * Unit tests for subSegmentation.ts
 * 
 * These tests verify the subsegment creation logic that divides segments into smaller
 * subsegments based on timeslip events. Subsegments represent distinct time periods
 * within a segment where timeline transitions occur.
 * 
 * Test Structure:
 * - Each test includes detailed documentation of inputs and expected outputs
 * - Tests cover various scenarios: no timeslip events, single timeslip, multiple timeslips
 * - Edge cases: overlapping events, boundary conditions, empty segments
 * - Validation of subsegment properties: timing, width calculations, event grouping
 */

describe('createSubSegmentsWithinSegments', () => {
  describe('Basic functionality', () => {
    it('should create a single subsegment when no timeslip events exist', () => {
      /**
       * Input:
       * - 1 segment: 2023-01-01 00:00:00 to 2023-01-01 12:00:00
       * - 2 regular events within the segment
       * - 0 timeslip events
       * 
       * Expected Output:
       * - 1 subsegment spanning the entire segment
       * - Subsegment width: 100%
       * - All events included in the subsegment
       * - No timeslip events in subsegment
       */
      
      const timelines: RawTimeline[] = [{
        id: 'timeline-1',
        name: 'Test Timeline',
        slices: [],
        segments: [{
          id: 'segment-1',
          name: 'Morning',
          start: new Date('2023-01-01T00:00:00Z'),
          end: new Date('2023-01-01T12:00:00Z'),
          timelineId: 'timeline-1',
          scale: 1.0,
          subSegments: [],
          fractionOfTimeline: 1.0,
          narrativeStatus: 'active'
        }]
      }];

      const rawEvents: RawEvent[] = [
        {
          id: 'event-1',
          shortDescription: 'Breakfast',
          narrativeDate: '2023-01-01T06:00:00Z',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        },
        {
          id: 'event-2',
          shortDescription: 'Lunch',
          narrativeDate: '2023-01-01T12:00:00Z',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        }
      ];

      createSubSegmentsWithinSegments(timelines, rawEvents);

      const segment = timelines[0].segments[0];
      expect(segment.subSegments).toHaveLength(1);
      
      const subSegment = segment.subSegments[0];
      expect(subSegment.id).toBe('segment-1-subsegment-0');
      expect(subSegment.start).toEqual(new Date('2023-01-01T00:00:00Z'));
      expect(subSegment.end).toEqual(new Date('2023-01-01T12:00:00Z'));
      expect(subSegment.fractionOfSegment).toBe(1.0);
      expect(subSegment.events).toHaveLength(2);
      expect(subSegment.eventGroups).toHaveLength(0);
    });

    it('should create multiple subsegments when timeslip events exist', () => {
      /**
       * Input:
       * - 1 segment: 2023-01-01 00:00:00 to 2023-01-01 12:00:00
       * - 4 regular events distributed across the segment
       * - 2 timeslip events at 04:00 and 08:00
       * 
       * Expected Output:
       * - 3 subsegments: 00:00-04:00, 04:00-08:00, 08:00-12:00
       * - Subsegment widths: 33.33%, 33.33%, 33.33%
       * - Events distributed to appropriate subsegments
       * - Timeslip events included in their respective subsegments
       */
      
      const timelines: RawTimeline[] = [{
        id: 'timeline-1',
        name: 'Test Timeline',
        slices: [],
        segments: [{
          id: 'segment-1',
          name: 'Morning',
          start: new Date('2023-01-01T00:00:00Z'),
          end: new Date('2023-01-01T12:00:00Z'),
          timelineId: 'timeline-1',
          scale: 1.0,
          subSegments: [],
          fractionOfTimeline: 1.0,
          narrativeStatus: 'active'
        }]
      }];

      const rawEvents: RawEvent[] = [
        {
          id: 'event-1',
          shortDescription: 'Wake up',
          narrativeDate: '2023-01-01T02:00:00Z',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        },
        {
          id: 'timeslip-1',
          shortDescription: 'First timeslip',
          narrativeDate: '2023-01-01T04:00:00Z',
          eventType: 'timeslip-in',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        },
        {
          id: 'event-2',
          shortDescription: 'Breakfast',
          narrativeDate: '2023-01-01T06:00:00Z',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        },
        {
          id: 'timeslip-2',
          shortDescription: 'Second timeslip',
          narrativeDate: '2023-01-01T08:00:00Z',
          eventType: 'timeslip-in',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        },
        {
          id: 'event-3',
          shortDescription: 'Work',
          narrativeDate: '2023-01-01T10:00:00Z',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        }
      ];

      createSubSegmentsWithinSegments(timelines, rawEvents);

      const segment = timelines[0].segments[0];
      expect(segment.subSegments).toHaveLength(3);
      
      // First subsegment: 00:00-04:00
      const subSegment1 = segment.subSegments[0];
      expect(subSegment1.id).toBe('segment-1-subsegment-0');
      expect(subSegment1.start).toEqual(new Date('2023-01-01T00:00:00Z'));
      expect(subSegment1.end).toEqual(new Date('2023-01-01T04:00:00Z'));
      expect(subSegment1.fractionOfSegment).toBeCloseTo(0.333, 2);
      expect(subSegment1.events).toHaveLength(1); // Wake up
      expect(subSegment1.eventGroups).toHaveLength(0);
      
      // Second subsegment: 04:00-08:00
      const subSegment2 = segment.subSegments[1];
      expect(subSegment2.id).toBe('segment-1-subsegment-1');
      expect(subSegment2.start).toEqual(new Date('2023-01-01T04:00:00Z'));
      expect(subSegment2.end).toEqual(new Date('2023-01-01T08:00:00Z'));
      expect(subSegment2.fractionOfSegment).toBeCloseTo(0.333, 2);
      expect(subSegment2.events).toHaveLength(2); // timeslip-1, Breakfast
      expect(subSegment2.eventGroups).toHaveLength(0);
      
      // Third subsegment: 08:00-12:00
      const subSegment3 = segment.subSegments[2];
      expect(subSegment3.id).toBe('segment-1-subsegment-2');
      expect(subSegment3.start).toEqual(new Date('2023-01-01T08:00:00Z'));
      expect(subSegment3.end).toEqual(new Date('2023-01-01T12:00:00Z'));
      expect(subSegment3.fractionOfSegment).toBeCloseTo(0.333, 2);
      expect(subSegment3.events).toHaveLength(2); // timeslip-2, Work
      expect(subSegment3.eventGroups).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle timeslip events at segment boundaries', () => {
      /**
       * Input:
       * - 1 segment: 2023-01-01 00:00:00 to 2023-01-01 12:00:00
       * - 1 timeslip event at segment start (00:00) - should be included in first subsegment
       * - 1 timeslip event at segment end (12:00) - should be included in last subsegment
       * - 1 timeslip event in middle (06:00) - should create new subsegment boundary
       * 
       * Expected Output:
       * - 2 subsegments: 00:00-06:00, 06:00-12:00
       * - First subsegment: includes timeslip at start (00:00) and middle (06:00)
       * - Second subsegment: includes timeslip at end (12:00)
       * - Subsegment widths: 50%, 50%
       */
      
      const timelines: RawTimeline[] = [{
        id: 'timeline-1',
        name: 'Test Timeline',
        slices: [],
        segments: [{
          id: 'segment-1',
          name: 'Morning',
          start: new Date('2023-01-01T00:00:00Z'),
          end: new Date('2023-01-01T12:00:00Z'),
          timelineId: 'timeline-1',
          scale: 1.0,
          subSegments: [],
          fractionOfTimeline: 1.0,
          narrativeStatus: 'active'
        }]
      }];

      const rawEvents: RawEvent[] = [
        {
          id: 'timeslip-start',
          shortDescription: 'Start timeslip',
          narrativeDate: '2023-01-01T00:00:00Z',
          eventType: 'timeslip-in',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        },
        {
          id: 'timeslip-middle',
          shortDescription: 'Middle timeslip',
          narrativeDate: '2023-01-01T06:00:00Z',
          eventType: 'timeslip-in',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        },
        {
          id: 'timeslip-end',
          shortDescription: 'End timeslip',
          narrativeDate: '2023-01-01T12:00:00Z',
          eventType: 'timeslip-in',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        }
      ];

      createSubSegmentsWithinSegments(timelines, rawEvents);

      const segment = timelines[0].segments[0];
      expect(segment.subSegments).toHaveLength(2);
      
      // First subsegment: 00:00-06:00
      const subSegment1 = segment.subSegments[0];
      expect(subSegment1.start).toEqual(new Date('2023-01-01T00:00:00Z'));
      expect(subSegment1.end).toEqual(new Date('2023-01-01T06:00:00Z'));
      expect(subSegment1.fractionOfSegment).toBe(0.5);
      expect(subSegment1.events).toHaveLength(1); // timeslip-start only (timeslip-middle creates boundary)
      expect(subSegment1.eventGroups).toHaveLength(0);
      
      // Second subsegment: 06:00-12:00
      const subSegment2 = segment.subSegments[1];
      expect(subSegment2.start).toEqual(new Date('2023-01-01T06:00:00Z'));
      expect(subSegment2.end).toEqual(new Date('2023-01-01T12:00:00Z'));
      expect(subSegment2.fractionOfSegment).toBe(0.5);
      expect(subSegment2.events).toHaveLength(2); // timeslip-middle, timeslip-end
      expect(subSegment2.eventGroups).toHaveLength(0);
    });

    it('should handle multiple timelines with segments', () => {
      /**
       * Input:
       * - Timeline 1: 1 segment with 1 timeslip event at 06:00
       * - Timeline 2: 1 segment with no timeslip events
       * - Events distributed across both timelines
       * 
       * Expected Output:
       * - Timeline 1: 2 subsegments (split by timeslip at 06:00)
       * - Timeline 2: 1 subsegment (no timeslip event)
       * - Events correctly assigned to their timeline's subsegments
       */
      
      const timelines: RawTimeline[] = [{
        id: 'timeline-1',
        name: 'Test Timeline',
        slices: [],
        segments: [{
          id: 'segment-1',
          name: 'Timeline 1 Segment',
          start: new Date('2023-01-01T00:00:00Z'),
          end: new Date('2023-01-01T12:00:00Z'),
          timelineId: 'timeline-1',
          scale: 1.0,
          subSegments: [],
          fractionOfTimeline: 1.0,
          narrativeStatus: 'active'
        }]
      }, {
        id: 'timeline-2',
        name: 'Test Timeline',
        slices: [],
        segments: [{
          id: 'segment-2',
          name: 'Timeline 2 Segment',
          start: new Date('2023-01-01T00:00:00Z'),
          end: new Date('2023-01-01T12:00:00Z'),
          timelineId: 'timeline-2',
          scale: 1.0,
          subSegments: [],
          fractionOfTimeline: 1.0,
          narrativeStatus: 'active'
        }]
      }];

      const rawEvents: RawEvent[] = [
        {
          id: 'event-1',
          shortDescription: 'Timeline 1 Event 1',
          narrativeDate: '2023-01-01T02:00:00Z',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        },
        {
          id: 'timeslip-1',
          shortDescription: 'Timeline 1 Timeslip',
          narrativeDate: '2023-01-01T06:00:00Z',
          eventType: 'timeslip-in',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        },
        {
          id: 'event-2',
          shortDescription: 'Timeline 1 Event 2',
          narrativeDate: '2023-01-01T10:00:00Z',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        },
        {
          id: 'event-3',
          shortDescription: 'Timeline 2 Event',
          narrativeDate: '2023-01-01T08:00:00Z',
          timelineId: 'timeline-2',
          tags: [],
          reveals: []
        }
      ];

      createSubSegmentsWithinSegments(timelines, rawEvents);

      const segment1 = timelines[0].segments[0];
      const segment2 = timelines[1].segments[0];
      expect(segment1.subSegments).toHaveLength(2);
      expect(segment2.subSegments).toHaveLength(1);
      
      // Timeline 1 subsegments
      const timeline1SubSegments = segment1.subSegments;
      expect(timeline1SubSegments[0].events).toHaveLength(1); // event-1 only (timeslip-1 creates boundary)
      expect(timeline1SubSegments[1].events).toHaveLength(2); // timeslip-1, event-2
      
      // Timeline 2 subsegments
      const timeline2SubSegments = segment2.subSegments;
      expect(timeline2SubSegments[0].events).toHaveLength(1); // event-3
    });

    it('should handle different timeslip event types correctly', () => {
      /**
       * Input:
       * - 1 segment with various timeslip event types
       * - timeslip-in at 03:00 (creates boundary)
       * - timeslip-out at 06:00 (stays in same subsegment as timeslip-in)
       * - timeslip-in at 09:00 (creates boundary)
       * 
       * Expected Output:
       * - 3 subsegments: 00:00-03:00, 03:00-09:00, 09:00-12:00
       * - Second subsegment contains both timeslip-in and timeslip-out
       * - Third subsegment contains timeslip-in
       */
      
      const timelines: RawTimeline[] = [{
        id: 'timeline-1',
        name: 'Test Timeline',
        slices: [],
        segments: [{
          id: 'segment-1',
          name: 'Mixed Timeslips',
          start: new Date('2023-01-01T00:00:00Z'),
          end: new Date('2023-01-01T12:00:00Z'),
          timelineId: 'timeline-1',
          scale: 1.0,
          subSegments: [],
          fractionOfTimeline: 1.0,
          narrativeStatus: 'active'
        }]
      }];

      const rawEvents: RawEvent[] = [
        {
          id: 'timeslip-in-1',
          shortDescription: 'Timeslip In 1',
          narrativeDate: '2023-01-01T03:00:00Z',
          eventType: 'timeslip-in',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        },
        {
          id: 'timeslip-out-1',
          shortDescription: 'Timeslip Out 1',
          narrativeDate: '2023-01-01T06:00:00Z',
          eventType: 'timeslip-out',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        },
        {
          id: 'timeslip-in-2',
          shortDescription: 'Timeslip In 2',
          narrativeDate: '2023-01-01T09:00:00Z',
          eventType: 'timeslip-in',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        }
      ];

      createSubSegmentsWithinSegments(timelines, rawEvents);

      const segment = timelines[0].segments[0];
      expect(segment.subSegments).toHaveLength(3);
      
      // First subsegment: 00:00-03:00
      expect(segment.subSegments[0].events).toHaveLength(0);
      
      // Second subsegment: 03:00-09:00 (contains both timeslip-in and timeslip-out)
      expect(segment.subSegments[1].events).toHaveLength(2);
      const timeslipEvents = segment.subSegments[1].events.filter(e => e.eventType?.includes('timeslip'));
      expect(timeslipEvents).toHaveLength(2);
      expect(timeslipEvents.map(e => e.eventType)).toEqual(['timeslip-in', 'timeslip-out']);
      
      // Third subsegment: 09:00-12:00
      expect(segment.subSegments[2].events).toHaveLength(1);
      const timeslipEvent = segment.subSegments[2].events.find(e => e.eventType?.includes('timeslip'));
      expect(timeslipEvent).toBeDefined();
      expect(timeslipEvent!.eventType).toBe('timeslip-in');
    });

    it('should throw error for multiple timeslips at the same timestamp', () => {
      /**
       * Input:
       * - 1 segment with multiple timeslip events at the same timestamp
       * 
       * Expected Output:
       * - Error thrown with helpful message suggesting to stagger timeslips
       */
      
      const timelines: RawTimeline[] = [{
        id: 'timeline-1',
        name: 'Test Timeline',
        slices: [],
        segments: [{
          id: 'segment-1',
          name: 'Conflicting Timeslips',
          start: new Date('2023-01-01T00:00:00Z'),
          end: new Date('2023-01-01T12:00:00Z'),
          timelineId: 'timeline-1',
          scale: 1.0,
          subSegments: [],
          fractionOfTimeline: 1.0,
          narrativeStatus: 'active'
        }]
      }];

      const rawEvents: RawEvent[] = [
        {
          id: 'timeslip-1',
          shortDescription: 'First Timeslip',
          narrativeDate: '2023-01-01T06:00:00Z',
          eventType: 'timeslip-in',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        },
        {
          id: 'timeslip-2',
          shortDescription: 'Second Timeslip',
          narrativeDate: '2023-01-01T06:00:00Z',
          eventType: 'timeslip-in',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        }
      ];

      expect(() => {
        createSubSegmentsWithinSegments(timelines, rawEvents);
      }).toThrow('Multiple timeslip events found at the same timestamp (2023-01-01T06:00:00.000Z) in timeline timeline-1, segment segment-1. Please stagger the timeslips by at least 1 second to avoid conflicts.');
    });
  });

  describe('Width calculations', () => {
    it('should calculate subsegment widths based on time duration', () => {
      /**
       * Input:
       * - 1 segment: 2023-01-01 00:00:00 to 2023-01-01 10:00:00 (10 hours)
       * - 1 timeslip event at 04:00 (4 hours in)
       * 
       * Expected Output:
       * - 2 subsegments: 00:00-04:00 (4 hours), 04:00-10:00 (6 hours)
       * - Subsegment widths: 40%, 60%
       */
      
      const timelines: RawTimeline[] = [{
        id: 'timeline-1',
        name: 'Test Timeline',
        slices: [],
        segments: [{
          id: 'segment-1',
          name: 'Uneven Subsegments',
          start: new Date('2023-01-01T00:00:00Z'),
          end: new Date('2023-01-01T10:00:00Z'),
          timelineId: 'timeline-1',
          scale: 1.0,
          subSegments: [],
          fractionOfTimeline: 1.0,
          narrativeStatus: 'active'
        }]
      }];

      const rawEvents: RawEvent[] = [
        {
          id: 'timeslip',
          shortDescription: 'Timeslip',
          narrativeDate: '2023-01-01T04:00:00Z',
          eventType: 'timeslip-in',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        }
      ];

      createSubSegmentsWithinSegments(timelines, rawEvents);

      const segment = timelines[0].segments[0];
      expect(segment.subSegments).toHaveLength(2);
      
      // First subsegment: 4 hours = 40%
      expect(segment.subSegments[0].fractionOfSegment).toBeCloseTo(0.4, 2);
      
      // Second subsegment: 6 hours = 60%
      expect(segment.subSegments[1].fractionOfSegment).toBeCloseTo(0.6, 2);
    });

    it('should handle zero-duration segments gracefully', () => {
      /**
       * Input:
       * - 1 segment with zero duration (start = end)
       * - 1 timeslip event at the boundary
       * 
       * Expected Output:
       * - 1 subsegment with width 1.0 (100% of zero-duration segment)
       * - No division by zero errors
       */
      
      const timelines: RawTimeline[] = [{
        id: 'timeline-1',
        name: 'Test Timeline',
        slices: [],
        segments: [{
          id: 'segment-1',
          name: 'Zero Duration',
          start: new Date('2023-01-01T00:00:00Z'),
          end: new Date('2023-01-01T00:00:00Z'),
          timelineId: 'timeline-1',
          scale: 1.0,
          subSegments: [],
          fractionOfTimeline: 1.0,
          narrativeStatus: 'active'
        }]
      }];

      const rawEvents: RawEvent[] = [
        {
          id: 'timeslip',
          shortDescription: 'Timeslip',
          narrativeDate: '2023-01-01T00:00:00Z',
          eventType: 'timeslip-in',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        }
      ];

      createSubSegmentsWithinSegments(timelines, rawEvents);

      const segment = timelines[0].segments[0];
      expect(segment.subSegments).toHaveLength(1);
      expect(segment.subSegments[0].fractionOfSegment).toBe(1.0);
    });
  });

  describe('Event assignment', () => {
    it('should assign events to correct subsegments based on timing', () => {
      /**
       * Input:
       * - 1 segment: 2023-01-01 00:00:00 to 2023-01-01 12:00:00
       * - 1 timeslip event at 06:00
       * - 3 regular events at 02:00, 08:00, 10:00
       * 
       * Expected Output:
       * - 2 subsegments: 00:00-06:00, 06:00-12:00
       * - First subsegment: event at 02:00
       * - Second subsegment: events at 08:00, 10:00 + timeslip at 06:00
       */
      
      const timelines: RawTimeline[] = [{
        id: 'timeline-1',
        name: 'Test Timeline',
        slices: [],
        segments: [{
          id: 'segment-1',
          name: 'Event Assignment',
          start: new Date('2023-01-01T00:00:00Z'),
          end: new Date('2023-01-01T12:00:00Z'),
          timelineId: 'timeline-1',
          scale: 1.0,
          subSegments: [],
          fractionOfTimeline: 1.0,
          narrativeStatus: 'active'
        }]
      }];

      const rawEvents: RawEvent[] = [
        {
          id: 'event-1',
          shortDescription: 'Early Event',
          narrativeDate: '2023-01-01T02:00:00Z',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        },
        {
          id: 'timeslip',
          shortDescription: 'Timeslip',
          narrativeDate: '2023-01-01T06:00:00Z',
          eventType: 'timeslip-in',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        },
        {
          id: 'event-2',
          shortDescription: 'Late Event 1',
          narrativeDate: '2023-01-01T08:00:00Z',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        },
        {
          id: 'event-3',
          shortDescription: 'Late Event 2',
          narrativeDate: '2023-01-01T10:00:00Z',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        }
      ];

      createSubSegmentsWithinSegments(timelines, rawEvents);

      const segment = timelines[0].segments[0];
      expect(segment.subSegments).toHaveLength(2);
      
      // First subsegment: 00:00-06:00
      expect(segment.subSegments[0].events).toHaveLength(1);
      expect(segment.subSegments[0].events[0].id).toBe('event-1');
      
      // Second subsegment: 06:00-12:00
      expect(segment.subSegments[1].events).toHaveLength(3);
      expect(segment.subSegments[1].events.map(e => e.id)).toEqual(['timeslip', 'event-2', 'event-3']);
      const timeslipEvent = segment.subSegments[1].events.find(e => e.eventType?.includes('timeslip'));
      expect(timeslipEvent).toBeDefined();
    });

    it('should handle events exactly at subsegment boundaries', () => {
      /**
       * Input:
       * - 1 segment: 2023-01-01 00:00:00 to 2023-01-01 12:00:00
       * - 1 timeslip event at 06:00
       * - 1 event exactly at 06:00 (boundary)
       * 
       * Expected Output:
       * - 2 subsegments: 00:00-06:00, 06:00-12:00
       * - Event at boundary (06:00) goes to second subsegment
       * - Timeslip at boundary (06:00) goes to second subsegment
       */
      
      const timelines: RawTimeline[] = [{
        id: 'timeline-1',
        name: 'Test Timeline',
        slices: [],
        segments: [{
          id: 'segment-1',
          name: 'Boundary Events',
          start: new Date('2023-01-01T00:00:00Z'),
          end: new Date('2023-01-01T12:00:00Z'),
          timelineId: 'timeline-1',
          scale: 1.0,
          subSegments: [],
          fractionOfTimeline: 1.0,
          narrativeStatus: 'active'
        }]
      }];

      const rawEvents: RawEvent[] = [
        {
          id: 'timeslip',
          shortDescription: 'Timeslip',
          narrativeDate: '2023-01-01T06:00:00Z',
          eventType: 'timeslip-in',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        },
        {
          id: 'boundary-event',
          shortDescription: 'Boundary Event',
          narrativeDate: '2023-01-01T06:00:00Z',
          timelineId: 'timeline-1',
          tags: [],
          reveals: []
        }
      ];

      createSubSegmentsWithinSegments(timelines, rawEvents);

      const segment = timelines[0].segments[0];
      expect(segment.subSegments).toHaveLength(2);
      
      // First subsegment: 00:00-06:00 (exclusive of 06:00)
      expect(segment.subSegments[0].events).toHaveLength(0);
      
      // Second subsegment: 06:00-12:00 (inclusive of 06:00)
      expect(segment.subSegments[1].events).toHaveLength(2);
      expect(segment.subSegments[1].events.map(e => e.id)).toEqual(['timeslip', 'boundary-event']);
      const timeslipEvent = segment.subSegments[1].events.find(e => e.eventType?.includes('timeslip'));
      expect(timeslipEvent).toBeDefined();
    });
  });
});
