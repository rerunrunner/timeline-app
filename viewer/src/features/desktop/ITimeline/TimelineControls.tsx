import type React from 'react';
import type { Platform } from '../hooks/usePlatform';

interface TimelineControlsProps {
  dataSelector: React.JSX.Element;
  platform: Platform;
  compact: boolean;
  timelineWidth: number;
  onTimelineWidthChange: (timelineWidth: number) => void;
  autoScrollEnabled: boolean;
  onAutoScrollEnabledChange: (autoScrollEnabled: boolean) => void;
}

/**
 * Renders the shared timeline controls body used by `ViewPort`.
 *
 * Layout decisions like inline vs. floating panel live in `ViewPort`; this
 * component only renders the controls themselves. The language selector always
 * renders, the width label is hidden on mobile portrait, and the "Jump to
 * event" text is only shown outside mobile portrait or when the compact panel
 * is open.
 */
export default function TimelineControls({
  dataSelector,
  platform,
  compact,
  timelineWidth,
  onTimelineWidthChange,
  autoScrollEnabled,
  onAutoScrollEnabledChange,
}: TimelineControlsProps) {
  const isMobile = platform === 'mobile';
  const showAutoScrollText = !isMobile || compact;
  const maxTimelineWidth = platform === 'computer' ? 800 : isMobile || compact ? 1000 : 400;
  const widthLabel = compact
    ? `Width ${timelineWidth}%`
    : isMobile
      ? null
      : `Timeline Width: ${timelineWidth}%`;

  return (
    <div className="timeline-width-control">
      <div className="timeline-data-selector">{dataSelector}</div>
      {platform === 'computer' ? (
        <div className="desktop-zoom-controls">
          <label htmlFor="desktop-timeline-zoom" className="desktop-zoom-label">
            Timeline Width
          </label>
          <input
            id="desktop-timeline-zoom"
            type="range"
            min="100"
            max="800"
            value={timelineWidth}
            onChange={(e) => onTimelineWidthChange(Number(e.target.value))}
            aria-label="Timeline width"
            className="width-control-slider desktop-zoom-slider"
          />
          <span aria-live="polite">{timelineWidth}%</span>
        </div>
      ) : (
        <>
          {widthLabel ? (
            <label
              htmlFor="timeline-width-slider"
              className={`width-control-label${compact ? ' width-control-label--compact' : ''}`}
            >
              {widthLabel}
            </label>
          ) : null}
          <input
            id="timeline-width-slider"
            type="range"
            min="100"
            max={String(maxTimelineWidth)}
            value={timelineWidth}
            onChange={(e) => onTimelineWidthChange(Number(e.target.value))}
            className="width-control-slider"
          />
        </>
      )}
      <button
        type="button"
        className={`jump-to-new-events-button${autoScrollEnabled ? ' is-active' : ''}`}
        onClick={(event) => {
          onAutoScrollEnabledChange(!autoScrollEnabled);
          event.currentTarget.blur();
        }}
        aria-pressed={autoScrollEnabled}
        aria-label="Jump to new events"
        title={autoScrollEnabled ? 'Automatic jumps are on' : 'Automatic jumps are off'}
      >
        {showAutoScrollText ? 'Jump to new events' : 'Jump'}
      </button>
    </div>
  );
}
