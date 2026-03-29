import React, { useState } from 'react';
import type { IEvent, ITimeline } from '../../types/interfaces';
import type { Platform } from '../../hooks/usePlatform';
import ITimelineContent from './TimelineContent';

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
  dataSelector?: React.ReactNode;
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
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false); // Default to enabled
  const [controlsOpen, setControlsOpen] = useState(false);

  const isMobile = platform === 'mobile';
  const showInlineControls = !compactLandscape;
  const maxTimelineWidth = isMobile || compactLandscape ? 1000 : 400;

  return (
    <div className={`timeline-viewport-container${compactLandscape ? ' timeline-viewport-container--compact-landscape' : ''}`}>
      {/* Timeline Controls - on mobile: scale bar + jump-to-event checkbox; no data selector */}
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
              {!isMobile && dataSelector != null ? (
                <div className="timeline-data-selector">{dataSelector}</div>
              ) : null}
              <div className="timeline-width-control">
                <label htmlFor="timeline-width-slider" className="width-control-label width-control-label--compact">
                  Width {timelineWidth}%
                </label>
                <input
                  id="timeline-width-slider"
                  type="range"
                  min="100"
                  max={String(maxTimelineWidth)}
                  value={timelineWidth}
                  onChange={(e) => setTimelineWidth(Number(e.target.value))}
                  className="width-control-slider"
                />
                <label className="auto-scroll-label" htmlFor="jump-to-event-checkbox">
                  <input
                    type="checkbox"
                    id="jump-to-event-checkbox"
                    checked={autoScrollEnabled}
                    onChange={(e) => setAutoScrollEnabled(e.target.checked)}
                    className="auto-scroll-checkbox"
                  />
                  Jump to event
                </label>
              </div>
            </div>
          </>
        ) : (
          <div className="timeline-width-control">
            {!isMobile && dataSelector != null ? (
              <div className="timeline-data-selector">{dataSelector}</div>
            ) : null}
            {!isMobile ? (
              <label htmlFor="timeline-width-slider" className="width-control-label">
                Timeline Width: {timelineWidth}%
              </label>
            ) : (
              <label htmlFor="timeline-width-slider" className="width-control-label width-control-label--compact">
                {timelineWidth}%
              </label>
            )}
            <input
              id="timeline-width-slider"
              type="range"
              min="100"
              max={String(maxTimelineWidth)}
              value={timelineWidth}
              onChange={(e) => setTimelineWidth(Number(e.target.value))}
              className="width-control-slider"
            />
            <div className="auto-scroll-control" title="Jump to event">
              <input
                type="checkbox"
                id="jump-to-event-checkbox"
                checked={autoScrollEnabled}
                onChange={(e) => setAutoScrollEnabled(e.target.checked)}
                className="auto-scroll-checkbox"
                aria-label="Jump to event"
              />
            </div>
          </div>
        )}
        {showInlineControls ? null : (
          <div className="timeline-controls-scrim" onClick={() => setControlsOpen(false)} aria-hidden={!controlsOpen} />
        )}
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