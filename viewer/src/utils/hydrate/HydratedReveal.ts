import type { IReveal, IEvent } from '../../types/interfaces';
import { assert } from './assert';
import type { RawReveal } from './types';
import { calculateNarrativeTimeframeSpecificity } from '../dateSpecificity';

/**
 * Class that implements IReveal interface
 */
export class HydratedReveal implements IReveal {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly playtimeTimestamp: number;
  readonly narrativeTimeframe: string;
  readonly narrativeTimeframeSpecificityLevel: number;
  readonly screenshotFilename: string | null;
  readonly apparentTimeline?: string;
  readonly event: IEvent;

  constructor(rawReveal: RawReveal, parentEvent: IEvent) {
    // Validate required fields
    assert(rawReveal.id !== undefined && rawReveal.id !== null && typeof rawReveal.id === 'string', 
      `Invalid reveal ID: ${rawReveal.id}. Must be a non-empty string.`);
    
    assert(typeof rawReveal.absolutePlayTime === 'number' && rawReveal.absolutePlayTime >= 0, 
      `Invalid reveal absolutePlayTime: ${rawReveal.absolutePlayTime}. Must be a non-negative number.`);
    
    assert(rawReveal.displayedTitle !== undefined && rawReveal.displayedTitle !== null && typeof rawReveal.displayedTitle === 'string', 
      `Invalid reveal displayedTitle: ${rawReveal.displayedTitle}. Must be a non-empty string.`);
    
    assert(rawReveal.displayedDescription !== undefined && rawReveal.displayedDescription !== null && typeof rawReveal.displayedDescription === 'string', 
      `Invalid reveal displayedDescription: ${rawReveal.displayedDescription}. Must be a non-empty string.`);
    
    assert(rawReveal.displayedDate !== undefined && rawReveal.displayedDate !== null && typeof rawReveal.displayedDate === 'string', 
      `Invalid reveal displayedDate: ${rawReveal.displayedDate}. Must be a non-empty string.`);
    
    // Validate optional fields
    assert(rawReveal.screenshotFilename === null || rawReveal.screenshotFilename === undefined || typeof rawReveal.screenshotFilename === 'string', 
      `Invalid reveal screenshotFilename: ${rawReveal.screenshotFilename}. Must be null, undefined, or a string.`);
    
    assert(rawReveal.apparentTimelineId === null || rawReveal.apparentTimelineId === undefined || typeof rawReveal.apparentTimelineId === 'string', 
      `Invalid reveal apparentTimelineId: ${rawReveal.apparentTimelineId}. Must be null, undefined, or a string.`);
    
    // Validate event reference
    assert(parentEvent && typeof parentEvent.id === 'string', 
      `Invalid event reference for reveal ${rawReveal.id}. Event must be a valid IEvent object.`);

    // Set properties
    this.id = rawReveal.id;
    this.title = rawReveal.displayedTitle;
    this.description = rawReveal.displayedDescription;
    this.playtimeTimestamp = rawReveal.absolutePlayTime;
    this.narrativeTimeframe = rawReveal.displayedDate;
    this.screenshotFilename = rawReveal.screenshotFilename || null;
    this.apparentTimeline = rawReveal.apparentTimelineId;
    this.event = parentEvent;
    
    // Calculate narrative timeframe specificity level
    this.narrativeTimeframeSpecificityLevel = calculateNarrativeTimeframeSpecificity(rawReveal.displayedDate);
    
    // Alert if date format is unrecognized (specificity level -1)
    if (this.narrativeTimeframeSpecificityLevel === -1) {
      alert(`Unrecognized date format in event ${parentEvent.id}, reveal ${rawReveal.id}: "${rawReveal.displayedDate}"`);
    }
  }
} 