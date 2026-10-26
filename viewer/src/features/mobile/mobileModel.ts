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
  eventPositions: ReadonlyMap<string, MobileEventPosition>;
  dateGroups: readonly MobileDateGroup[];
}

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
  const onPath = activeEventIds
    ? model.narrativeReveals.filter(reveal => activeEventIds.has(reveal.event.id))
    : model.narrativeReveals;
  const index = onPath.findIndex(reveal => reveal.id === revealId);

  if (index >= 0) {
    return {
      previous: index > 0 ? onPath[index - 1] : null,
      next: index < onPath.length - 1 ? onPath[index + 1] : null,
    };
  }

  const onPathIds = new Set(onPath.map(reveal => reveal.id));
  const globalIndex = model.narrativeReveals.findIndex(reveal => reveal.id === revealId);
  return {
    previous:
      model.narrativeReveals
        .slice(0, globalIndex)
        .reverse()
        .find(reveal => onPathIds.has(reveal.id)) ?? null,
    next:
      model.narrativeReveals
        .slice(globalIndex + 1)
        .find(reveal => onPathIds.has(reveal.id)) ?? null,
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
      const eventsByTimeline = new Map<string, IEvent[]>();
      for (const event of events) {
        const timelineId = model.eventTimelineIds.get(event.id) ?? '';
        const timelineEventsForDate = eventsByTimeline.get(timelineId) ?? [];
        timelineEventsForDate.push(event);
        eventsByTimeline.set(timelineId, timelineEventsForDate);
      }

      const maxStack = Math.max(...[...eventsByTimeline.values()].map(group => group.length));
      const top = cursorY;
      const height = Math.max(74, 42 + maxStack * 38);
      for (const [timelineId, timelineEventsForDate] of eventsByTimeline) {
        const timelineIndex = model.timelineIndexById.get(timelineId) ?? 0;
        timelineEventsForDate.forEach((event, index) => {
          eventPositions.set(event.id, {
            x: laneX[timelineIndex],
            y: top + 40 + index * 38,
            timelineIndex,
            parallel: eventsByTimeline.size > 1,
          });
        });
      }
      cursorY += height;
      return { key, timestamp, top, timelineCount: eventsByTimeline.size };
    });

  return {
    width,
    height: cursorY + 150,
    laneX,
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
