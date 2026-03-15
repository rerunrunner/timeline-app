import type { ITimeline, ISubSegment, ISegment, IEvent } from '../../types/interfaces';
import { NarrativeStatus, EventType } from '../../types/timeline';
import { assert } from './assert';
import { HydratedSegment } from './HydratedSegment';
import type { RawTimeline, RawSoundtrack } from './types';
import type { NarrativeTransition } from './narrativeTransitions';

type ReadonlyNonEmptyArray<T> = readonly [T, ...T[]];

/**
 * Class that implements ITimeline interface
 */
export class HydratedTimeline implements ITimeline {
  readonly id: string;
  readonly name: string;
  readonly segments: ReadonlyNonEmptyArray<ISegment>;
  readonly start: Date;
  readonly end: Date;
  readonly timeslipInEvents: readonly IEvent[];
  readonly timeslipOutEvents: readonly IEvent[];
  readonly events: readonly IEvent[];

  constructor(rawTimeline: RawTimeline, narrativeTransitions?: readonly NarrativeTransition[], soundtracks?: readonly RawSoundtrack[]) {
    // Validate required fields
    assert(Boolean(rawTimeline.id && rawTimeline.id.length > 0), 
      `Invalid timeline ID: ${rawTimeline.id}. Must be a non-empty string.`);
    
    assert(Boolean(rawTimeline.name && rawTimeline.name.length > 0), 
      `Invalid timeline name: ${rawTimeline.name}. Must be a non-empty string.`);
    
    // Validate raw segments array
    assert(Array.isArray(rawTimeline.segments), 
      `Invalid timeline raw segments: ${rawTimeline.segments}. Must be an array.`);
    assert(rawTimeline.segments.length > 0, 'A timeline must have at least one segment.');

    // Set basic properties
    this.id = rawTimeline.id;
    this.name = rawTimeline.name;
    // Create hydrated segments
    const hydratedSegments = rawTimeline.segments.map((rawSegment, index) => 
      new HydratedSegment(rawSegment, this, index, rawTimeline.segments.length, narrativeTransitions, soundtracks) // Pass timeline reference, index, total count, narrative transitions, and soundtracks
    );
    this.segments = hydratedSegments as unknown as ReadonlyNonEmptyArray<ISegment>;
    
    // Calculate narrative date range from segments
    this.start = new Date(Math.min(...hydratedSegments.map(s => s.start.getTime())));
    this.end = new Date(Math.max(...hydratedSegments.map(s => s.end.getTime())));
    
    // TODO: Calculate timeslip events from segments
    this.events = hydratedSegments.flatMap(s => s.subSegments.flatMap(f => f.events))
    this.timeslipInEvents = this.events.filter(e => e.eventType === EventType.TIMESLIP_IN);
    this.timeslipOutEvents = this.events.filter(e => e.eventType === EventType.TIMESLIP_OUT);
  }

  getNarrativeState(playbackTime: number): NarrativeStatus {
    // A timeline's narrative state is determined by its segments
    // If any segment is canonical, the timeline is canonical
    // If all segments are erased, the timeline is erased
    // If all segments are not reached, the timeline is not reached
    
    const segmentStates = this.segments.map(segment => segment.getNarrativeState(playbackTime));
    
    // If any segment is canonical, the timeline is canonical
    if (segmentStates.includes(NarrativeStatus.CANONICAL)) {
      return NarrativeStatus.CANONICAL;
    }
    
    // If any segment is erased, the timeline is erased
    if (segmentStates.includes(NarrativeStatus.ERASED)) {
      return NarrativeStatus.ERASED;
    }
    
    // Otherwise, all segments are not reached
    return NarrativeStatus.NOT_REACHED;
  }

  get firstEntryPoint(): IEvent | null {
    return this.timeslipInEvents[0] || null;
  }

  get lastExitPoint(): IEvent | null {
    return this.timeslipOutEvents[this.timeslipOutEvents.length - 1] || null;
  }
} 