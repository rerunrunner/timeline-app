import type { ISegment, ISubSegment, ITimeline } from '../../types/interfaces';
import { NarrativeStatus } from '../../types/timeline';
import { assert } from './assert';
import { HydratedSubSegment } from './HydratedSubSegment';
import type { RawSegment, RawSoundtrack } from './types';
import type { NarrativeTransition } from './narrativeTransitions';

type ReadonlyNonEmptyArray<T> = readonly [T, ...T[]];

/**
 * Class that implements ISegment interface
 */
export class HydratedSegment implements ISegment {
  readonly id: string;
  readonly name: string;
  readonly start: Date;
  readonly end: Date;
  readonly subSegments: ReadonlyNonEmptyArray<ISubSegment>;
  readonly fractionOfTimeline: number;
  readonly scale: number;
  readonly timeline: ITimeline;
  readonly isFirst: boolean;
  readonly isLast: boolean;

  constructor(rawSegment: RawSegment, timeline: ITimeline, segmentIndex: number, totalSegments: number, narrativeTransitions?: readonly NarrativeTransition[], soundtracks?: readonly RawSoundtrack[]) {
    // Validate required fields
    assert(Boolean(rawSegment.id && rawSegment.id.length > 0), 
      `Invalid segment ID: ${rawSegment.id}. Must be a non-empty string.`);
    
    assert(Boolean(rawSegment.name && rawSegment.name.length > 0), 
      `Invalid segment name: ${rawSegment.name}. Must be a non-empty string.`);
    
    assert(rawSegment.start && rawSegment.start instanceof Date, 
      `Invalid segment start: ${rawSegment.start}. Must be a valid Date.`);
    
    assert(rawSegment.end && rawSegment.end instanceof Date, 
      `Invalid segment end: ${rawSegment.end}. Must be a valid Date.`);
    
    assert(rawSegment.start < rawSegment.end, 
      `Invalid segment date range: start (${rawSegment.start}) must be before end (${rawSegment.end}).`);
    
    assert(typeof rawSegment.scale === 'number' && rawSegment.scale > 0, 
      `Invalid segment scale: ${rawSegment.scale}. Must be a positive number.`);
    
    // Validate raw subsegments array
    assert(Array.isArray(rawSegment.subSegments), 
      `Invalid segment raw subsegments: ${rawSegment.subSegments}. Must be an array.`);
    
    // Validate timeline reference
    assert(timeline && typeof timeline.id === 'string', 
      `Invalid timeline reference for segment ${rawSegment.id}. Timeline must be a valid ITimeline object.`);

    // Set properties
    this.id = rawSegment.id;
    this.name = rawSegment.name;
    this.start = rawSegment.start;
    this.end = rawSegment.end;
    this.scale = rawSegment.scale;
    this.timeline = timeline;
    this.fractionOfTimeline = rawSegment.fractionOfTimeline;
    this.isFirst = segmentIndex === 0;
    this.isLast = segmentIndex === totalSegments - 1;
    
    // Create hydrated subsegments
    const hydratedSubSegments = rawSegment.subSegments.map(rawSubSegment =>
      new HydratedSubSegment(rawSubSegment, this, narrativeTransitions, soundtracks) // Pass segment reference, narrative transitions, and soundtracks
    );
    
    this.subSegments = hydratedSubSegments as unknown as ReadonlyNonEmptyArray<ISubSegment>;
  }

  getNarrativeState(playbackTime: number): NarrativeStatus {
    // A segment's narrative state is determined by its subsegments
    // If any subsegment is canonical, the segment is canonical
    // If all subsegments are erased, the segment is erased
    // If all subsegments are not reached, the segment is not reached
    
    const subSegmentStates = this.subSegments.map(subSegment => subSegment.getNarrativeState(playbackTime));
    
    // If any subsegment is canonical, the segment is canonical
    if (subSegmentStates.includes(NarrativeStatus.CANONICAL)) {
      return NarrativeStatus.CANONICAL;
    }
    
    // If any subsegment is erased, the segment is erased
    if (subSegmentStates.includes(NarrativeStatus.ERASED)) {
      return NarrativeStatus.ERASED;
    }
    
    // Otherwise, all subsegments are not reached
    return NarrativeStatus.NOT_REACHED;
  }

  // TODO: IMPROVE THIS
  getApparentTimeline(playbackTime: number, canonicalTimelineId: string): string {
    // Find the most recent visible reveal across all events in this segment
    let mostRecentReveal: any = null;
    let mostRecentTime = -1;

    // Iterate through all subsegments and their events
    for (const subSegment of this.subSegments) {
      for (const eventGroup of subSegment.eventGroups) {
        for (const event of eventGroup.events) {
          // Find the most recent reveal that has been reached
          const visibleReveal = event.reveals
            .filter(reveal => reveal.playtimeTimestamp <= playbackTime)
            .sort((a, b) => b.playtimeTimestamp - a.playtimeTimestamp)[0];
          
          if (visibleReveal && visibleReveal.playtimeTimestamp > mostRecentTime) {
            mostRecentReveal = visibleReveal;
            mostRecentTime = visibleReveal.playtimeTimestamp;
          }
        }
      }
    }

    // Return the apparent timeline from the most recent reveal, or fall back to canonical
    return mostRecentReveal?.apparentTimeline || canonicalTimelineId;
  }
} 