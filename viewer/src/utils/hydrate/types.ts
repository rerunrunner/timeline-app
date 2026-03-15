import type { NarrativeDate } from '../../types/interfaces';

/**
 * Internal interfaces for raw data structures used within the hydrate package.
 * These types are exported for use within the hydrate package but should not be used externally.
 * They represent the raw JSON data structure before hydration.
 */

/**
 * Raw soundtrack data from the JSON file.
 * Part of the hydrate package's internal implementation.
 * @internal
 */
export interface RawSoundtrack {
  id: string;
  title: string;
  mediaUrl: string;
}

/**
 * Raw episode data from the JSON file.
 * Part of the hydrate package's internal implementation.
 * @internal
 */
export interface RawEpisode {
  id: string;
  episodeNumber: number;
  title: string;
  duration: number;
}

/**
 * Raw timeline slice data from the JSON file.
 * Part of the hydrate package's internal implementation.
 * @internal
 */
export interface RawTimelineSlice {
  id: string;
  timelineId: string;
  shortDescription: string;
  startTimestamp: string;
  endTimestamp: string;
  importance?: 'low' | 'high';
}

/**
 * Raw timeline data from the JSON file.
 * Part of the hydrate package's internal implementation.
 * @internal
 */
export interface RawTimeline {
  id: string;
  name: string;
  slices: RawTimelineSlice[];
  segments: RawSegment[]; // Will be populated during hydration steps
}

/**
 * Raw reveal data from the JSON file.
 * Part of the hydrate package's internal implementation.
 * @internal
 */
export interface RawReveal {
  id: string;
  apparentTimelineId?: string;
  episodeId: string;
  episodeTime: number;
  absolutePlayTime: number;
  displayedDate?: string;
  displayedTitle?: string;
  displayedDescription?: string;
  notes?: string;
  screenshotFilename?: string;
}

/**
 * Raw event data from the JSON file.
 * Part of the hydrate package's internal implementation.
 * @internal
 */
export interface RawEvent {
  id: string;
  timelineId: string;
  shortDescription: string;
  narrativeDate: string;
  tags: string[];
  reveals: RawReveal[];
  eventType?: 'timeslip' | 'timeslip-in' | 'timeslip-out';
  soundtrackId?: string;
}

/**
 * Complete raw data structure from the JSON file.
 * Part of the hydrate package's internal implementation.
 * @internal
 */
export interface RawData {
  episodes: RawEpisode[];
  timelines: RawTimeline[];
  events: RawEvent[];
  soundtracks: RawSoundtrack[];
}

/**
 * Internal interfaces for intermediate data structures during hydration.
 */

/**
 * Intermediate event group data created during hydration.
 * Part of the hydrate package's internal implementation.
 * @internal
 */
export interface RawEventGroup {
  timelineId: string;
  date: string; // YYYY-MM-DD format
  events: RawEvent[];
}

/**
 * Intermediate subsegment data created during hydration.
 * Part of the hydrate package's internal implementation.
 * @internal
 */
export interface RawSubSegment {
  id: string;
  start: NarrativeDate;
  end: NarrativeDate;
  events: RawEvent[];
  eventGroups: RawEventGroup[]; // Will be populated in Step 5
  fractionOfSegment: number; // Percentage of segment width (0-1)
}

/**
 * Intermediate segment data created during hydration.
 * Part of the hydrate package's internal implementation.
 * @internal
 */
export interface RawSegment {
  id: string;
  scale: number;
  fractionOfTimeline: number; // Percentage of timeline width (0-1)
  name: string;
  start: NarrativeDate;
  end: NarrativeDate;
  timelineId: string;
  subSegments: RawSubSegment[]; // Will be populated in Step 4
  narrativeStatus: string;
} 