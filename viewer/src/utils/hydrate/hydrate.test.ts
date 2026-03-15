import { describe, it, expect } from 'vitest';
import { hydrate } from './index';

describe('hydrate', () => {
  describe('Step 1: Parse and validate raw data', () => {
    it('should accept valid data structure', () => {
      const validData = {
        episodes: [
          {
            id: 'ep1',
            episodeNumber: 1,
            title: 'The Beginning',
            duration: 3600
          }
        ],
        timelines: [
          {
            id: 'tl1',
            name: 'Main Timeline',
            description: 'The primary timeline',
            slices: [
              {
                id: 'slice1',
                timelineId: 'tl1',
                shortDescription: 'Initial Phase',
                startTimestamp: '2024-01-01T00:00:00Z',
                endTimestamp: '2024-01-15T00:00:00Z',
                importance: 'high'
              }
            ]
          }
        ],
        events: [
          {
            id: 'ev1',
            timelineId: 'tl1',
            shortDescription: 'Project Start',
            narrativeDate: '2024-01-01T00:00:00Z',
            tags: ['start', 'milestone'],
            eventType: 'milestone',
            reveals: [
              {
                id: 'rev1',
                apparentTimelineId: 'tl1',
                episodeId: 'ep1',
                episodeTime: 0,
                displayedDate: '2024-01-01',
                displayedTitle: 'Project Initiation',
                displayedDescription: 'The project begins'
              }
            ]
          }
        ],
        notes: []
      };

      expect(() => hydrate(validData)).not.toThrow();
    });

    it('should reject missing episodes array', () => {
      const invalidData = {
        timelines: [],
        events: []
      };

      expect(() => hydrate(invalidData)).toThrow('Raw data must contain an episodes array');
    });

    it('should reject missing timelines array', () => {
      const invalidData = {
        episodes: [],
        events: []
      };

      expect(() => hydrate(invalidData)).toThrow('Raw data must contain a timelines array');
    });

    it('should reject missing events array', () => {
      const invalidData = {
        episodes: [],
        timelines: []
      };

      expect(() => hydrate(invalidData)).toThrow('Raw data must contain an events array');
    });

    it('should reject invalid episode structure', () => {
      const invalidData = {
        episodes: [
          {
            // Missing required fields
          }
        ],
        timelines: [],
        events: []
      };

      expect(() => hydrate(invalidData)).toThrow('Episode at index 0 must have a valid string id');
    });

    it('should reject episode with invalid number', () => {
      const invalidData = {
        episodes: [
          {
            id: 'ep1',
            number: 'not-a-number', // Should be integer
            title: 'The Beginning',
            duration: 3600
          }
        ],
        timelines: [],
        events: []
      };

      expect(() => hydrate(invalidData)).toThrow('Episode at index 0 must have a valid integer number');
    });

    it('should reject episode with invalid duration', () => {
      const invalidData = {
        episodes: [
          {
            id: 'ep1',
            number: 1,
            title: 'The Beginning',
            duration: -1 // Should be positive
          }
        ],
        timelines: [],
        events: []
      };

      expect(() => hydrate(invalidData)).toThrow('Episode at index 0 must have a valid positive integer duration');
    });

    it('should reject invalid timeline structure', () => {
      const invalidData = {
        episodes: [],
        timelines: [
          {
            // Missing required fields
          }
        ],
        events: []
      };

      expect(() => hydrate(invalidData)).toThrow('Timeline at index 0 must have a valid string id');
    });

    it('should reject timeline without slices array', () => {
      const invalidData = {
        episodes: [],
        timelines: [
          {
            id: 'tl1',
            name: 'Main Timeline',
            // Missing slices array
          }
        ],
        events: []
      };

      expect(() => hydrate(invalidData)).toThrow('Timeline tl1 must have a slices array');
    });

    it('should reject invalid slice structure', () => {
      const invalidData = {
        episodes: [],
        timelines: [
          {
            id: 'tl1',
            name: 'Main Timeline',
            slices: [
              {
                // Missing required fields
              }
            ]
          }
        ],
        events: []
      };

      expect(() => hydrate(invalidData)).toThrow('Slice at index 0 in timeline tl1 must have a valid string id');
    });

    it('should reject slice with mismatched timelineId', () => {
      const invalidData = {
        episodes: [],
        timelines: [
          {
            id: 'tl1',
            name: 'Main Timeline',
            slices: [
              {
                id: 'slice1',
                timelineId: 'tl2', // Wrong timeline ID
                shortDescription: 'Initial Phase',
                startTimestamp: '2024-01-01T00:00:00Z',
                endTimestamp: '2024-01-15T00:00:00Z'
              }
            ]
          }
        ],
        events: []
      };

      expect(() => hydrate(invalidData)).toThrow('Slice slice1 timelineId (tl2) must match parent timeline id (tl1)');
    });

    it('should reject slice with invalid timestamps', () => {
      const invalidData = {
        episodes: [],
        timelines: [
          {
            id: 'tl1',
            name: 'Main Timeline',
            slices: [
              {
                id: 'slice1',
                timelineId: 'tl1',
                shortDescription: 'Initial Phase',
                startTimestamp: 'invalid-date',
                endTimestamp: '2024-01-15T00:00:00Z'
              }
            ]
          }
        ],
        events: []
      };

      expect(() => hydrate(invalidData)).toThrow('Slice slice1 startTimestamp must be a valid date string');
    });

    it('should reject slice with end before start', () => {
      const invalidData = {
        episodes: [],
        timelines: [
          {
            id: 'tl1',
            name: 'Main Timeline',
            slices: [
              {
                id: 'slice1',
                timelineId: 'tl1',
                shortDescription: 'Initial Phase',
                startTimestamp: '2024-01-15T00:00:00Z',
                endTimestamp: '2024-01-01T00:00:00Z' // End before start
              }
            ]
          }
        ],
        events: []
      };

      expect(() => hydrate(invalidData)).toThrow('Slice slice1 startTimestamp must be before endTimestamp');
    });

    it('should reject slice with invalid importance', () => {
      const invalidData = {
        episodes: [],
        timelines: [
          {
            id: 'tl1',
            name: 'Main Timeline',
            slices: [
              {
                id: 'slice1',
                timelineId: 'tl1',
                shortDescription: 'Initial Phase',
                startTimestamp: '2024-01-01T00:00:00Z',
                endTimestamp: '2024-01-15T00:00:00Z',
                importance: 'invalid' // Should be 'low', 'high', or null
              }
            ]
          }
        ],
        events: []
      };

      expect(() => hydrate(invalidData)).toThrow('Slice slice1 importance must be \'low\', \'high\', or null');
    });

    it('should accept slice with valid importance values', () => {
      const validData = {
        episodes: [],
        timelines: [
          {
            id: 'tl1',
            name: 'Main Timeline',
            slices: [
              {
                id: 'slice1',
                timelineId: 'tl1',
                shortDescription: 'Initial Phase',
                startTimestamp: '2024-01-01T00:00:00Z',
                endTimestamp: '2024-01-15T00:00:00Z',
                importance: 'high'
              },
              {
                id: 'slice2',
                timelineId: 'tl1',
                shortDescription: 'Development Phase',
                startTimestamp: '2024-01-15T00:00:00Z',
                endTimestamp: '2024-02-01T00:00:00Z',
                importance: 'low'
              },
              {
                id: 'slice3',
                timelineId: 'tl1',
                shortDescription: 'Final Phase',
                startTimestamp: '2024-02-01T00:00:00Z',
                endTimestamp: '2024-02-15T00:00:00Z',
                importance: null
              }
            ]
          }
        ],
        events: []
      };

      expect(() => hydrate(validData)).not.toThrow();
    });

    it('should reject invalid event structure', () => {
      const invalidData = {
        episodes: [],
        timelines: [
          {
            id: 'tl1',
            name: 'Main Timeline',
            slices: []
          }
        ],
        events: [
          {
            // Missing required fields
          }
        ]
      };

      expect(() => hydrate(invalidData)).toThrow('Event at index 0 must have a valid string id');
    });

    it('should reject event with non-existent timeline reference', () => {
      const invalidData = {
        episodes: [],
        timelines: [
          {
            id: 'tl1',
            name: 'Main Timeline',
            slices: []
          }
        ],
        events: [
          {
            id: 'ev1',
            timelineId: 'tl2', // Non-existent timeline
            shortDescription: 'Project Start',
            narrativeDate: '2024-01-01T00:00:00Z',
            tags: [],
            reveals: []
          }
        ]
      };

      expect(() => hydrate(invalidData)).toThrow('Event ev1 references non-existent timeline tl2');
    });

    it('should reject event with invalid narrativeDate', () => {
      const invalidData = {
        episodes: [],
        timelines: [
          {
            id: 'tl1',
            name: 'Main Timeline',
            slices: []
          }
        ],
        events: [
          {
            id: 'ev1',
            timelineId: 'tl1',
            shortDescription: 'Project Start',
            narrativeDate: 'invalid-date',
            tags: [],
            reveals: []
          }
        ]
      };

      expect(() => hydrate(invalidData)).toThrow('Event ev1 narrativeDate must be a valid date string');
    });

    it('should reject event without reveals array', () => {
      const invalidData = {
        episodes: [],
        timelines: [
          {
            id: 'tl1',
            name: 'Main Timeline',
            slices: []
          }
        ],
        events: [
          {
            id: 'ev1',
            timelineId: 'tl1',
            shortDescription: 'Project Start',
            narrativeDate: '2024-01-01T00:00:00Z',
            tags: []
            // Missing reveals array
          }
        ]
      };

      expect(() => hydrate(invalidData)).toThrow('Event ev1 must have a reveals array');
    });

    it('should reject reveal with invalid structure', () => {
      const invalidData = {
        episodes: [],
        timelines: [
          {
            id: 'tl1',
            name: 'Main Timeline',
            slices: []
          }
        ],
        events: [
          {
            id: 'ev1',
            timelineId: 'tl1',
            shortDescription: 'Project Start',
            narrativeDate: '2024-01-01T00:00:00Z',
            tags: [],
            reveals: [
              {
                // Missing required fields
              }
            ]
          }
        ]
      };

      expect(() => hydrate(invalidData)).toThrow('Reveal at index 0 in event ev1 must have a valid string id');
    });

    it('should reject reveal with invalid episodeId', () => {
      const invalidData = {
        episodes: [],
        timelines: [
          {
            id: 'tl1',
            name: 'Main Timeline',
            slices: []
          }
        ],
        events: [
          {
            id: 'ev1',
            timelineId: 'tl1',
            shortDescription: 'Project Start',
            narrativeDate: '2024-01-01T00:00:00Z',
            tags: [],
            reveals: [
              {
                id: 'rev1',
                episodeId: 'nonexistent',
                episodeTime: 0,
                displayedTitle: 'Title',
                displayedDescription: 'Description',
                displayedDate: '2024-01-01'
              }
            ]
          }
        ]
      };

      expect(() => hydrate(invalidData)).toThrow('Episode nonexistent not found');
    });

    it('should reject reveal with invalid episodeTime', () => {
      const invalidData = {
        episodes: [],
        timelines: [
          {
            id: 'tl1',
            name: 'Main Timeline',
            slices: []
          }
        ],
        events: [
          {
            id: 'ev1',
            timelineId: 'tl1',
            shortDescription: 'Project Start',
            narrativeDate: '2024-01-01T00:00:00Z',
            tags: [],
            reveals: [
              {
                id: 'rev1',
                episodeId: 'ep1',
                episodeTime: -1, // Negative episode time
                displayedTitle: 'Title',
                displayedDescription: 'Description',
                displayedDate: '2024-01-01'
              }
            ]
          }
        ]
      };

      expect(() => hydrate(invalidData)).toThrow('Reveal at index 0 in event ev1 must have a valid non-negative integer episodeTime');
    });

    it('should reject reveal with non-existent apparentTimeline', () => {
      const invalidData = {
        episodes: [],
        timelines: [
          {
            id: 'tl1',
            name: 'Main Timeline',
            slices: []
          }
        ],
        events: [
          {
            id: 'ev1',
            timelineId: 'tl1',
            shortDescription: 'Project Start',
            narrativeDate: '2024-01-01T00:00:00Z',
            tags: [],
            reveals: [
              {
                id: 'rev1',
                apparentTimeline: 'tl2', // Non-existent timeline
                episodeId: 'ep1',
                episodeTime: 0,
                displayedTitle: 'Title',
                displayedDescription: 'Description',
                displayedDate: '2024-01-01'
              }
            ]
          }
        ]
      };

      expect(() => hydrate(invalidData)).toThrow('Reveal rev1 apparentTimeline (tl2) references non-existent timeline');
    });

    it('should accept reveal with optional display properties', () => {
      const validData = {
        episodes: [],
        timelines: [
          {
            id: 'tl1',
            name: 'Main Timeline',
            slices: []
          }
        ],
        events: [
          {
            id: 'ev1',
            timelineId: 'tl1',
            shortDescription: 'Project Start',
            narrativeDate: '2024-01-01T00:00:00Z',
            tags: [],
            reveals: [
              {
                id: 'rev1',
                absolutePlayTime: 0
                // No display properties - should be inherited
              }
            ]
          }
        ]
      };

      expect(() => hydrate(validData)).not.toThrow();
    });

    it('should accept reveal with optional apparentTimeline', () => {
      const validData = {
        episodes: [],
        timelines: [
          {
            id: 'tl1',
            name: 'Main Timeline',
            slices: []
          }
        ],
        events: [
          {
            id: 'ev1',
            timelineId: 'tl1',
            shortDescription: 'Project Start',
            narrativeDate: '2024-01-01T00:00:00Z',
            tags: [],
            reveals: [
              {
                id: 'rev1',
                episodeId: 'ep1',
                episodeTime: 0,
                displayedTitle: 'Title',
                displayedDescription: 'Description',
                displayedDate: '2024-01-01'
                // No apparentTimeline - should default to event's timeline
              }
            ]
          }
        ]
      };

      expect(() => hydrate(validData)).not.toThrow();
    });
  });
}); 