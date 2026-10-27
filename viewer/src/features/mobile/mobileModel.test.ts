import { createElement } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { hydrate } from '../../utils/hydrate';
import { EventDetailSheet } from './EventDetailSheet';
import { TimelineMap } from './TimelineMap';
import {
  buildMobileTimelineModel,
  getAdjacentNarrativeReveals,
  getMobileCanonContext,
  layoutMobileTimeline,
  type MobileTimelineModel,
} from './mobileModel';

function buildModel() {
  const episodes = [
    { id: 'ep1', episodeNumber: 1, title: 'Episode 1', duration: 3600 },
    { id: 'ep2', episodeNumber: 2, title: 'Episode 2', duration: 3600 },
  ];
  const timelines = hydrate({
    episodes,
    timelines: [
      {
        id: 'tl1',
        name: 'Original Timeline',
        slices: [
          {
            id: 'slice-1',
            timelineId: 'tl1',
            shortDescription: 'Original history',
            startTimestamp: '2008-01-01T00:00:00Z',
            endTimestamp: '2024-01-01T00:00:00Z',
            importance: 'high',
          },
        ],
      },
      {
        id: 'tl2',
        name: 'First Jump',
        slices: [
          {
            id: 'slice-2',
            timelineId: 'tl2',
            shortDescription: 'Changed history',
            startTimestamp: '2008-01-01T00:00:00Z',
            endTimestamp: '2024-01-01T00:00:00Z',
            importance: 'high',
          },
        ],
      },
    ],
    events: [
      {
        id: 'original-before',
        timelineId: 'tl1',
        shortDescription: 'Original before',
        narrativeDate: '2008-01-02T00:00:00Z',
        tags: [],
        reveals: [
          {
            id: 'reveal-before',
            episodeId: 'ep1',
            episodeTime: 60,
            absolutePlayTime: 60,
            displayedTitle: 'Original before',
            displayedDescription: 'Before the branch',
            displayedDate: 'January 2, 2008',
          },
          {
            id: 'reveal-before-final',
            episodeId: 'ep2',
            episodeTime: 30,
            absolutePlayTime: 3630,
            displayedTitle: 'Original before, fully revealed',
            displayedDescription: 'The final reveal for this event',
            displayedDate: 'January 2, 2008',
          },
        ],
      },
      {
        id: 'original-after',
        timelineId: 'tl1',
        shortDescription: 'Original after',
        narrativeDate: '2008-01-05T00:00:00Z',
        tags: [],
        reveals: [
          {
            id: 'reveal-after',
            episodeId: 'ep2',
            episodeTime: 120,
            absolutePlayTime: 3720,
            displayedTitle: 'Original after',
            displayedDescription: 'Erased after the branch',
            displayedDate: 'January 5, 2008',
          },
        ],
      },
      {
        id: 'jump-out',
        timelineId: 'tl1',
        shortDescription: 'Jump out',
        narrativeDate: '2023-01-01T00:00:00Z',
        tags: [],
        eventType: 'timeslip-out',
        linkedEventId: 'jump-in',
        reveals: [
          {
            id: 'reveal-out',
            episodeId: 'ep1',
            episodeTime: 300,
            absolutePlayTime: 300,
            displayedTitle: 'Jump out',
            displayedDescription: 'Leaves the future',
            displayedDate: 'January 1, 2023',
          },
        ],
      },
      {
        id: 'jump-in',
        timelineId: 'tl2',
        shortDescription: 'Jump in',
        narrativeDate: '2008-01-03T00:00:00Z',
        tags: [],
        eventType: 'timeslip-in',
        linkedEventId: 'jump-out',
        reveals: [
          {
            id: 'reveal-in',
            episodeId: 'ep1',
            episodeTime: 310,
            absolutePlayTime: 310,
            displayedTitle: 'Jump in',
            displayedDescription: 'Arrives in the past',
            displayedDate: 'January 3, 2008',
          },
        ],
      },
      {
        id: 'changed-after',
        timelineId: 'tl2',
        shortDescription: 'Changed after',
        narrativeDate: '2008-01-06T00:00:00Z',
        tags: [],
        reveals: [
          {
            id: 'reveal-changed',
            episodeId: 'ep2',
            episodeTime: 180,
            absolutePlayTime: 3780,
            displayedTitle: 'Changed after',
            displayedDescription: 'New history',
            displayedDate: 'January 6, 2008',
          },
        ],
      },
      {
        id: 'same-jump-out',
        timelineId: 'tl2',
        shortDescription: 'Leave this timeline',
        narrativeDate: '2008-01-07T00:00:00Z',
        tags: [],
        eventType: 'timeslip-out',
        linkedEventId: 'same-jump-in',
        reveals: [
          {
            id: 'reveal-same-out',
            episodeId: 'ep2',
            episodeTime: 240,
            absolutePlayTime: 3840,
            displayedTitle: 'Leave this timeline',
            displayedDescription: 'Skips ahead without changing the timeline',
            displayedDate: 'January 7, 2008',
          },
        ],
      },
      {
        id: 'same-jump-in',
        timelineId: 'tl2',
        shortDescription: 'Return to this timeline',
        narrativeDate: '2008-01-08T00:00:00Z',
        tags: [],
        eventType: 'timeslip-in',
        linkedEventId: 'same-jump-out',
        reveals: [
          {
            id: 'reveal-same-in',
            episodeId: 'ep2',
            episodeTime: 300,
            absolutePlayTime: 3900,
            displayedTitle: 'Return to this timeline',
            displayedDescription: 'Arrives later on the same timeline',
            displayedDate: 'January 8, 2008',
          },
        ],
      },
    ],
    soundtracks: [],
  });

  return buildMobileTimelineModel(timelines, episodes);
}

describe('mobile timeline model', () => {
  it('orders the story by timeline, narrative time, then reveal order', () => {
    const model = buildModel();

    expect(model.events.map(event => event.id)).toEqual([
      'original-before',
      'original-after',
      'jump-out',
      'jump-in',
      'changed-after',
      'same-jump-out',
      'same-jump-in',
    ]);
    expect(model.narrativeReveals.map(reveal => reveal.id)).toEqual([
      'reveal-before',
      'reveal-before-final',
      'reveal-after',
      'reveal-out',
      'reveal-in',
      'reveal-changed',
      'reveal-same-out',
      'reveal-same-in',
    ]);
    expect(model.revealById.get('reveal-after')).toMatchObject({
      episodeId: 'ep2',
      episodeTime: 120,
    });
  });

  it('keeps ancestor events before the branch and marks later history erased', () => {
    const model = buildModel();
    const context = getMobileCanonContext(model, 'tl2');

    expect(context.activeEventIds).toEqual(
      new Set([
        'original-before',
        'jump-in',
        'changed-after',
        'same-jump-out',
        'same-jump-in',
      ])
    );
    expect(context.erasedEventIds).toEqual(new Set(['original-after', 'jump-out']));
    expect(context.ancestorTimelineIds).toEqual(new Set(['tl1']));
  });

  it('navigates once per active event using its final reveal', () => {
    const model = buildModel();

    expect(getAdjacentNarrativeReveals(model, 'reveal-before', 'tl2')).toEqual({
      previous: null,
      next: model.revealById.get('reveal-in'),
    });
    expect(getAdjacentNarrativeReveals(model, 'reveal-in', 'tl2')).toEqual({
      previous: model.revealById.get('reveal-before-final'),
      next: model.revealById.get('reveal-changed'),
    });
  });

  it('uses explicit links for jump endpoints and lays out all lanes in the width', () => {
    const model = buildModel();
    const jumpOut = model.eventById.get('jump-out');
    const layout = layoutMobileTimeline(model, 375);

    expect(jumpOut?.correlatedEvents.map(event => event.id)).toEqual(['jump-in']);
    expect(layout.laneX).toHaveLength(2);
    expect(layout.laneX[0]).toBeGreaterThanOrEqual(28);
    expect(layout.laneX[1]).toBeLessThanOrEqual(347);
    expect(layout.eventPositions.has('jump-out')).toBe(true);
    expect(layout.eventPositions.has('jump-in')).toBe(true);
    expect(layout.timelineStartY[0]).toBe(92);
    expect(layout.timelineStartY[1]).toBe(
      layout.eventPositions.get('jump-in')?.y
    );
    expect(layout.timelineEndY[0]).toBe(
      layout.eventPositions.get('jump-out')?.y
    );
    expect(layout.timelineSkippedRanges[1]).toEqual([
      {
        top: layout.eventPositions.get('same-jump-out')?.y,
        bottom: layout.eventPositions.get('same-jump-in')?.y,
      },
    ]);
  });

  it('aligns simultaneous events across timelines despite earlier same-day events', () => {
    const earlier = {
      id: 'earlier',
      narrativeTimestamp: new Date('2022-12-31T22:00:00Z'),
    };
    const timelineOneDeath = {
      id: 'timeline-one-death',
      narrativeTimestamp: new Date('2022-12-31T23:00:00Z'),
    };
    const timelineTwoDeath = {
      id: 'timeline-two-death',
      narrativeTimestamp: new Date('2022-12-31T23:00:00Z'),
    };
    const model = {
      timelines: [
        { id: 'tl1', timeslipOutEvents: [] },
        { id: 'tl2', timeslipOutEvents: [] },
      ],
      events: [earlier, timelineOneDeath, timelineTwoDeath],
      eventTimelineIds: new Map([
        [earlier.id, 'tl1'],
        [timelineOneDeath.id, 'tl1'],
        [timelineTwoDeath.id, 'tl2'],
      ]),
      timelineIndexById: new Map([
        ['tl1', 0],
        ['tl2', 1],
      ]),
      branchByTimelineId: new Map(),
    } as unknown as MobileTimelineModel;

    const layout = layoutMobileTimeline(model, 375);
    const earlierPosition = layout.eventPositions.get(earlier.id);
    const timelineOnePosition = layout.eventPositions.get(timelineOneDeath.id);
    const timelineTwoPosition = layout.eventPositions.get(timelineTwoDeath.id);

    expect(earlierPosition?.y).toBeLessThan(timelineOnePosition?.y ?? 0);
    expect(timelineOnePosition?.y).toBe(timelineTwoPosition?.y);
    expect(timelineOnePosition?.parallel).toBe(true);
    expect(timelineTwoPosition?.parallel).toBe(true);
  });

  it('highlights canon path segments and dims erased continuations', () => {
    const model = buildModel();
    const layout = layoutMobileTimeline(model, window.innerWidth);
    const entryY = layout.eventPositions.get('jump-in')?.y;
    const { container } = render(
      createElement(TimelineMap, {
        model,
        selectedRevealId: null,
        selectedTimelineId: 'tl2',
        onTimelineChange: () => undefined,
        onEventSelect: () => undefined,
      })
    );

    const mutedPaths = container.querySelectorAll(
      '.mobile-curve-path.is-muted'
    );
    const activePaths = container.querySelectorAll(
      '.mobile-curve-path:not(.is-muted)'
    );

    expect(mutedPaths).toHaveLength(4);
    expect(activePaths).toHaveLength(4);
    expect(container.querySelectorAll('.mobile-curve-path.is-skipped')).toHaveLength(2);
    expect(container.querySelector('.mobile-curve-jump')).toBeNull();
    expect(activePaths[0].getAttribute('d')).toMatch(
      new RegExp(` ${entryY}$`)
    );
    expect(activePaths[1].getAttribute('d')).toMatch(
      new RegExp(`^M [^ ]+ ${entryY} `)
    );
  });

  it('shows the narrative date beside the detail title', () => {
    const model = buildModel();
    const selectedReveal = model.revealById.get('reveal-before');
    expect(selectedReveal).toBeDefined();
    if (!selectedReveal) return;
    const originalScrollTo = HTMLElement.prototype.scrollTo;
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: () => undefined,
    });

    const { container } = render(
      createElement(EventDetailSheet, {
        model,
        selectedReveal,
        selectedTimelineId: 'all',
        open: true,
        onOpenChange: () => undefined,
        onRevealSelect: () => undefined,
      })
    );

    expect(container.querySelector('.mobile-detail-date')?.textContent).toBe(
      'January 2, 2008'
    );
    expect(container.querySelector('.mobile-detail-chevron')).toBeNull();
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: originalScrollTo,
    });
  });
});
