import type { ITimeline, IEvent, IEventGroup, ISegment, ISubSegment, NarrativeDate } from '../../types/interfaces';
import { assert } from './assert';
import { generateSegmentDefinitions, type SegmentDefinition } from './segmentation';
import { createSubSegmentsWithinSegments } from './subSegmentation';
import { groupEventsInSubSegments } from './eventGrouping';
import { calculateNarrativeTransitions, type NarrativeTransition } from './narrativeTransitions';
import type { RawTimeline, RawEvent, RawEpisode, RawSoundtrack, RawSegment } from './types';
import { HydratedTimeline } from './HydratedTimeline';
import { HydratedSegment } from './HydratedSegment';
import { HydratedSubSegment } from './HydratedSubSegment';
import { HydratedEventGroup } from './HydratedEventGroup';
import { HydratedEvent } from './HydratedEvent';
import { HydratedReveal } from './HydratedReveal';


/**
 * Main hydration function that takes raw data and returns ITimeline objects
 * 
 * The data structure has:
 * - timelines: top-level containers
 * - slices: belong to timelines and define time ranges  
 * - events: reference timelines via timelineId and have their own narrativeDate
 * - segments: derived from grouping events that fall within the same slice
 */
export function hydrate(rawData: any): ITimeline[] {
  // Step 1: Parse and validate raw data structure
  const { timelines, events, episodes, soundtracks } = parseRawData(rawData);
  
  // Step 1.5: Calculate narrative transitions before creating hydrated objects
  const narrativeTransitions = calculateNarrativeTransitions(timelines, events);
  
  // Step 2: Generate global segment definitions
  const segmentDefinitions = generateSegmentDefinitions(timelines, events);

  // Step 3: Create segments and add them to timelines
  createSegmentsForTimelines(timelines, segmentDefinitions);
  
  // Step 4: Create subsegments and add them to segments
  createSubSegmentsWithinSegments(timelines, events);
  
  // Step 5: Group events into event groups and add them to subsegments
  groupEventsInSubSegments(timelines);
  
  // Step 6: Create hydrated objects from the complete tree
  const hydratedTimelines = createHydratedTimelines(timelines, narrativeTransitions, soundtracks);
  
  return hydratedTimelines;
}

/**
 * Step 1: Parse and validate raw data structure
 */
function parseRawData(rawData: any): { timelines: RawTimeline[], events: RawEvent[], episodes: RawEpisode[], soundtracks: RawSoundtrack[] } {
  // Validate top-level structure
  assert(rawData && typeof rawData === 'object', 
    'Raw data must be a valid object');
  
  assert(Array.isArray(rawData.episodes), 
    'Raw data must contain an episodes array');
  
  assert(Array.isArray(rawData.timelines), 
    'Raw data must contain a timelines array');
  
  assert(Array.isArray(rawData.events), 
    'Raw data must contain an events array');
  
  assert(Array.isArray(rawData.soundtracks), 
    'Raw data must contain a soundtracks array');
  
  const episodes = rawData.episodes;
  const timelines = rawData.timelines;
  const events = rawData.events;
  const soundtracks = rawData.soundtracks;
  
  // Validate episode structure
  episodes.forEach((episode: any, index: number) => {
    assert(episode && typeof episode === 'object', 
      `Episode at index ${index} must be a valid object`);
    
    assert(episode.id && typeof episode.id === 'string', 
      `Episode at index ${index} must have a valid string id`);
    
    assert(typeof episode.episodeNumber === 'number' && Number.isInteger(episode.episodeNumber), 
      `Episode at index ${index} must have a valid integer episodeNumber`);
    
    assert(episode.title && typeof episode.title === 'string', 
      `Episode at index ${index} must have a valid string title`);
    
    assert(typeof episode.duration === 'number' && Number.isInteger(episode.duration) && episode.duration > 0, 
      `Episode at index ${index} must have a valid positive integer duration`);
  });
  
  // Validate timeline structure
  timelines.forEach((timeline: any, index: number) => {
    assert(timeline && typeof timeline === 'object', 
      `Timeline at index ${index} must be a valid object`);
    
    assert(timeline.id && typeof timeline.id === 'string', 
      `Timeline at index ${index} must have a valid string id`);
    
    assert(timeline.name && typeof timeline.name === 'string', 
      `Timeline at index ${index} must have a valid string name`);
    
    assert(Array.isArray(timeline.slices), 
      `Timeline ${timeline.id} must have a slices array`);
    
    // Validate slices within timeline
    timeline.slices.forEach((slice: any, sliceIndex: number) => {
      assert(slice && typeof slice === 'object', 
        `Slice at index ${sliceIndex} in timeline ${timeline.id} must be a valid object`);
      
      assert(slice.id && typeof slice.id === 'string', 
        `Slice at index ${sliceIndex} in timeline ${timeline.id} must have a valid string id`);
      
      assert(slice.timelineId && typeof slice.timelineId === 'string', 
        `Slice at index ${sliceIndex} in timeline ${timeline.id} must have a valid timelineId`);
      
      assert(slice.timelineId === timeline.id, 
        `Slice ${slice.id} timelineId (${slice.timelineId}) must match parent timeline id (${timeline.id})`);
      
      assert(slice.shortDescription && typeof slice.shortDescription === 'string', 
        `Slice at index ${sliceIndex} in timeline ${timeline.id} must have a valid shortDescription`);
      
      // This corresponds to narrative time, not absolute play time     
      assert(slice.startTimestamp && typeof slice.startTimestamp === 'string', 
        `Slice at index ${sliceIndex} in timeline ${timeline.id} must have a valid startTimestamp`);
      
      // This corresponds to narrative time, not absolute play time     
      assert(slice.endTimestamp && typeof slice.endTimestamp === 'string', 
        `Slice at index ${sliceIndex} in timeline ${timeline.id} must have a valid endTimestamp`);
      
      // Validate timestamp format and convert to NarrativeDate
      const startDate: NarrativeDate = new Date(slice.startTimestamp);
      const endDate: NarrativeDate = new Date(slice.endTimestamp);
      assert(!isNaN(startDate.getTime()), 
        `Slice ${slice.id} startTimestamp must be a valid date string`);
      assert(!isNaN(endDate.getTime()), 
        `Slice ${slice.id} endTimestamp must be a valid date string`);
      assert(startDate < endDate, 
        `Slice ${slice.id} startTimestamp must be before endTimestamp`);
      
      // Validate importance if present
      if (slice.importance !== undefined && slice.importance !== null) {
        assert(['low', 'high'].includes(slice.importance), 
          `Slice ${slice.id} importance must be 'low', 'high', or null`);
      }
    });
  });
  
  // Validate event structure
  events.forEach((event: any, index: number) => {
    assert(event && typeof event === 'object', 
      `Event at index ${index} must be a valid object`);
    
    assert(event.id && typeof event.id === 'string', 
      `Event at index ${index} must have a valid string id`);
    
    assert(event.timelineId && typeof event.timelineId === 'string', 
      `Event at index ${index} must have a valid timelineId`);
    
    // Validate that timelineId references an existing timeline
    const referencedTimeline = timelines.find((t: any) => t.id === event.timelineId);
    assert(referencedTimeline, 
      `Event ${event.id} references non-existent timeline ${event.timelineId}`);
    
    assert(event.shortDescription && typeof event.shortDescription === 'string', 
      `Event at index ${index} must have a valid shortDescription`);
    
    assert(event.narrativeDate && typeof event.narrativeDate === 'string', 
      `Event at index ${index} must have a valid narrativeDate`);
    
    // Validate narrativeDate format
    const eventDate: NarrativeDate = new Date(event.narrativeDate);
    assert(!isNaN(eventDate.getTime()), 
      `Event ${event.id} narrativeDate must be a valid date string`);
    
    // Validate tags array
    assert(Array.isArray(event.tags), 
      `Event ${event.id} must have a tags array`);
    
    // Validate reveals array
    assert(Array.isArray(event.reveals), 
      `Event ${event.id} must have a reveals array`);
    
    // Validate eventType if present
    if (event.eventType !== undefined && event.eventType !== null) {
      assert(typeof event.eventType === 'string', 
        `Event ${event.id} eventType must be a string if present`);
      
      // Trim whitespace and validate against valid EventType values
      const trimmedEventType = event.eventType.trim();
      if (trimmedEventType.length > 0) {
        const validEventTypes = ['timeslip', 'timeslip-out', 'timeslip-in'];
        assert(validEventTypes.includes(trimmedEventType), 
          `Event ${event.id} eventType "${trimmedEventType}" must be one of: ${validEventTypes.join(', ')}`);
        
        // Update the event with the trimmed value
        event.eventType = trimmedEventType;
      } else {
        // Remove empty/whitespace-only eventType
        delete event.eventType;
      }
    }
    
    // Validate reveals within event
    event.reveals.forEach((reveal: any, revealIndex: number) => {
      assert(reveal && typeof reveal === 'object', 
        `Reveal at index ${revealIndex} in event ${event.id} must be a valid object`);
      
      assert(reveal.id && typeof reveal.id === 'string', 
        `Reveal at index ${revealIndex} in event ${event.id} must have a valid string id`);
      
      assert(reveal.episodeId && typeof reveal.episodeId === 'string', 
        `Reveal at index ${revealIndex} in event ${event.id} must have a valid string episodeId`);
      
      assert(typeof reveal.episodeTime === 'number' && Number.isInteger(reveal.episodeTime) && reveal.episodeTime >= 0, 
        `Reveal at index ${revealIndex} in event ${event.id} must have a valid non-negative integer episodeTime`);
      
      // Display properties are optional - they can be inherited from previous reveals
      // Only validate if they are present
      if (reveal.displayedTitle !== undefined && reveal.displayedTitle !== null) {
        assert(typeof reveal.displayedTitle === 'string', 
          `Reveal at index ${revealIndex} in event ${event.id} displayedTitle must be a string if present`);
      }
      
      if (reveal.displayedDescription !== undefined && reveal.displayedDescription !== null) {
        assert(typeof reveal.displayedDescription === 'string', 
          `Reveal at index ${revealIndex} in event ${event.id} displayedDescription must be a string if present`);
      }
      
      if (reveal.displayedDate !== undefined && reveal.displayedDate !== null) {
        assert(typeof reveal.displayedDate === 'string', 
          `Reveal at index ${revealIndex} in event ${event.id} displayedDate must be a string if present`);
      }
      
      // apparentTimelineId is optional - defaults to event's timeline
      if (reveal.apparentTimelineId !== undefined && reveal.apparentTimelineId !== null) {
        assert(typeof reveal.apparentTimelineId === 'string', 
          `Reveal at index ${revealIndex} in event ${event.id} apparentTimelineId must be a string if present`);
        
        // Validate that apparentTimelineId references an existing timeline
        const referencedTimeline = timelines.find((t: any) => t.id === reveal.apparentTimelineId);
        assert(referencedTimeline, 
          `Reveal ${reveal.id} apparentTimelineId (${reveal.apparentTimelineId}) references non-existent timeline`);
      }
    });
  });
  
  
  // Validate soundtrack structure
  soundtracks.forEach((soundtrack: any, index: number) => {
    assert(soundtrack && typeof soundtrack === 'object', 
      `Soundtrack at index ${index} must be a valid object`);
    
    assert(typeof soundtrack.id === 'string' && soundtrack.id.length > 0,
      `Soundtrack at index ${index} must have a valid string id`);
    
    assert(typeof soundtrack.title === 'string' && soundtrack.title.length > 0,
      `Soundtrack at index ${index} must have a valid string title`);
    
    assert(typeof soundtrack.mediaUrl === 'string' && soundtrack.mediaUrl.length > 0,
      `Soundtrack at index ${index} must have a valid string mediaUrl`);
  });

  // Cast the validated data to the typed interfaces
  return { 
    timelines: timelines as RawTimeline[], 
    events: events as RawEvent[], 
    episodes: episodes as RawEpisode[],
    soundtracks: soundtracks as RawSoundtrack[]
  };
}

/**
 * Step 3: Create segments and add them to timelines
 */
function createSegmentsForTimelines(
  timelines: RawTimeline[],
  segmentDefinitions: SegmentDefinition[]
): void {
  // Calculate global timeline bounds from segment definitions
  const globalStart = new Date(Math.min(...segmentDefinitions.map(def => def.start.getTime())));
  const globalEnd = new Date(Math.max(...segmentDefinitions.map(def => def.end.getTime())));
  const globalDuration = globalEnd.getTime() - globalStart.getTime();
  
  timelines.forEach((timeline: RawTimeline) => {
    
    const segments: RawSegment[] = [];
    
    // For each global segment definition, create a corresponding segment for this timeline
    segmentDefinitions.forEach((segmentDef, index) => {
      // Calculate fraction of timeline based on segment duration relative to global timeline
      const segmentDuration = segmentDef.end.getTime() - segmentDef.start.getTime();
      const scale = globalDuration > 0 ? segmentDuration / globalDuration : 1.0 / segmentDefinitions.length;
      
      // Create a segment that corresponds to this global segment definition
      const segment: RawSegment = {
        id: `${timeline.id}-segment-${index}`,
        name: segmentDef.label,
        start: segmentDef.start,
        end: segmentDef.end,
        scale: scale,
        timelineId: timeline.id,
        // These will be populated in later steps
        subSegments: [],
        narrativeStatus: 'canonical', // Default status
        fractionOfTimeline: segmentDef.fractionOfTimeline
      };
      
      segments.push(segment);
    });
    
    // Add segments to the timeline
    timeline.segments = segments;
  });
}

/**
 * Step 6: Create hydrated timeline objects from the complete tree
 */
function createHydratedTimelines(
  rawTimelines: RawTimeline[],
  narrativeTransitions: NarrativeTransition[],
  soundtracks: RawSoundtrack[]
): ITimeline[] {
  const hydratedTimelines: ITimeline[] = [];
  
  for (const rawTimeline of rawTimelines) {
    // Create hydrated timeline (which will create hydrated segments, which will create hydrated subsegments, etc.)
    const hydratedTimeline = new HydratedTimeline(rawTimeline, narrativeTransitions, soundtracks);
    
    hydratedTimelines.push(hydratedTimeline);
  }
  
  // Collect all events from all timelines
  const allEvents = hydratedTimelines.flatMap(timeline => (timeline as any).events);
  
  // Populate correlations for all events
  HydratedEvent.populateCorrelations(allEvents);
  
  return hydratedTimelines;
}

export { assert } from './assert';
export { generateSegmentDefinitions, type SegmentDefinition } from './segmentation'; 