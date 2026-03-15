import type { ISubSegment, IEventGroup, ISegment, IEvent } from '../../types/interfaces';
import { NarrativeStatus } from '../../types/timeline';
import { assert } from './assert';
import { HydratedEventGroup } from './HydratedEventGroup';
import type { RawSubSegment, RawSoundtrack } from './types';
import type { NarrativeTransition } from './narrativeTransitions';

/**
 * Class that implements ISubSegment interface
 */
export class HydratedSubSegment implements ISubSegment {
  readonly id: string;
  readonly name: string;
  readonly start: Date;
  readonly end: Date;
  readonly eventGroups: readonly IEventGroup[];
  readonly fractionOfSegment: number;
  readonly position: number;
  readonly segment: ISegment;

  constructor(rawSubSegment: RawSubSegment, segment: ISegment, narrativeTransitions?: readonly NarrativeTransition[], soundtracks?: readonly RawSoundtrack[]) {
    // Validate required fields
    assert(Boolean(rawSubSegment.id && rawSubSegment.id.length > 0), 
      `Invalid subsegment ID: ${rawSubSegment.id}. Must be a non-empty string.`);
    
    assert(rawSubSegment.start && rawSubSegment.start instanceof Date, 
      `Invalid subsegment start: ${rawSubSegment.start}. Must be a valid Date.`);
    
    assert(rawSubSegment.end && rawSubSegment.end instanceof Date, 
      `Invalid subsegment end: ${rawSubSegment.end}. Must be a valid Date.`);
    
    assert(rawSubSegment.start < rawSubSegment.end, 
      `Invalid subsegment date range: start (${rawSubSegment.start}) must be before end (${rawSubSegment.end}).`);
    
    assert(typeof rawSubSegment.fractionOfSegment === 'number' && rawSubSegment.fractionOfSegment >= 0 && rawSubSegment.fractionOfSegment <= 1, 
      `Invalid subsegment fractionOfSegment: ${rawSubSegment.fractionOfSegment}. Must be between 0 and 1.`);
    
    // Validate raw event groups array
    assert(Array.isArray(rawSubSegment.eventGroups), 
      `Invalid subsegment raw event groups: ${rawSubSegment.eventGroups}. Must be an array.`);
    
    // Validate segment reference
    assert(segment && typeof segment.id === 'string', 
      `Invalid segment reference for subsegment ${rawSubSegment.id}. Segment must be a valid ISegment object.`);

    // Set properties
    this.id = rawSubSegment.id;
    this.name = `${rawSubSegment.id} subsegment`; // Simplified name
    this.start = rawSubSegment.start;
    this.end = rawSubSegment.end;
    this.fractionOfSegment = rawSubSegment.fractionOfSegment;
    this.position = 0; // Simplified - would need to calculate relative position within segment
    this.segment = segment;
    
    // Create hydrated event groups
    const hydratedEventGroups = rawSubSegment.eventGroups.map(rawEventGroup =>
      new HydratedEventGroup(rawEventGroup, this, narrativeTransitions, soundtracks) // Pass subsegment reference, narrative transitions, and soundtracks
    );
    
    this.eventGroups = hydratedEventGroups;
  }

  getNarrativeState(playbackTime: number): NarrativeStatus {
    // A subsegment's narrative state is determined by its event groups
    // If any event group is canonical, the subsegment is canonical
    // If all event groups are erased, the subsegment is erased
    // If all event groups are not reached, the subsegment is not reached
    
    if (this.eventGroups.length === 0) {
      return NarrativeStatus.NOT_REACHED; // Empty subsegments are not reached
    }
    
    const groupStates = this.eventGroups.map(group => group.getNarrativeState(playbackTime));
    
    // If any group is canonical, the subsegment is canonical
    if (groupStates.includes(NarrativeStatus.CANONICAL)) {
      return NarrativeStatus.CANONICAL;
    }
    
    // If any group is erased, the subsegment is erased
    if (groupStates.includes(NarrativeStatus.ERASED)) {
      return NarrativeStatus.ERASED;
    }
    
    // Otherwise, all groups are not reached
    return NarrativeStatus.NOT_REACHED;
  }

  get events(): readonly IEvent[] {
    return this.eventGroups.flatMap(eventGroup => eventGroup.events);
  }
}
