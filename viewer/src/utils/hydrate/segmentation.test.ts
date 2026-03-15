import { describe, it, expect } from 'vitest';
import { generateSegmentDefinitions } from './segmentation';

describe('generateSegmentDefinitions', () => {
  /**
   * This test verifies that the segmentation function can process basic timeline data
   * and generate segment definitions with proper structure. It creates timelines with
   * multiple slices and events, then checks that the output contains valid segment
   * definitions with all required properties (id, start, end, label, scale).
   * 
   * Input: 2 timelines with 3 slices total (Morning 8-12, Afternoon 12-18, Evening 18-22)
   *        3 events distributed across the time periods
   * Expected Output: 1 merged segment definition spanning 8-22 with scale factor > 0
   */
  it('should generate segment definitions from slices and events', () => {
    const rawTimelines = [
      {
        id: 'timeline1',
        slices: [
          {
            timelineId: 'timeline1',
            shortDescription: 'Morning',
            startTimestamp: '2024-01-01T08:00:00Z',
            endTimestamp: '2024-01-01T12:00:00Z'
          },
          {
            timelineId: 'timeline1',
            shortDescription: 'Afternoon',
            startTimestamp: '2024-01-01T12:00:00Z',
            endTimestamp: '2024-01-01T18:00:00Z'
          }
        ]
      },
      {
        id: 'timeline2',
        slices: [
          {
            timelineId: 'timeline2',
            shortDescription: 'Evening',
            startTimestamp: '2024-01-01T18:00:00Z',
            endTimestamp: '2024-01-01T22:00:00Z'
          }
        ]
      }
    ];

    const rawEvents = [
      {
        id: 'event1',
        narrativeDate: '2024-01-01T09:00:00Z',
        timelineId: 'timeline1'
      },
      {
        id: 'event2',
        narrativeDate: '2024-01-01T14:00:00Z',
        timelineId: 'timeline1'
      },
      {
        id: 'event3',
        narrativeDate: '2024-01-01T20:00:00Z',
        timelineId: 'timeline2'
      }
    ];

    const segmentDefinitions = generateSegmentDefinitions(rawTimelines, rawEvents);

    expect(segmentDefinitions).toBeDefined();
    expect(Array.isArray(segmentDefinitions)).toBe(true);
    expect(segmentDefinitions.length).toBeGreaterThan(0);

    // Check that each segment has the required properties
    segmentDefinitions.forEach(segment => {
      expect(segment).toHaveProperty('id');
      expect(segment).toHaveProperty('start');
      expect(segment).toHaveProperty('end');
      expect(segment).toHaveProperty('label');
      expect(segment).toHaveProperty('scale');
      expect(typeof segment.scale).toBe('number');
          expect(segment.scale).toBeGreaterThan(0);
  });
});

  /**
   * This test verifies that the segmentation algorithm correctly merges overlapping
   * time segments. When two slices from different timelines overlap in time (e.g.,
   * one slice from 10:00-15:00 and another from 12:00-17:00), they should be
   * combined into a single segment spanning the entire overlapping period.
   * 
   * Input: 2 overlapping slices (10:00-15:00 and 12:00-17:00) with 2 events
   * Expected Output: 1 merged segment spanning 10:00-17:00 (the full overlapping range)
   */
  it('should handle overlapping slices correctly', () => {
    const rawTimelines = [
      {
        id: 'timeline1',
        slices: [
          {
            timelineId: 'timeline1',
            shortDescription: 'Overlap1',
            startTimestamp: '2024-01-01T10:00:00Z',
            endTimestamp: '2024-01-01T15:00:00Z'
          }
        ]
      },
      {
        id: 'timeline2',
        slices: [
          {
            timelineId: 'timeline2',
            shortDescription: 'Overlap2',
            startTimestamp: '2024-01-01T12:00:00Z',
            endTimestamp: '2024-01-01T17:00:00Z'
          }
        ]
      }
    ];

    const rawEvents = [
      {
        id: 'event1',
        narrativeDate: '2024-01-01T11:00:00Z',
        timelineId: 'timeline1'
      },
      {
        id: 'event2',
        narrativeDate: '2024-01-01T13:00:00Z',
        timelineId: 'timeline2'
      }
    ];

    const segmentDefinitions = generateSegmentDefinitions(rawTimelines, rawEvents);

    // Should merge overlapping segments
    expect(segmentDefinitions.length).toBe(1);
    expect(segmentDefinitions[0].start.getTime()).toBe(new Date('2024-01-01T10:00:00Z').getTime());
    expect(segmentDefinitions[0].end.getTime()).toBe(new Date('2024-01-01T17:00:00Z').getTime());
  });

  /**
   * This test verifies that the segmentation algorithm correctly merges adjacent
   * time segments that have similar event density. When two slices are adjacent
   * (e.g., one ends at 12:00 and the next starts at 12:00) and have similar
   * event density ratios (within 70% of each other), they should be combined
   * into a single segment for better visual representation.
   * 
   * Input: 2 adjacent slices (10:00-12:00 and 12:00-14:00) with 1 event each
   * Expected Output: 1 merged segment spanning 10:00-14:00 (adjacent segments with similar density)
   */
  it('should handle adjacent slices with similar density', () => {
    const rawTimelines = [
      {
        id: 'timeline1',
        slices: [
          {
            timelineId: 'timeline1',
            shortDescription: 'Adjacent1',
            startTimestamp: '2024-01-01T10:00:00Z',
            endTimestamp: '2024-01-01T12:00:00Z'
          },
          {
            timelineId: 'timeline1',
            shortDescription: 'Adjacent2',
            startTimestamp: '2024-01-01T12:00:00Z',
            endTimestamp: '2024-01-01T14:00:00Z'
          }
        ]
      }
    ];

    const rawEvents = [
      {
        id: 'event1',
        narrativeDate: '2024-01-01T11:00:00Z',
        timelineId: 'timeline1'
      },
      {
        id: 'event2',
        narrativeDate: '2024-01-01T13:00:00Z',
        timelineId: 'timeline1'
      }
    ];

    const segmentDefinitions = generateSegmentDefinitions(rawTimelines, rawEvents);

    // Should merge adjacent segments with similar density
    expect(segmentDefinitions.length).toBe(1);
    expect(segmentDefinitions[0].start.getTime()).toBe(new Date('2024-01-01T10:00:00Z').getTime());
    expect(segmentDefinitions[0].end.getTime()).toBe(new Date('2024-01-01T14:00:00Z').getTime());
  });

  /**
   * This test verifies that the v5 weighting algorithm correctly assigns different
   * scale factors based on event density. Segments with higher event density
   * (more events per unit time) should receive higher scale factors, which will
   * make them appear larger in the timeline visualization. This ensures that
   * important, event-rich periods are given more visual prominence.
   * 
   * Input: 2 slices with different densities (1-hour slice with 2 events vs 2-hour slice with 1 event)
   * Expected Output: 2 separate segments where the high-density segment has a higher scale factor
   */
  it('should apply v5 weighting correctly', () => {
    const rawTimelines = [
      {
        id: 'timeline1',
        slices: [
          {
            timelineId: 'timeline1',
            shortDescription: 'HighDensity',
            startTimestamp: '2024-01-01T10:00:00Z',
            endTimestamp: '2024-01-01T11:00:00Z'
          },
          {
            timelineId: 'timeline1',
            shortDescription: 'LowDensity',
            startTimestamp: '2024-01-01T12:00:00Z',
            endTimestamp: '2024-01-01T14:00:00Z'
          }
        ]
      }
    ];

    const rawEvents = [
      {
        id: 'event1',
        narrativeDate: '2024-01-01T10:30:00Z',
        timelineId: 'timeline1'
      },
      {
        id: 'event2',
        narrativeDate: '2024-01-01T10:45:00Z',
        timelineId: 'timeline1'
      },
      {
        id: 'event3',
        narrativeDate: '2024-01-01T13:00:00Z',
        timelineId: 'timeline1'
      }
    ];

    const segmentDefinitions = generateSegmentDefinitions(rawTimelines, rawEvents);

    // Should have different scale factors based on event density
    expect(segmentDefinitions.length).toBe(2);
    
    const highDensitySegment = segmentDefinitions.find(s => s.label === 'HighDensity');
    const lowDensitySegment = segmentDefinitions.find(s => s.label === 'LowDensity');
    
    expect(highDensitySegment).toBeDefined();
    expect(lowDensitySegment).toBeDefined();
    
    // High density segment should have higher scale factor
    expect(highDensitySegment!.scale).toBeGreaterThan(lowDensitySegment!.scale);
  });
}); 