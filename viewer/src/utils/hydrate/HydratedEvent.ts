import type { IEvent, IReveal, IEventGroup, ISoundtrack } from '../../types/interfaces';
import { NarrativeStatus, EventType } from '../../types/timeline';
import { assert } from './assert';
import { HydratedReveal } from './HydratedReveal';
import type { RawEvent, RawSoundtrack } from './types';
import type { NarrativeTransition } from './narrativeTransitions';

type ReadonlyNonEmptyArray<T> = readonly [T, ...T[]];

/**
 * Class that implements IEvent interface
 */
export class HydratedEvent implements IEvent {
  readonly id: string;
  readonly narrativeTimestamp: Date;
  readonly tags: readonly string[];
  readonly eventType?: EventType;
  readonly reveals: ReadonlyNonEmptyArray<IReveal>;
  readonly eventGroup: IEventGroup;
  readonly narrativeTransitions: readonly [number, NarrativeStatus][];
  readonly correlatedEvents: readonly IEvent[];
  readonly soundtrack?: ISoundtrack;

  constructor(rawEvent: RawEvent, eventGroup: IEventGroup, narrativeTransitions?: readonly NarrativeTransition[], soundtracks?: readonly RawSoundtrack[]) {
    // Validate required fields
    assert(Boolean(rawEvent.id) && typeof rawEvent.id === 'string', 
      `Invalid event ID: ${rawEvent.id}. Must be a non-empty string.`);
    
    assert(Boolean(rawEvent.timelineId) && typeof rawEvent.timelineId === 'string', 
      `Invalid event timelineId: ${rawEvent.timelineId}. Must be a non-empty string.`);
    
    assert(Boolean(rawEvent.shortDescription) && typeof rawEvent.shortDescription === 'string', 
      `Invalid event shortDescription: ${rawEvent.shortDescription}. Must be a non-empty string.`);
    
    assert(Boolean(rawEvent.narrativeDate) && typeof rawEvent.narrativeDate === 'string', 
      `Invalid event narrativeDate: ${rawEvent.narrativeDate}. Must be a non-empty string.`);
    
    // Validate narrativeDate is a valid date
    const narrativeTimestamp = new Date(rawEvent.narrativeDate);
    assert(!isNaN(narrativeTimestamp.getTime()), 
      `Invalid event narrativeDate: ${rawEvent.narrativeDate}. Must be a valid date string.`);
    
    // Validate tags array
    assert(Array.isArray(rawEvent.tags), 
      `Invalid event tags: ${rawEvent.tags}. Must be an array.`);
    
    assert(rawEvent.tags.every((tag: any) => typeof tag === 'string'), 
      `Invalid event tags: ${rawEvent.tags}. All tags must be strings.`);
    
    // Validate reveals array
    assert(Array.isArray(rawEvent.reveals) && rawEvent.reveals.length > 0, 
      `Invalid event reveals: ${rawEvent.reveals}. Must be a non-empty array.`);
    
    // Validate eventType if present
    if (rawEvent.eventType !== undefined && rawEvent.eventType !== null) {
      assert(Object.values(EventType).includes(rawEvent.eventType as EventType), 
        `Invalid event eventType: ${rawEvent.eventType}. Must be a valid EventType value.`);
    }
    
    // Validate eventGroup reference
    assert(eventGroup && typeof eventGroup.id === 'string', 
      `Invalid eventGroup reference for event ${rawEvent.id}. EventGroup must be a valid IEventGroup object.`);

    // Set properties
    this.id = rawEvent.id;
    this.narrativeTimestamp = narrativeTimestamp;
    this.tags = rawEvent.tags;
    this.eventType = rawEvent.eventType as EventType | undefined;
    this.eventGroup = eventGroup;

    // Sort reveals by playtime and resolve inheritance
    const sortedReveals = [...rawEvent.reveals].sort((a: any, b: any) => a.absolutePlayTime - b.absolutePlayTime);
    
    // Initialize with first reveal's values, then update as we process each reveal
    let currentTitle = sortedReveals[0].displayedTitle || rawEvent.shortDescription;
    let currentDescription = sortedReveals[0].displayedDescription || '';
    let currentDate = sortedReveals[0].displayedDate || (rawEvent.narrativeDate ? new Date(rawEvent.narrativeDate).toLocaleDateString() : '');
    let currentScreenshotFilename = sortedReveals[0].screenshotFilename || null;
    
    // Process each reveal and update values
    const resolvedReveals = sortedReveals.map((reveal: any) => {
      // Update current values if this reveal has non-null values
      if (reveal.displayedTitle !== null) {
        currentTitle = reveal.displayedTitle;
      }
      if (reveal.displayedDescription !== null) {
        currentDescription = reveal.displayedDescription;
      }
      if (reveal.displayedDate !== null) {
        currentDate = reveal.displayedDate;
      }
      if (reveal.screenshotFilename !== null) {
        currentScreenshotFilename = reveal.screenshotFilename;
      }
      
      // Return reveal with current values
      return {
        ...reveal,
        displayedTitle: currentTitle,
        displayedDescription: currentDescription,
        displayedDate: currentDate,
        screenshotFilename: currentScreenshotFilename
      };
    });
    
    // Create reveals with 'this' as the event reference
    const reveals = resolvedReveals.map((reveal: any) => new HydratedReveal(reveal, this));
    // We know reveals is non-empty because we validated it above
    this.reveals = reveals as unknown as ReadonlyNonEmptyArray<IReveal>;
    
    // Calculate narrative transitions
    this.narrativeTransitions = this.calculateNarrativeTransitions(narrativeTransitions);
    
    // Resolve soundtrack if referenced
    let resolvedSoundtrack: ISoundtrack | undefined;
    if (rawEvent.soundtrackId && soundtracks) {
      const soundtrack = soundtracks.find(s => s.id === rawEvent.soundtrackId);
      if (soundtrack) {
        resolvedSoundtrack = {
          id: soundtrack.id,
          title: soundtrack.title,
          mediaUrl: soundtrack.mediaUrl
        };
      }
    }
    this.soundtrack = resolvedSoundtrack;
    
    // Calculate correlated events (timeslip pairs)
    this.correlatedEvents = [];
  }

  // Business logic methods
  getNarrativeState(playbackTime: number): NarrativeStatus {
    // Find the most recent transition that happened before or at the current time
    const currentTransition = this.narrativeTransitions
      .filter(([time]) => time <= playbackTime)
      .at(-1);
    
    return currentTransition?.[1] ?? NarrativeStatus.NOT_REACHED;
  }
  
  private calculateNarrativeTransitions(narrativeTransitions?: readonly NarrativeTransition[]): readonly [number, NarrativeStatus][] {
    const firstRevealTime = this.reveals[0].playtimeTimestamp;
    const transitions: [number, NarrativeStatus][] = [];
    
    // Start with NOT_REACHED
    transitions.push([0, NarrativeStatus.NOT_REACHED]);
    
    // Check if this event should be erased by any transitions that happen before or at the first reveal
    let shouldBeErasedAtReveal = false;
    if (narrativeTransitions) {
      const eventTimelineId = this.eventGroup.subSegment.segment.timeline.id;
      
      for (const transition of narrativeTransitions) {
        // Check if this event's timeline is affected by this transition
        if (transition.affectedTimelines.includes(eventTimelineId)) {
          // Check if this event happens after the narrative date that causes the transition
          const transitionDate = new Date(transition.narrativeDate);
          if (this.narrativeTimestamp > transitionDate) {
            if (transition.playtime <= firstRevealTime) {
              // Transition happens before or at first reveal, so event should be erased at reveal
              shouldBeErasedAtReveal = true;
            } else {
              // Transition happens after first reveal, so add it as a separate transition
              transitions.push([transition.playtime, NarrativeStatus.ERASED]);
            }
          }
        }
      }
    }
    
    // Add the appropriate transition at first reveal time
    if (shouldBeErasedAtReveal) {
      transitions.push([firstRevealTime, NarrativeStatus.ERASED]);
    } else {
      transitions.push([firstRevealTime, NarrativeStatus.CANONICAL]);
    }
    
    // Sort transitions by time
    transitions.sort((a, b) => a[0] - b[0]);
    
    return transitions as readonly [number, NarrativeStatus][];
  }
  
  getTitle(playbackTime: number): string {
    const visibleReveal = this.reveals
      .filter(reveal => reveal.playtimeTimestamp <= playbackTime)
      .at(-1);
    return visibleReveal?.title || `Event ${this.id}`;
  }
  
  getDescription(playbackTime: number): string {
    const visibleReveal = this.reveals
      .filter(reveal => reveal.playtimeTimestamp <= playbackTime)
      .at(-1);
    return visibleReveal?.description || '';
  }
  
  getNarrativeTimeframe(playbackTime: number): string {
    const visibleReveal = this.reveals
      .filter(reveal => reveal.playtimeTimestamp <= playbackTime)
      .at(-1);
    return visibleReveal?.narrativeTimeframe || '';
  }
  
  getScreenshotFilename(playbackTime: number): string | null {
    const visibleReveal = this.reveals
      .filter(reveal => reveal.playtimeTimestamp <= playbackTime)
      .at(-1);
    return visibleReveal?.screenshotFilename || null;
  }
  
  /**
   * Populate correlated events for all events in a collection
   * This should be called after all events have been created
   */
  static populateCorrelations(allEvents: readonly IEvent[]): void {
    // Group events by type
    const timeslipOutEvents = allEvents.filter(e => e.eventType === 'timeslip-out');
    const timeslipInEvents = allEvents.filter(e => e.eventType === 'timeslip-in');
    
    // Sort events by their first reveal time to maintain chronological order
    const sortedOutEvents = [...timeslipOutEvents].sort((a, b) => {
      const aTime = Math.min(...a.reveals.map(r => r.playtimeTimestamp));
      const bTime = Math.min(...b.reveals.map(r => r.playtimeTimestamp));
      return aTime - bTime;
    });
    
    const sortedInEvents = [...timeslipInEvents].sort((a, b) => {
      const aTime = Math.min(...a.reveals.map(r => r.playtimeTimestamp));
      const bTime = Math.min(...b.reveals.map(r => r.playtimeTimestamp));
      return aTime - bTime;
    });
    
    // Pair events chronologically across timelines
    // Each timeslip-out should pair with the next timeslip-in
    const pairCount = Math.min(sortedOutEvents.length, sortedInEvents.length);
    
    for (let i = 0; i < pairCount; i++) {
      const outEvent = sortedOutEvents[i];
      const inEvent = sortedInEvents[i];
      
      // Set correlations (we need to cast to HydratedEvent to access the property)
      (outEvent as any).correlatedEvents = [inEvent];
      (inEvent as any).correlatedEvents = [outEvent];
    }
  }
} 