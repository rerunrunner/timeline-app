/**
 * Segmentation logic for deriving segments from slices and events
 * Duplicated from src/utils/segmentation.ts for use in hydration process
 */

import type { NarrativeDate } from '../../types/interfaces';
import type { RawTimeline, RawEvent, RawTimelineSlice } from './types';

interface SegmentStats {
  start: Date;
  end: Date;
  eventCount: number;
  timelineCount: number;
  shortDescriptions: string[];
  days: number;
  hybridWeight: number;
  percent: number;
}

export interface SegmentDefinition {
  id: string;
  start: NarrativeDate;
  end: NarrativeDate;
  label: string;
  scale: number;
  fractionOfTimeline: number;
}

const SMALL_CONSTANT = 0.5;

/**
 * Generate global segment definitions by matching events to timeline slices
 */
export function generateSegmentDefinitions(rawTimelines: RawTimeline[], rawEvents: RawEvent[]): SegmentDefinition[] {
  // Step 1: Extract all slices from timelines
  const allSlices: RawTimelineSlice[] = [];
  
  rawTimelines.forEach(timeline => {
    timeline.slices.forEach((slice: RawTimelineSlice) => {
      allSlices.push({
        id: slice.id,
        timelineId: slice.timelineId,
        shortDescription: slice.shortDescription,
        startTimestamp: slice.startTimestamp,
        endTimestamp: slice.endTimestamp,
        importance: slice.importance
      });
    });
  });
  
  // Step 2: Group slices canonically (by time range)
  const sliceGroups = groupSlicesCanonically(allSlices);
  
  // Step 3: Count events in each group
  const groupStats = countEventsInGroups(rawEvents, sliceGroups);
  
  // Step 4: Remove fully contained segments
  const filteredSegments = removeContainedSegments(groupStats);
  
  // Step 5: Merge adjacent segments with similar density
  const mergedSegments = mergeAdjacentSegments(filteredSegments);
  
  // Step 6: Merge overlapping segments
  const finalSegments = mergeOverlappingSegments(mergedSegments);
  
  // Step 7: Apply v5 hybrid weighting
  const weightedSegments = applyV5Weighting(finalSegments);
  
  // Step 8: Convert to global segment definitions
  const segmentDefinitions: SegmentDefinition[] = [];
  
  weightedSegments.forEach((segment, index) => {
    // Use the percentage directly as the scale factor (like the original)
    const scale = segment.percent;
    
    // Use first short description as label, or fall back to time-based label
    const label = segment.shortDescriptions.length > 0 
      ? segment.shortDescriptions[0] 
      : formatTimeLabel(segment.start.getTime());
    
    segmentDefinitions.push({
      id: `segment-${index}`,
      start: segment.start,
      end: segment.end,
      label,
      scale,
      fractionOfTimeline: scale
    });
  });
  
  return segmentDefinitions;
}

// Helper functions duplicated from segmentation.ts

function groupSlicesCanonically(allSlices: RawTimelineSlice[]): Array<{start: Date, end: Date, slices: Array<{timelineId: string, shortDescription: string, start: Date, end: Date}>}> {
  const sliceGroups = new Map<string, {start: Date, end: Date, slices: Array<{timelineId: string, shortDescription: string, start: Date, end: Date}>}>();
  
  allSlices.forEach(slice => {
    const start = new Date(slice.startTimestamp);
    const end = new Date(slice.endTimestamp);
    const key = `${start.getTime()}-${end.getTime()}`;
    
    if (!sliceGroups.has(key)) {
      sliceGroups.set(key, {
        start,
        end,
        slices: []
      });
    }
    
    const group = sliceGroups.get(key)!;
    group.slices.push({
      timelineId: slice.timelineId,
      shortDescription: slice.shortDescription,
      start,
      end
    });
  });
  
  return Array.from(sliceGroups.values()).sort((a, b) => a.start.getTime() - b.start.getTime());
}

function countEventsInGroups(rawEvents: RawEvent[], sliceGroups: Array<{start: Date, end: Date, slices: Array<{timelineId: string, shortDescription: string, start: Date, end: Date}>}>): SegmentStats[] {
  const eventDates = rawEvents.map(e => new Date(e.narrativeDate));
  
  return sliceGroups.map(group => {
    const eventCount = eventDates.filter(date => 
      date >= group.start && date <= group.end
    ).length;
    
    const timelineCount = new Set(group.slices.map(s => s.timelineId)).size;
    const days = Math.max(1, Math.ceil((group.end.getTime() - group.start.getTime()) / (24 * 60 * 60 * 1000)));
    const shortDescriptions = [...new Set(group.slices.map(s => s.shortDescription))];
    
    return {
      start: group.start,
      end: group.end,
      eventCount,
      timelineCount,
      shortDescriptions,
      days,
      hybridWeight: 0, // Will be computed later
      percent: 0 // Will be computed later
    };
  });
}

function removeContainedSegments(segmentStats: SegmentStats[]): SegmentStats[] {
  return segmentStats.filter((seg, i) => {
    return !segmentStats.some((other, j) => 
      i !== j && 
      other.start <= seg.start && 
      other.end >= seg.end
    );
  });
}

function mergeAdjacentSegments(filteredSegments: SegmentStats[]): SegmentStats[] {
  const mergedSegments: SegmentStats[] = [];
  const used = new Set<number>();
  
  for (let i = 0; i < filteredSegments.length; i++) {
    if (used.has(i)) continue;
    
    let merged = false;
    for (let j = 0; j < filteredSegments.length; j++) {
      if (j <= i || used.has(j)) continue;
      
      const seg1 = filteredSegments[i];
      const seg2 = filteredSegments[j];
      
      const gap = Math.abs((seg2.start.getTime() - seg1.end.getTime()) / (24 * 60 * 60 * 1000));
      if (gap > 2) continue;
      
      const density1 = seg1.eventCount / seg1.days;
      const density2 = seg2.eventCount / seg2.days;
      
      if (density1 === 0 || density2 === 0) continue;
      
      const ratio = Math.min(density1, density2) / Math.max(density1, density2);
      if (ratio >= 0.7) {
        mergedSegments.push({
          start: new Date(Math.min(seg1.start.getTime(), seg2.start.getTime())),
          end: new Date(Math.max(seg1.end.getTime(), seg2.end.getTime())),
          eventCount: seg1.eventCount + seg2.eventCount,
          timelineCount: seg1.timelineCount + seg2.timelineCount,
          shortDescriptions: [...seg1.shortDescriptions, ...seg2.shortDescriptions],
          days: Math.max(1, Math.ceil((Math.max(seg1.end.getTime(), seg2.end.getTime()) - Math.min(seg1.start.getTime(), seg2.start.getTime())) / (24 * 60 * 60 * 1000))),
          hybridWeight: 0, // Will be computed later
          percent: 0 // Will be computed later
        });
        used.add(i);
        used.add(j);
        merged = true;
        break;
      }
    }
    
    if (!merged) {
      mergedSegments.push(filteredSegments[i]);
    }
  }
  
  return mergedSegments;
}

function mergeOverlappingSegments(mergedSegments: SegmentStats[]): SegmentStats[] {
  const finalSegments: SegmentStats[] = [];
  const used = new Set<number>();
  
  mergedSegments.sort((a, b) => a.start.getTime() - b.start.getTime());
  
  for (let i = 0; i < mergedSegments.length; i++) {
    if (used.has(i)) continue;
    
    let current = mergedSegments[i];
    let merged = false;
    
    for (let j = i + 1; j < mergedSegments.length; j++) {
      if (used.has(j)) continue;
      
      const next = mergedSegments[j];
      
      // Check if segments overlap
      if (current.end >= next.start) {
        current = {
          start: new Date(Math.min(current.start.getTime(), next.start.getTime())),
          end: new Date(Math.max(current.end.getTime(), next.end.getTime())),
          eventCount: current.eventCount + next.eventCount,
          timelineCount: Math.max(current.timelineCount, next.timelineCount),
          shortDescriptions: [...current.shortDescriptions, ...next.shortDescriptions],
          days: Math.max(1, Math.ceil((Math.max(current.end.getTime(), next.end.getTime()) - Math.min(current.start.getTime(), next.start.getTime())) / (24 * 60 * 60 * 1000))),
          hybridWeight: 0,
          percent: 0
        };
        used.add(j);
        merged = true;
      }
    }
    
    finalSegments.push(current);
    if (merged) {
      used.add(i);
    }
  }
  
  return finalSegments;
}

function applyV5Weighting(segments: SegmentStats[]): SegmentStats[] {
  // Step 1: Compute hybrid weights using logarithmic scaling
  for (const seg of segments) {
    const denom = Math.pow(Math.log(seg.days + 1), 0.6);
    seg.hybridWeight = denom > 0 ? (seg.eventCount + SMALL_CONSTANT) / denom : 0.0;
  }

  // Step 2: Calculate percentages
  const totalWeight = segments.reduce((sum, seg) => sum + seg.hybridWeight, 0);
  for (const seg of segments) {
    seg.percent = 100.0 * seg.hybridWeight / totalWeight;
  }

  // Step 3: Clamp 1-event segments at 1%
  let excess = 0.0;
  for (const seg of segments) {
    if (seg.eventCount === 1 && seg.percent > 1.0) {
      excess += seg.percent - 1.0;
      seg.percent = 1.0;
    }
  }

  // Step 4: Redistribute excess to multi-event segments
  const multiEventSegments = segments.filter(s => s.eventCount > 1);
  const totalMulti = multiEventSegments.reduce((sum, seg) => sum + seg.percent, 0);
  
  for (const seg of multiEventSegments) {
    const share = totalMulti > 0 ? seg.percent / totalMulti : 0;
    seg.percent += share * excess;
  }

  return segments;
}

function formatTimeLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const timePart = date.toISOString().split('T')[1];
  const [hours, minutes] = timePart.split(':');
  return `${hours}:${minutes}`;
} 