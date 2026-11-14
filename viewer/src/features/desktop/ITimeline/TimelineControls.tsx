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
            step="25"
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
      <label
        className={compact ? 'auto-scroll-label' : 'auto-scroll-control'}
        htmlFor="jump-to-event-checkbox"
        title="Follow new reveals"
      >
        <input
          type="checkbox"
          id="jump-to-event-checkbox"
          checked={autoScrollEnabled}
          onChange={(e) => onAutoScrollEnabledChange(e.target.checked)}
          className="auto-scroll-checkbox"
          aria-label="Follow new reveals"
        />
        {showAutoScrollText ? 'Follow new reveals' : null}
      </label>
    </div>
  );
}
