import type { IEventGroup, IEvent, ISubSegment } from '../../types/interfaces';
import { NarrativeStatus } from '../../types/timeline';
import { assert } from './assert';
import { HydratedEvent } from './HydratedEvent';
import type { RawEventGroup, RawSoundtrack } from './types';
import type { NarrativeTransition } from './narrativeTransitions';

type ReadonlyNonEmptyArray<T> = readonly [T, ...T[]];

/**
 * Class that implements IEventGroup interface
 */
export class HydratedEventGroup implements IEventGroup {
  readonly id: string;
  readonly events: ReadonlyNonEmptyArray<IEvent>;
  readonly primaryEvent: IEvent;
  readonly subSegment: ISubSegment;

  constructor(rawEventGroup: RawEventGroup, subSegment: ISubSegment, narrativeTransitions?: readonly NarrativeTransition[], soundtracks?: readonly RawSoundtrack[]) {
    // Validate required fields
    assert(Boolean(rawEventGroup.timelineId && rawEventGroup.timelineId.length > 0), 
      `Invalid event group timelineId: ${rawEventGroup.timelineId}. Must be a non-empty string.`);
    
    assert(Boolean(rawEventGroup.date && rawEventGroup.date.length > 0), 
      `Invalid event group date: ${rawEventGroup.date}. Must be a non-empty string.`);
    
    // Validate events array
    assert(Array.isArray(rawEventGroup.events) && rawEventGroup.events.length > 0, 
      `Invalid event group events: ${rawEventGroup.events}. Must be a non-empty array.`);
    
    // Validate subsegment reference
    assert(subSegment && typeof subSegment.id === 'string', 
      `Invalid subsegment reference for event group ${rawEventGroup.timelineId}-${rawEventGroup.date}. Subsegment must be a valid ISubSegment object.`);

    // Set properties
    this.id = `${rawEventGroup.timelineId}-${rawEventGroup.date}`;
    this.subSegment = subSegment;
    
    // Create hydrated events
    const hydratedEvents = rawEventGroup.events.map(rawEvent =>
      new HydratedEvent(rawEvent, this, narrativeTransitions, soundtracks) // Pass event group reference, narrative transitions, and soundtracks
    );
    
    this.events = hydratedEvents as unknown as ReadonlyNonEmptyArray<IEvent>;
    this.primaryEvent = hydratedEvents[0]; // Default to first event, will be calculated during layout
  }

  getNarrativeState(playbackTime: number): NarrativeStatus {
    // An event group's narrative state is determined by its events
    // If any event is canonical, the group is canonical
    // If all events are erased, the group is erased
    // If all events are not reached, the group is not reached
    
    const eventStates = this.events.map(event => event.getNarrativeState(playbackTime));
    
    // If any event is canonical, the group is canonical
    if (eventStates.includes(NarrativeStatus.CANONICAL)) {
      return NarrativeStatus.CANONICAL;
    }
    
    // If any event is erased, the group is erased
    if (eventStates.includes(NarrativeStatus.ERASED)) {
      return NarrativeStatus.ERASED;
    }
    
    // Otherwise, all events are not reached
    return NarrativeStatus.NOT_REACHED;
  }

  getNarrativeTimeframe(playbackTime: number): string {
    // TODO: Implement narrative timeframe calculation from primary event
    return this.primaryEvent.getNarrativeTimeframe(playbackTime);
  }

  getTotalEvents(playbackTime: number): number {
    // TODO: Implement total events calculation based on revealed events
    return this.events.length;
  }
} 