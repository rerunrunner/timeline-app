import { describe, expect, it } from 'vitest';
import { hydrate } from './index';

describe('HydratedEvent title inheritance', () => {
  it('inherits the first reveal title when later reveals omit it', () => {
    const timelines = hydrate({
      episodes: [
        {
          id: 'ep1',
          episodeNumber: 1,
          title: 'Episode 1',
          duration: 3600,
        },
      ],
      timelines: [
        {
          id: 'tl1',
          name: 'Timeline 1',
          slices: [
            {
              id: 'slice1',
              timelineId: 'tl1',
              shortDescription: 'Act 1',
              startTimestamp: '2009-07-22T00:00:00Z',
              endTimestamp: '2009-07-23T00:00:00Z',
              importance: 'high',
            },
          ],
        },
      ],
      events: [
        {
          id: 'event-1',
          timelineId: 'tl1',
          shortDescription: 'event-1',
          narrativeDate: '2009-07-22T00:00:00Z',
          tags: [],
          reveals: [
            {
              id: 'reveal-1',
              episodeId: 'ep1',
              episodeTime: 0,
              absolutePlayTime: 0,
              displayedTitle: 'The day of the eclipse',
              displayedDescription: 'First reveal',
              displayedDate: 'July 22, 2009',
            },
            {
              id: 'reveal-2',
              episodeId: 'ep1',
              episodeTime: 10,
              absolutePlayTime: 10,
              displayedTitle: null,
              displayedDescription: 'Second reveal',
              displayedDate: null,
            },
            {
              id: 'reveal-3',
              episodeId: 'ep1',
              episodeTime: 20,
              absolutePlayTime: 20,
              displayedTitle: null,
              displayedDescription: 'Third reveal',
              displayedDate: null,
            },
            {
              id: 'reveal-4',
              episodeId: 'ep1',
              episodeTime: 30,
              absolutePlayTime: 30,
              displayedTitle: null,
              displayedDescription: 'Fourth reveal',
              displayedDate: null,
            },
          ],
        },
      ],
      soundtracks: [],
    });

    const event = timelines[0].segments[0].subSegments[0].eventGroups[0].events[0];

    expect(event.reveals.map((reveal) => reveal.title)).toEqual([
      'The day of the eclipse',
      'The day of the eclipse',
      'The day of the eclipse',
      'The day of the eclipse',
    ]);
    expect(event.getTitle(10)).toBe('The day of the eclipse');
    expect(event.getTitle(20)).toBe('The day of the eclipse');
    expect(event.getTitle(30)).toBe('The day of the eclipse');
  });
});
