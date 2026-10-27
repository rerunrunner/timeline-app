import { describe, expect, it } from 'vitest';
import type { IEvent } from '../../types/interfaces';
import { NarrativeStatus } from '../../types/timeline';
import { getNarrativeDateLabel } from './narrativeDate';

function eventsWithProgressivelySpecificDates(): readonly IEvent[] {
  const event = (
    playtimeTimestamp: number,
    narrativeTimeframe: string,
    narrativeTimeframeSpecificityLevel: number
  ) => ({
    narrativeTimestamp: new Date('2008-06-01T00:00:00Z'),
    getNarrativeState: () => NarrativeStatus.CANONICAL,
    reveals: [
      {
        playtimeTimestamp,
        narrativeTimeframe,
        narrativeTimeframeSpecificityLevel,
      },
    ],
  });

  return [
    event(100, 'Late Spring 2008', 6),
    event(200, 'June 1, 2008', 9),
  ] as unknown as readonly IEvent[];
}

describe('narrative date labels', () => {
  it('uses the most-specific date revealed in the day group', () => {
    const events = eventsWithProgressivelySpecificDates();

    expect(getNarrativeDateLabel(events, 150)).toBe('Late Spring 2008');
    expect(getNarrativeDateLabel(events, Number.POSITIVE_INFINITY)).toBe(
      'June 1, 2008'
    );
  });
});
