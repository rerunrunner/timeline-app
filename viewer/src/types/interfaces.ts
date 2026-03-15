import { NarrativeStatus, EventType } from './timeline';

export type ReadonlyNonEmptyArray<T> = readonly [T, ...T[]];
export type ReadonlyArray<T> = readonly T[];

/**
 * Type alias for playback time values in seconds.
 * Used to distinguish playback time from narrative time.
 */
export type PlaybackTime = number; // in seconds

/**
 * Type alias for narrative time values as Date objects.
 * Used to distinguish narrative time from playtime.
 */
export type NarrativeDate = Date;

/**
 * Interface for soundtrack information.
 * Contains metadata about OST tracks associated with events.
 */
export interface ISoundtrack {
  readonly id: string;
  readonly title: string;
  readonly mediaUrl: string;
}

/**
 * Interface for a reveal event in the immutable data hierarchy.
 * Reveals are events that happen at specific playtime moments.
 */
export interface IReveal {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly playtimeTimestamp: number; // time in playback when this reveal happens (in seconds)
    readonly narrativeTimeframe: string; // e.g., "late spring", "2023", etc.
    readonly narrativeTimeframeSpecificityLevel: number; // Specificity level: 0=future/unknown, 1=decade, 2=partial decade, 3=year, 4=partial year, 5=season, 6=partial season, 7=month, 8=partial month, 9=day
    readonly screenshotFilename: string | null;
    readonly apparentTimeline?: string; // Timeline ID where this reveal should appear
    readonly event: IEvent; // upward reference
  }
  
/**
 * Interface for an event in the immutable data hierarchy.
 */
export interface IEvent {
  readonly id: string;
  readonly narrativeTimestamp: NarrativeDate; // time in the story when this event happened (in seconds)
  readonly tags: readonly string[];
  readonly eventType?: EventType;
  readonly reveals: ReadonlyNonEmptyArray<IReveal>;
  readonly eventGroup: IEventGroup; // upward reference
  readonly narrativeTransitions: readonly [PlaybackTime, NarrativeStatus][]; // [playbackTime, state]
  readonly correlatedEvents: readonly IEvent[]; // Events that should be highlighted together (e.g., timeslip pairs)
  readonly soundtrack?: ISoundtrack; // Optional soundtrack associated with this event
  
  /**
   * Get the narrative state of this event at the given time.
   * @param playbackTime - Current playback time in seconds
   * @returns The narrative status of this event at that time
   */
  getNarrativeState(playbackTime: PlaybackTime): NarrativeStatus;
  
  /**
   * Get the title from the latest reveal that has been reached at the given time.
   * @param playbackTime - Current playback time in seconds
   * @returns The title from the most recent reveal, or empty string if no reveals reached
   */
  getTitle(playbackTime: PlaybackTime): string;
  
  /**
   * Get the description from the latest reveal that has been reached at the given time.
   * @param playbackTime - Current playback time in seconds
   * @returns The description from the most recent reveal, or empty string if no reveals reached
   */
  getDescription(playbackTime: PlaybackTime): string;
  
  /**
   * Get the narrative timeframe from the latest reveal that has been reached at the given time.
   * @param playbackTime - Current playback time in seconds
   * @returns The narrative timeframe from the most recent reveal, or empty string if no reveals reached
   */
  getNarrativeTimeframe(playbackTime: PlaybackTime): string;
  
  /**
   * Get the screenshot filename from the latest reveal that has been reached at the given time.
   * @param playbackTime - Current playback time in seconds
   * @returns The screenshot filename from the most recent reveal, or null if no reveals reached or no screenshot
   */
  getScreenshotFilename(playbackTime: PlaybackTime): string | null;
}

/**
 * Interface for a timeline slice in the immutable data hierarchy.
 */
export interface ITimelineSlice {
  readonly id: string;
  readonly name: string;
  readonly startTime: number; // in seconds
  readonly endTime: number; // in seconds
}

/**
 * Interface for a segment in the immutable data hierarchy.
 */
export interface ISegment {
  readonly id: string;
  readonly name: string;
  readonly start: NarrativeDate; // start time in the story (in seconds)
  readonly end: NarrativeDate; // end time in the story (in seconds)
  readonly subSegments: ReadonlyNonEmptyArray<ISubSegment>;
  readonly fractionOfTimeline: number; // percentage of timeline width
  readonly scale: number; // scale factor for the segment (days/weeks/months, etc.)
  readonly timeline: ITimeline; // upward reference
  readonly isFirst: boolean; // whether this is the first segment in the timeline
  readonly isLast: boolean; // whether this is the last segment in the timeline
  
  /**
   * Get the narrative state of this segment at the given time.
   * @param playbackTime - Current playback time in seconds
   * @returns The narrative status of this segment at that time
   */
  getNarrativeState(playbackTime: PlaybackTime): NarrativeStatus;
  
  /**
   * Get the apparent timeline for this segment based on the most recent visible reveal.
   * @param playbackTime - Current playback time in seconds
   * @param canonicalTimelineId - The canonical timeline ID
   * @returns The apparent timeline ID
   */
  getApparentTimeline(playbackTime: PlaybackTime, canonicalTimelineId: string): string;
}

/**
 * Interface for a subsegment in the immutable data hierarchy.
 */
export interface ISubSegment {
  readonly id: string;
  readonly name: string;
  readonly start: NarrativeDate; // start time in the story (in seconds)
  readonly end: NarrativeDate; // end time in the story (in seconds)
  readonly eventGroups: ReadonlyArray<IEventGroup>; // subsegments may have no event groups
  readonly fractionOfSegment: number; // percentage of segment width
  readonly position: number; // percentage from left edge of segment
  readonly segment: ISegment; // upward reference
  
  /**
   * Get the narrative state of this subsegment at the given time.
   * @param playbackTime - Current playback time in seconds
   * @returns The narrative status of this subsegment at that time
   */
  getNarrativeState(playbackTime: PlaybackTime): NarrativeStatus;
  
  /**
   * Get all events in this subsegment (flattened from all event groups).
   */
  get events(): readonly IEvent[];
}

/**
 * Interface for an event group in the immutable data hierarchy.
 */
export interface IEventGroup {
  readonly id: string;
  readonly events: ReadonlyNonEmptyArray<IEvent>;
  readonly primaryEvent: IEvent; // The most recently revealed event
  readonly subSegment: ISubSegment; // upward reference
  
  /**
   * Get the narrative state of this event group at the given time.
   * @param playbackTime - Current playback time in seconds
   * @returns The narrative status of this event group at that time
   */
  getNarrativeState(playbackTime: PlaybackTime): NarrativeStatus;
  
  /**
   * Get the narrative timeframe from the primary event at the given time.
   * @param playbackTime - Current playback time in seconds
   * @returns The narrative timeframe from the primary event, or empty string if none available
   */
  getNarrativeTimeframe(playbackTime: PlaybackTime): string;
  
  /**
   * Get the number of events that have been revealed up to the current point in time.
   * @param playbackTime - Current playback time in seconds
   * @returns The count of revealed events
   */
  getTotalEvents(playbackTime: PlaybackTime): number;
}

/**
 * Interface for a timeline in the immutable data hierarchy.
 * This is the top-level interface that contains segments.
 */
export interface ITimeline {
  readonly id: string;
  readonly name: string;
  readonly segments: ReadonlyNonEmptyArray<ISegment>;
  readonly start: NarrativeDate; // start time in the story (in seconds)
  readonly end: NarrativeDate; // end time in the story (in seconds)
  readonly timeslipInEvents: readonly IEvent[];
  readonly timeslipOutEvents: readonly IEvent[];
  
  /**
   * Get the narrative state of this timeline at the given time.
   * @param playbackTime - Current playback time in seconds
   * @returns The narrative status of this timeline at that time
   */
  getNarrativeState(playbackTime: PlaybackTime): NarrativeStatus;
  
  /**
   * Get the first timeslip-in event for this timeline, or null if this is the original timeline.
   */
  get firstEntryPoint(): IEvent | null;
  
  /**
   * Get the last timeslip-out event for this timeline, or null if this is the final timeline.
   */
  get lastExitPoint(): IEvent | null;
} 