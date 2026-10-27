import type { IEvent } from '../../types/interfaces';
import { NarrativeStatus } from '../../types/timeline';

export function getNarrativeDateLabel(
  events: readonly IEvent[],
  playbackTime: number
): string {
  const visibleReveals = events
    .filter(
      event =>
        event.getNarrativeState(playbackTime) !== NarrativeStatus.NOT_REACHED
    )
    .flatMap(event =>
      event.reveals.filter(reveal => reveal.playtimeTimestamp <= playbackTime)
    );

  if (visibleReveals.length === 0) {
    return events[0]?.narrativeTimestamp.toLocaleDateString() ?? '';
  }

  return visibleReveals.reduce((mostSpecific, reveal) =>
    reveal.narrativeTimeframeSpecificityLevel >=
    mostSpecific.narrativeTimeframeSpecificityLevel
      ? reveal
      : mostSpecific
  ).narrativeTimeframe;
}
