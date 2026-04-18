import { describe, expect, it } from 'vitest';
import { hydrate } from './index';
import { resolveLocalizedRawData } from './localize';
import type { RawData } from './types';

function createLocalizedDataset(): RawData {
  return {
    defaultLanguageCode: 'en',
    languages: [
      { code: 'en', name: 'English', localizedName: 'English', flagEmoji: '🇺🇸', isDefault: true },
      { code: 'ko', name: 'Korean', localizedName: '한국어', flagEmoji: '🇰🇷', isDefault: false },
    ],
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
            startTimestamp: '2023-01-01T00:00:00Z',
            endTimestamp: '2023-01-31T00:00:00Z',
            importance: 'high',
          },
        ],
        segments: [],
      },
    ],
    events: [
      {
        id: 'event-1',
        timelineId: 'tl1',
        shortDescription: 'event-1',
        narrativeDate: '2023-01-16T00:00:00Z',
        tags: [],
        reveals: [
          {
            id: 'reveal-1',
            episodeId: 'ep1',
            episodeTime: 0,
            absolutePlayTime: 0,
            narrativeTimeframeSpecificityLevel: 9,
            translations: {
              en: {
                displayedDate: 'January 16, 2023',
                displayedTitle: 'Sol confesses to Sun-jae',
                displayedDescription: 'English first reveal',
              },
              ko: {
                displayedDate: '2023년 1월 16일',
                displayedTitle: '솔, 선재에게 고백하다',
                displayedDescription: '한국어 첫 번째 리빌',
              },
            },
          },
          {
            id: 'reveal-2',
            episodeId: 'ep1',
            episodeTime: 10,
            absolutePlayTime: 10,
            narrativeTimeframeSpecificityLevel: 9,
            translations: {
              en: {
                displayedDate: 'January 16, 2023',
                displayedTitle: 'Sol confesses to Sun-jae',
                displayedDescription: 'English second reveal',
              },
              ko: {
                displayedDescription: '한국어 두 번째 리빌',
              },
            },
          },
          {
            id: 'reveal-3',
            episodeId: 'ep1',
            episodeTime: 20,
            absolutePlayTime: 20,
            narrativeTimeframeSpecificityLevel: 9,
            translations: {
              en: {
                displayedDate: 'January 17, 2023',
                displayedTitle: 'Sol and Sun-jae reconcile',
                displayedDescription: 'English fallback reveal',
              },
            },
          },
        ],
      },
    ],
    soundtracks: [],
  };
}

describe('resolveLocalizedRawData', () => {
  it('resolves selected-language reveal strings with per-field default fallback', () => {
    const localized = resolveLocalizedRawData(createLocalizedDataset(), 'ko');
    const reveals = localized.events[0].reveals;

    expect(reveals[0].displayedDate).toBe('2023년 1월 16일');
    expect(reveals[0].displayedTitle).toBe('솔, 선재에게 고백하다');
    expect(reveals[0].displayedDescription).toBe('한국어 첫 번째 리빌');

    expect(reveals[1].displayedDate).toBe('January 16, 2023');
    expect(reveals[1].displayedTitle).toBe('Sol confesses to Sun-jae');
    expect(reveals[1].displayedDescription).toBe('한국어 두 번째 리빌');

    expect(reveals[2].displayedDate).toBe('January 17, 2023');
    expect(reveals[2].displayedTitle).toBe('Sol and Sun-jae reconcile');
    expect(reveals[2].displayedDescription).toBe('English fallback reveal');
  });

  it('uses the exported specificity level for localized dates during hydration', () => {
    const localized = resolveLocalizedRawData(createLocalizedDataset(), 'ko');
    const timelines = hydrate(localized);
    const event = timelines[0].segments[0].subSegments[0].eventGroups[0].events[0];

    expect(event.reveals[0].narrativeTimeframe).toBe('2023년 1월 16일');
    expect(event.reveals[0].narrativeTimeframeSpecificityLevel).toBe(9);
    expect(event.reveals[1].narrativeTimeframeSpecificityLevel).toBe(9);
    expect(event.reveals[2].narrativeTimeframeSpecificityLevel).toBe(9);
  });

  it('preserves exported language metadata for selector rendering', () => {
    const localized = resolveLocalizedRawData(createLocalizedDataset(), 'ko');

    expect(localized.languages).toEqual([
      { code: 'en', name: 'English', localizedName: 'English', flagEmoji: '🇺🇸', isDefault: true },
      { code: 'ko', name: 'Korean', localizedName: '한국어', flagEmoji: '🇰🇷', isDefault: false },
    ]);
  });
});
