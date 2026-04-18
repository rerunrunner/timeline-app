import type { Platform } from '../../hooks/usePlatform';

interface TimelineControlsProps {
  dataSelector: JSX.Element;
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
  const maxTimelineWidth = isMobile || compact ? 1000 : 400;
  const widthLabel = compact
    ? `Width ${timelineWidth}%`
    : isMobile
      ? null
      : `Timeline Width: ${timelineWidth}%`;

  return (
    <div className="timeline-width-control">
      <div className="timeline-data-selector">{dataSelector}</div>
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
      <label
        className={compact ? 'auto-scroll-label' : 'auto-scroll-control'}
        htmlFor="jump-to-event-checkbox"
        title="Jump to event"
      >
        <input
          type="checkbox"
          id="jump-to-event-checkbox"
          checked={autoScrollEnabled}
          onChange={(e) => onAutoScrollEnabledChange(e.target.checked)}
          className="auto-scroll-checkbox"
          aria-label="Jump to event"
        />
        {showAutoScrollText ? 'Jump to event' : null}
      </label>
    </div>
  );
}
