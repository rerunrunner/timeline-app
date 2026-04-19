import React, { useCallback, useEffect, useState } from 'react';
import { usePostHog } from '@posthog/react';
import type { IEvent, ITimeline } from '../../../types/interfaces';
import type { Platform, Orientation } from '../hooks/usePlatform';
import { useEventSelection } from '../hooks/useEventSelection';
import ViewPort from './ViewPort';
import ResizableEventViewer from './ResizableEventViewer';
import { isPosthogActive } from '../../../utils/posthogEnabled';
import './ITimeline.css';

/**
 * ITimelineContainer - Main container component for immutable timeline visualization
 *
 * This component serves as the primary interface for the desktop timeline
 * experience. Event selection and interaction state is owned by
 * `useEventSelection`, a desktop-local hook. Container itself is responsible
 * for layout, the event detail panel, and the soundtrack outbound analytics.
 *
 * Layout:
 * - Timeline viewer on the left (flexible width)
 * - Event viewer on the right (fixed width of 384px)
 * - Side-by-side layout for better user experience
 */
interface ITimelineContainerProps {
  timelines: ITimeline[];
  currentTime: number;
  episodes?: Array<{ id: string; episodeNumber: number; title: string; duration: number }>;
  dataSelector: JSX.Element;
  platform: Platform;
  orientation: Orientation;
  compactLandscape: boolean;
  /** Current dataset id for analytics (PostHog). */
  datasetId?: string;
}

const ITimelineContainer: React.FC<ITimelineContainerProps> = ({
  timelines,
  currentTime,
  episodes = [],
  dataSelector,
  platform,
  orientation: _orientation,
  compactLandscape,
  datasetId,
}) => {
  const posthog = usePostHog();
  const analyticsEnabled = isPosthogActive;

  const {
    lockedEvent,
    activeEvent,
    eventToShow,
    handleEventClick,
    handleEventHover,
    handleEventHoverEnd,
    handleViewerLockToggle,
  } = useEventSelection({ timelines, currentTime, datasetId });

  const [detailVisibility, setDetailVisibility] = useState<'hidden' | 'visible'>('visible');

  useEffect(() => {
    setDetailVisibility(compactLandscape ? 'hidden' : 'visible');
  }, [compactLandscape]);

  // Reveal the detail panel again if the user clicks an event while it is
  // hidden on compact landscape layouts.
  const handleEventClickWithReveal = useCallback(
    (event: IEvent) => {
      handleEventClick(event);
      if (compactLandscape) setDetailVisibility('visible');
    },
    [compactLandscape, handleEventClick]
  );

  const handleSoundtrackOutboundClick = useCallback(() => {
    if (!analyticsEnabled || !eventToShow?.soundtrack) return;
    let mediaHost: string | undefined;
    try {
      mediaHost = new URL(eventToShow.soundtrack.mediaUrl).hostname;
    } catch {
      mediaHost = undefined;
    }
    posthog.capture('timeline_soundtrack_outbound', {
      soundtrack_id: eventToShow.soundtrack.id,
      soundtrack_title: eventToShow.soundtrack.title,
      event_id: eventToShow.id,
      event_group_id: eventToShow.eventGroup.id,
      ...(mediaHost ? { media_host: mediaHost } : {}),
      ...(datasetId ? { dataset_id: datasetId } : {}),
    });
  }, [analyticsEnabled, posthog, eventToShow, datasetId]);

  return (
    <div className={`timeline-container${compactLandscape ? ' timeline-container--compact-landscape' : ''}`}>
      <ViewPort
        timelines={timelines}
        events={timelines.flatMap(timeline =>
          timeline.segments.flatMap(segment =>
            segment.subSegments.flatMap(subSegment =>
              subSegment.eventGroups.flatMap(group => group.events)
            )
          )
        )}
        isLoading={false}
        currentTime={currentTime}
        onEventClick={handleEventClickWithReveal}
        onEventHover={handleEventHover}
        onEventHoverEnd={handleEventHoverEnd}
        lockedEvent={lockedEvent}
        activeEvent={activeEvent}
        dataSelector={dataSelector}
        platform={platform}
        compactLandscape={compactLandscape}
      />

      <ResizableEventViewer
        event={eventToShow}
        currentTime={currentTime}
        episodes={episodes}
        isLocked={!!lockedEvent}
        onToggleLock={handleViewerLockToggle}
        initialWidthPercent={22}
        minWidthPercent={10}
        maxWidthPercent={50}
        platform={platform}
        compactLandscape={compactLandscape}
        visibility={detailVisibility}
        onVisibilityChange={setDetailVisibility}
        onSoundtrackOutboundClick={handleSoundtrackOutboundClick}
      />
    </div>
  );
};

export { ITimelineContainer };
