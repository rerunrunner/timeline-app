import { describe, expect, it } from 'vitest';
import type { IEventGroup } from '../../types/interfaces';
import { NarrativeStatus } from '../../types/timeline';
import { getNarrativeDateLabel } from './narrativeDate';

function eventGroupWithProgressivelySpecificDates(): IEventGroup {
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

  return {
    events: [
      event(100, 'Late Spring 2008', 6),
      event(200, 'June 1, 2008', 9),
    ],
  } as unknown as IEventGroup;
}

describe('narrative date labels', () => {
  it('uses the most-specific date revealed in the day group', () => {
    const eventGroup = eventGroupWithProgressivelySpecificDates();

    expect(getNarrativeDateLabel(eventGroup, 150)).toBe('Late Spring 2008');
    expect(getNarrativeDateLabel(eventGroup, Number.POSITIVE_INFINITY)).toBe(
      'June 1, 2008'
    );
  });
});
