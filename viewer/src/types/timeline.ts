/**
 * Valid event types
 */
export enum EventType {
  REGULAR = 'regular',
  TIMESLIP = 'timeslip',
  TIMESLIP_OUT = 'timeslip-out',
  TIMESLIP_IN = 'timeslip-in'
}

/**
 * Valid narrative status values
 */
export enum NarrativeStatus {
  CANONICAL = 'canonical',
  ERASED = 'erased',
  NOT_REACHED = 'not-reached'
}

export interface Episode {
  id: string;
  number: number;
  title: string;
  duration: number; // Total runtime in seconds
}

export interface Note {
  id: string;
  title: string;
  contextEventId?: string;
  body: string;
} 