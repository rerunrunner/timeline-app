import React from 'react';
import type { NarrativeDate, ReadonlyArray, ISegment } from '../../types/interfaces';

interface ITimeRulerProps {
  globalStartTime: number;
  globalEndTime: number;
  segments: ReadonlyArray<ISegment>;
}

export default function ITimeRuler({ globalStartTime, globalEndTime, segments }: ITimeRulerProps) {
  const formatDate = (date: Date): JSX.Element => {
    const year = date.getFullYear();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();

    // Show year prominently, month and day smaller
    return (
      <div className="i-date-label">
        <div className="year">{year}</div>
        <div className="month-day">{month} {day}</div>
      </div>
    );
  };

  const formatTime = (date: NarrativeDate): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="i-time-ruler">
      {segments.map((segment, index) => (
        <div
          key={`ruler-segment-${index}`}
          className={`i-timeline-segment ${segment.fractionOfTimeline > 5  ? 'with-markers' : ''}`}
          style={{
            width: `${segment.fractionOfTimeline}%`
          }}
        >
          {/* Only show markers if segment is wide enough */}
          {segment.fractionOfTimeline > 5 && (
            <>
              {/* Start date/time */}
              <div className="i-ruler-marker start-marker">
                {formatDate(segment.start)}
              </div>
              
              {/* End date/time */}
              <div className="i-ruler-marker end-marker">
                {formatDate(segment.end)}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
} 