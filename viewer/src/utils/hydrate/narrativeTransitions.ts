import type { RawEvent, RawTimeline } from './types';

/**
 * Represents a timeslip-out event paired with its corresponding timeslip-in event
 */
interface TimeslipPair {
  timeslipOut: RawEvent;
  timeslipIn: RawEvent;
  timeslipOutPlaytime: number;
  timeslipInPlaytime: number;
}

/**
 * Represents a narrative transition that affects multiple timelines
 */
export interface NarrativeTransition {
  playtime: number; // The playtime when this transition occurs
  affectedTimelines: string[]; // List of timeline IDs that are affected
  narrativeDate: string; // The narrative date that causes the transition
}

/**
 * Calculate narrative transitions based on timeslip-out/timeslip-in pairs
 * 
 * Algorithm:
 * 1. Group connected jump-out-jump-in together
 * 2. Iterate over jump-out-jump-in pairs
 * 3. If pairs are on the same timeline, skip and continue loop
 * 4. Note the narrative date on the jump-in event
 * 5. For all timelines previous to the current timeline:
 *    - All canon events after that narrative date become erased
 *    - All not-yet reached events after that narrative date transition directly to erased on reveal
 */
export function calculateNarrativeTransitions(
  timelines: RawTimeline[],
  events: RawEvent[]
): NarrativeTransition[] {
  // Step 1: Find all timeslip-out and timeslip-in events
  const timeslipOutEvents = events.filter(e => e.eventType === 'timeslip-out');
  const timeslipInEvents = events.filter(e => e.eventType === 'timeslip-in');
  
  // Step 2: Group connected jump-out-jump-in together
  const timeslipPairs = findTimeslipPairs(timeslipOutEvents, timeslipInEvents);
  
  // Step 3: Generate narrative transitions from pairs
  const transitions: NarrativeTransition[] = [];
  
  for (const pair of timeslipPairs) {
    // Skip if both events are on the same timeline
    if (pair.timeslipOut.timelineId === pair.timeslipIn.timelineId) {
      continue;
    }
    
    // Find the timeline indices
    const outTimelineIndex = timelines.findIndex(t => t.id === pair.timeslipOut.timelineId);
    const inTimelineIndex = timelines.findIndex(t => t.id === pair.timeslipIn.timelineId);
    
    if (outTimelineIndex === -1 || inTimelineIndex === -1) {
      console.warn(`Could not find timeline for timeslip pair: out=${pair.timeslipOut.timelineId}, in=${pair.timeslipIn.timelineId}`);
      continue;
    }
    
    // Get the narrative date from the timeslip-in event
    const narrativeDate = pair.timeslipIn.narrativeDate;
    
    // Find all timelines that come before the timeslip-in timeline
    const affectedTimelines: string[] = [];
    for (let i = 0; i < inTimelineIndex; i++) {
      affectedTimelines.push(timelines[i].id);
    }
    
    if (affectedTimelines.length > 0) {
      transitions.push({
        playtime: pair.timeslipInPlaytime,
        affectedTimelines,
        narrativeDate
      });
    }
  }
  
  // Sort transitions by playtime
  transitions.sort((a, b) => a.playtime - b.playtime);
  
  return transitions;
}

/**
 * Find pairs of timeslip-out and timeslip-in events
 * 
 * This is a simplified implementation that assumes:
 * - Timeslip-out events happen before timeslip-in events
 * - They are paired in chronological order
 * - Each timeslip-out has a corresponding timeslip-in
 */
function findTimeslipPairs(
  timeslipOutEvents: RawEvent[],
  timeslipInEvents: RawEvent[]
): TimeslipPair[] {
  const pairs: TimeslipPair[] = [];
  
  // Sort events by their first reveal time
  const sortedOutEvents = [...timeslipOutEvents].sort((a, b) => 
    Math.min(...a.reveals.map(r => r.absolutePlayTime)) - Math.min(...b.reveals.map(r => r.absolutePlayTime))
  );
  
  const sortedInEvents = [...timeslipInEvents].sort((a, b) => 
    Math.min(...a.reveals.map(r => r.absolutePlayTime)) - Math.min(...b.reveals.map(r => r.absolutePlayTime))
  );
  
  // Simple pairing: assume they come in order
  // In a real implementation, you might need more sophisticated pairing logic
  const minLength = Math.min(sortedOutEvents.length, sortedInEvents.length);
  
  for (let i = 0; i < minLength; i++) {
    const timeslipOut = sortedOutEvents[i];
    const timeslipIn = sortedInEvents[i];
    
    const timeslipOutPlaytime = Math.min(...timeslipOut.reveals.map(r => r.absolutePlayTime));
    const timeslipInPlaytime = Math.min(...timeslipIn.reveals.map(r => r.absolutePlayTime));
    
    pairs.push({
      timeslipOut,
      timeslipIn,
      timeslipOutPlaytime,
      timeslipInPlaytime
    });
  }
  
  return pairs;
} 