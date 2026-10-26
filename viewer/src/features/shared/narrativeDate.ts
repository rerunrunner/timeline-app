import type { IEventGroup } from '../../types/interfaces';
import { NarrativeStatus } from '../../types/timeline';

export function getNarrativeDateLabel(
  eventGroup: IEventGroup,
  playbackTime: number
): string {
  const visibleReveals = eventGroup.events
    .filter(
      event =>
        event.getNarrativeState(playbackTime) !== NarrativeStatus.NOT_REACHED
    )
    .flatMap(event =>
      event.reveals.filter(reveal => reveal.playtimeTimestamp <= playbackTime)
    );

  if (visibleReveals.length === 0) {
    return eventGroup.events[0].narrativeTimestamp.toLocaleDateString();
  }

  return visibleReveals.reduce((mostSpecific, reveal) =>
    reveal.narrativeTimeframeSpecificityLevel >=
    mostSpecific.narrativeTimeframeSpecificityLevel
      ? reveal
      : mostSpecific
  ).narrativeTimeframe;
}
