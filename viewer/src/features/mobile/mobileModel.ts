import type { IEvent, IReveal, ITimeline } from '../../types/interfaces';
import type { MobileRootProps } from './contract';

export const MOBILE_TIMELINE_COLORS = [
  '#62c8ff',
  '#f0bd64',
  '#ed7890',
  '#9a8cff',
  '#67d2a0',
] as const;

export interface MobileTimelineModel {
  timelines: readonly ITimeline[];
  episodes: NonNullable<MobileRootProps['episodes']>;
  events: readonly IEvent[];
  narrativeReveals: readonly IReveal[];
  playbackReveals: readonly IReveal[];
  eventTimelineIds: ReadonlyMap<string, string>;
  eventById: ReadonlyMap<string, IEvent>;
  revealById: ReadonlyMap<string, IReveal>;
  episodeById: ReadonlyMap<string, NonNullable<MobileRootProps['episodes']>[number]>;
  timelineById: ReadonlyMap<string, ITimeline>;
  timelineIndexById: ReadonlyMap<string, number>;
  branchByTimelineId: ReadonlyMap<string, MobileBranch>;
}

interface MobileBranch {
  entry: IEvent;
  parent: IEvent;
}

interface MobileCanonContext {
  activeEventIds: ReadonlySet<string>;
  erasedEventIds: ReadonlySet<string>;
  ancestorTimelineIds: ReadonlySet<string>;
}

interface MobileEventPosition {
  x: number;
  y: number;
  timelineIndex: number;
  parallel: boolean;
}

interface MobileDateGroup {
  key: string;
  timestamp: number;
  top: number;
  timelineCount: number;
}

interface MobileTimelineLayout {
  width: number;
  height: number;
  laneX: readonly number[];
  timelineStartY: readonly number[];
  timelineEndY: readonly number[];
  timelineSkippedRanges: readonly (readonly {
    top: number;
    bottom: number;
  }[])[];
  eventPositions: ReadonlyMap<string, MobileEventPosition>;
  dateGroups: readonly MobileDateGroup[];
}

const TIMELINE_PATH_TOP = 92;

function timelineEvents(timeline: ITimeline): IEvent[] {
  return timeline.segments.flatMap(segment =>
    segment.subSegments.flatMap(subSegment =>
      subSegment.eventGroups.flatMap(eventGroup => eventGroup.events)
    )
  );
}

function timelineIdForEvent(event: IEvent): string {
  return event.eventGroup.subSegment.segment.timeline.id;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildMobileTimelineModel(
  timelines: readonly ITimeline[],
  episodes: NonNullable<MobileRootProps['episodes']> = []
): MobileTimelineModel {
  const timelineIndexById = new Map(timelines.map((timeline, index) => [timeline.id, index]));
  const eventTimelineIds = new Map<string, string>();

  const events = timelines
    .flatMap(timeline =>
      timelineEvents(timeline).map(event => {
        eventTimelineIds.set(event.id, timeline.id);
        return event;
      })
    )
    .sort((left, right) => {
      const timelineDifference =
        (timelineIndexById.get(timelineIdForEvent(left)) ?? Number.MAX_SAFE_INTEGER) -
        (timelineIndexById.get(timelineIdForEvent(right)) ?? Number.MAX_SAFE_INTEGER);
      return (
        timelineDifference ||
        left.narrativeTimestamp.getTime() - right.narrativeTimestamp.getTime() ||
        left.reveals[0].playtimeTimestamp - right.reveals[0].playtimeTimestamp
      );
    });

  const eventById = new Map(events.map(event => [event.id, event]));
  const branchByTimelineId = new Map<string, MobileBranch>();

  for (const timeline of timelines) {
    const entry = timeline.timeslipInEvents
      .slice()
      .sort((left, right) => left.narrativeTimestamp.getTime() - right.narrativeTimestamp.getTime())
      .find(event =>
        event.correlatedEvents.some(linked => timelineIdForEvent(linked) !== timeline.id)
      );
    const parent = entry?.correlatedEvents.find(
      linked => timelineIdForEvent(linked) !== timeline.id
    );
    if (entry && parent) {
      branchByTimelineId.set(timeline.id, { entry, parent });
    }
  }

  const narrativeReveals = events.flatMap(event => event.reveals);
  const playbackReveals = [...narrativeReveals].sort(
    (left, right) => left.playtimeTimestamp - right.playtimeTimestamp
  );

  return {
    timelines,
    episodes: [...episodes].sort((left, right) => left.episodeNumber - right.episodeNumber),
    events,
    narrativeReveals,
    playbackReveals,
    eventTimelineIds,
    eventById,
    revealById: new Map(narrativeReveals.map(reveal => [reveal.id, reveal])),
    episodeById: new Map(episodes.map(episode => [episode.id, episode])),
    timelineById: new Map(timelines.map(timeline => [timeline.id, timeline])),
    timelineIndexById,
    branchByTimelineId,
  };
}

export function getMobileCanonContext(
  model: MobileTimelineModel,
  selectedTimelineId: string
): MobileCanonContext {
  if (selectedTimelineId === 'all') {
    return {
      activeEventIds: new Set(model.events.map(event => event.id)),
      erasedEventIds: new Set(),
      ancestorTimelineIds: new Set(),
    };
  }

  const activeEventIds = new Set(
    model.events
      .filter(event => model.eventTimelineIds.get(event.id) === selectedTimelineId)
      .map(event => event.id)
  );
  const ancestorTimelineIds = new Set<string>();
  let childTimelineId = selectedTimelineId;
  let cutoff = Number.POSITIVE_INFINITY;

  while (model.branchByTimelineId.has(childTimelineId)) {
    const branch = model.branchByTimelineId.get(childTimelineId);
    if (!branch) break;

    cutoff = Math.min(cutoff, branch.entry.narrativeTimestamp.getTime());
    const parentTimelineId = model.eventTimelineIds.get(branch.parent.id);
    if (!parentTimelineId) break;

    ancestorTimelineIds.add(parentTimelineId);
    for (const event of model.events) {
      if (
        model.eventTimelineIds.get(event.id) === parentTimelineId &&
        event.narrativeTimestamp.getTime() <= cutoff
      ) {
        activeEventIds.add(event.id);
      }
    }
    childTimelineId = parentTimelineId;
  }

  return {
    activeEventIds,
    erasedEventIds: new Set(
      model.events.filter(event => !activeEventIds.has(event.id)).map(event => event.id)
    ),
    ancestorTimelineIds,
  };
}

export function getAdjacentNarrativeReveals(
  model: MobileTimelineModel,
  revealId: string,
  selectedTimelineId: string
): { previous: IReveal | null; next: IReveal | null } {
  const activeEventIds =
    selectedTimelineId === 'all'
      ? null
      : getMobileCanonContext(model, selectedTimelineId).activeEventIds;
  const selectedEventId = model.revealById.get(revealId)?.event.id;
  const onPath = model.events
    .filter(event => !activeEventIds || activeEventIds.has(event.id))
    .map(event => event.reveals.at(-1))
    .filter((reveal): reveal is IReveal => Boolean(reveal));
  const index = onPath.findIndex(reveal => reveal.event.id === selectedEventId);

  if (index >= 0) {
    return {
      previous: index > 0 ? onPath[index - 1] : null,
      next: index < onPath.length - 1 ? onPath[index + 1] : null,
    };
  }

  const onPathEventIds = new Set(onPath.map(reveal => reveal.event.id));
  const globalIndex = model.events.findIndex(event => event.id === selectedEventId);
  const previousEvent = model.events
    .slice(0, globalIndex)
    .reverse()
    .find(event => onPathEventIds.has(event.id));
  const nextEvent = model.events
    .slice(globalIndex + 1)
    .find(event => onPathEventIds.has(event.id));
  return {
    previous: previousEvent?.reveals.at(-1) ?? null,
    next: nextEvent?.reveals.at(-1) ?? null,
  };
}

export function findRevealAtPlaybackTime(
  model: MobileTimelineModel,
  playbackTime: number
): IReveal | null {
  return (
    model.playbackReveals
      .filter(reveal => reveal.playtimeTimestamp <= playbackTime)
      .at(-1) ??
    model.playbackReveals[0] ??
    null
  );
}

export function layoutMobileTimeline(
  model: MobileTimelineModel,
  availableWidth: number
): MobileTimelineLayout {
  const width = Math.max(320, availableWidth);
  const sidePadding = Math.min(44, Math.max(28, width * 0.09));
  const laneGap =
    (width - sidePadding * 2) / Math.max(1, model.timelines.length - 1);
  const laneX = model.timelines.map((_, index) => sidePadding + index * laneGap);
  const groupedEvents = new Map<string, IEvent[]>();

  for (const event of model.events) {
    const key = dateKey(event.narrativeTimestamp);
    const group = groupedEvents.get(key) ?? [];
    group.push(event);
    groupedEvents.set(key, group);
  }

  let cursorY = 116;
  const eventPositions = new Map<string, MobileEventPosition>();
  const dateGroups = [...groupedEvents.entries()]
    .map(([key, events]) => ({
      key,
      events,
      timestamp: Math.min(...events.map(event => event.narrativeTimestamp.getTime())),
    }))
    .sort((left, right) => left.timestamp - right.timestamp)
    .map(({ key, events, timestamp }) => {
      const eventsByTimestamp = new Map<number, IEvent[]>();
      for (const event of events) {
        const eventTimestamp = event.narrativeTimestamp.getTime();
        const simultaneousEvents = eventsByTimestamp.get(eventTimestamp) ?? [];
        simultaneousEvents.push(event);
        eventsByTimestamp.set(eventTimestamp, simultaneousEvents);
      }

      const top = cursorY;
      let rowTop = top + 40;
      for (const [, simultaneousEvents] of [...eventsByTimestamp.entries()].sort(
        ([left], [right]) => left - right
      )) {
        const eventsByTimeline = new Map<string, IEvent[]>();
        for (const event of simultaneousEvents) {
          const timelineId = model.eventTimelineIds.get(event.id) ?? '';
          const timelineEvents = eventsByTimeline.get(timelineId) ?? [];
          timelineEvents.push(event);
          eventsByTimeline.set(timelineId, timelineEvents);
        }
        const rowStack = Math.max(
          ...[...eventsByTimeline.values()].map(group => group.length)
        );
        for (const [timelineId, timelineEvents] of eventsByTimeline) {
          const timelineIndex = model.timelineIndexById.get(timelineId) ?? 0;
          timelineEvents.forEach((event, index) => {
            eventPositions.set(event.id, {
              x: laneX[timelineIndex],
              y: rowTop + index * 62,
              timelineIndex,
              parallel: eventsByTimeline.size > 1,
            });
          });
        }
        rowTop += rowStack * 62;
      }
      const height = Math.max(74, 42 + rowTop - (top + 40));
      cursorY += height;
      return {
        key,
        timestamp,
        top,
        timelineCount: new Set(
          events.map(event => model.eventTimelineIds.get(event.id))
        ).size,
      };
    });
  const height = cursorY + 150;
  const defaultEndY = height - 70;
  const timelineStartY = model.timelines.map(timeline => {
    const entry = model.branchByTimelineId.get(timeline.id)?.entry;
    return entry
      ? eventPositions.get(entry.id)?.y ?? TIMELINE_PATH_TOP
      : TIMELINE_PATH_TOP;
  });
  const timelineEndY = model.timelines.map((timeline, index) => {
    const crossTimelineDeparture = timeline.timeslipOutEvents
      .filter(event =>
        event.correlatedEvents.some(
          linked => model.eventTimelineIds.get(linked.id) !== timeline.id
        )
      )
      .map(event => eventPositions.get(event.id)?.y)
      .filter((y): y is number => y !== undefined)
      .sort((left, right) => left - right)[0];
    return Math.max(
      timelineStartY[index],
      crossTimelineDeparture ?? defaultEndY
    );
  });
  const timelineSkippedRanges = model.timelines.map((timeline, index) =>
    timeline.timeslipOutEvents
      .flatMap(departure =>
        departure.correlatedEvents
          .filter(
            arrival => model.eventTimelineIds.get(arrival.id) === timeline.id
          )
          .map(arrival => {
            const departureY = eventPositions.get(departure.id)?.y;
            const arrivalY = eventPositions.get(arrival.id)?.y;
            if (departureY === undefined || arrivalY === undefined) return null;
            return {
              top: Math.max(
                timelineStartY[index],
                Math.min(departureY, arrivalY)
              ),
              bottom: Math.min(
                timelineEndY[index],
                Math.max(departureY, arrivalY)
              ),
            };
          })
      )
      .filter(
        (range): range is { top: number; bottom: number } =>
          range !== null && range.bottom > range.top
      )
      .sort((left, right) => left.top - right.top)
  );

  return {
    width,
    height,
    laneX,
    timelineStartY,
    timelineEndY,
    timelineSkippedRanges,
    eventPositions,
    dateGroups,
  };
}

export function timelineDisplayName(name: string): string {
  return name
    .replace(/\s+-\s+/, ' · ')
    .replace(/Highschool(\d+)/gi, 'High School $1');
}

export function timelineShortName(name: string): string {
  return timelineDisplayName(name).split(' · ')[0];
}

export function formatEpisodeTime(value: number): string {
  const totalSeconds = Math.max(0, value || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}
