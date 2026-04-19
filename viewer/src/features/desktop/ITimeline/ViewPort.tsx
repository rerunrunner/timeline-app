import { useState } from 'react';
import type { IEvent, ITimeline } from '../../../types/interfaces';
import type { Platform } from '../hooks/usePlatform';
import ITimelineContent from './TimelineContent';
import TimelineControls from './TimelineControls';

/**
 * ViewPort - Component that provides the scrollable viewport for timeline visualization
 * 
 * This component serves as a container that applies the timeline-viewer styling
 * and provides the scrollable area for the timeline content. It sits between
 * ITimelineContainer and ITimelineContent to separate layout concerns.
 * 
 * Key responsibilities:
 * - Provides the scrollable viewport with timeline-viewer styling
 * - Contains the ITimelineContent component
 * - Manages the visual presentation of the timeline area
 */
interface ViewPortProps {
  timelines: ITimeline[];
  events: IEvent[];
  isLoading: boolean;
  currentTime: number;
  onEventClick: (event: IEvent) => void;
  onEventHover: (event: IEvent) => void;
  onEventHoverEnd: () => void;
  lockedEvent: IEvent | null;
  activeEvent: IEvent | null;
  /** Dataset picker (loading / empty / select) — shown next to timeline width */
  dataSelector: JSX.Element;
  platform: Platform;
  compactLandscape: boolean;
}

export default function ViewPort({
  timelines,
  events,
  isLoading,
  currentTime,
  onEventClick,
  onEventHover,
  onEventHoverEnd,
  lockedEvent,
  activeEvent,
  dataSelector,
  platform,
  compactLandscape
}: ViewPortProps) {
  const [timelineWidth, setTimelineWidth] = useState(100); // Default to 200%
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(false);

  return (
    <div className={`timeline-viewport-container${compactLandscape ? ' timeline-viewport-container--compact-landscape' : ''}`}>
      <div className={`timeline-controls${compactLandscape ? ' timeline-controls--compact-landscape' : ''}${controlsOpen ? ' is-open' : ''}`}>
        {compactLandscape ? (
          <>
            <button
              type="button"
              className="timeline-controls-toggle"
              onClick={() => setControlsOpen((open) => !open)}
              aria-expanded={controlsOpen}
              aria-controls="timeline-controls-panel"
            >
              More
            </button>
            <div id="timeline-controls-panel" className="timeline-controls-panel">
              <TimelineControls
                dataSelector={dataSelector}
                platform={platform}
                compact
                timelineWidth={timelineWidth}
                onTimelineWidthChange={setTimelineWidth}
                autoScrollEnabled={autoScrollEnabled}
                onAutoScrollEnabledChange={setAutoScrollEnabled}
              />
            </div>
          </>
        ) : (
          <TimelineControls
            dataSelector={dataSelector}
            platform={platform}
            compact={false}
            timelineWidth={timelineWidth}
            onTimelineWidthChange={setTimelineWidth}
            autoScrollEnabled={autoScrollEnabled}
            onAutoScrollEnabledChange={setAutoScrollEnabled}
          />
        )}
        {compactLandscape ? (
          <div className="timeline-controls-scrim" onClick={() => setControlsOpen(false)} aria-hidden={!controlsOpen} />
        ) : null}
      </div>

      {compactLandscape && controlsOpen ? (
        <div className="timeline-controls-dismiss-area" onClick={() => setControlsOpen(false)} aria-hidden="true">
        </div>
      ) : null}

      {/* Scrollable timeline viewer */}
      <div id="timeline-viewer" className="timeline-viewer" data-testid="immutable-timeline-viewer">
        <ITimelineContent
          timelines={timelines}
          events={events}
          isLoading={isLoading}
          currentTime={currentTime}
          onEventClick={onEventClick}
          onEventHover={onEventHover}
          onEventHoverEnd={onEventHoverEnd}
          lockedEvent={lockedEvent}
          activeEvent={activeEvent}
          timelineWidth={timelineWidth}
          autoScrollEnabled={autoScrollEnabled}
          showTimeRuler={platform === 'computer'}
        />
      </div>
    </div>
  );
} 