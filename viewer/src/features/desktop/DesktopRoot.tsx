import React, { useCallback } from 'react';
import { usePostHog } from '@posthog/react';
import type { ITimeline } from '../../types/interfaces';
import type { RawLanguage } from '../../utils/hydrate/types';
import { isPosthogActive } from '../../utils/posthogEnabled';
import type { Platform, Orientation } from './hooks/usePlatform';
import { ITimelineContainer } from './ITimeline/Container';
import Controller from './Controller';
import DataSelector from './DataSelector';

/**
 * The contract the App shell uses to hand shared data/platform state to the
 * desktop renderer. Intentionally typed here (not in `features/shared`) so
 * that `shared` never imports from `desktop`, and so that a future
 * `MobileRoot` is free to define its own, different prop contract rather
 * than inheriting desktop assumptions.
 */
export interface DesktopRootProps {
  /** Hydrated timelines ready to render. */
  timelines: ITimeline[];
  /** Current playhead position (seconds). */
  currentTime: number;
  /** Move the playhead (scrub, episode jump, keyboard, etc.). */
  onTimeChange: (time: number) => void;
  /** Total duration (seconds) across all episodes. */
  totalDuration: number;
  /** Episode metadata used by playback controls. */
  episodes?: Array<{ id: string; episodeNumber: number; title: string; duration: number }>;
  /** Current dataset id for analytics tagging; empty string when unknown. */
  datasetId: string;

  platform: Platform;
  orientation: Orientation;
  compactLandscape: boolean;

  availableLanguages: RawLanguage[];
  selectedLanguageCode: string;
  onLanguageChange: (code: string) => void;

  /** Dataset discovery is still in-flight. */
  isLoadingDatasets: boolean;
  /** At least one dataset was discovered. */
  hasDatasets: boolean;
}

/**
 * DesktopRoot owns the entire desktop experience:
 * - the timeline canvas + event detail panel (via `ITimelineContainer`)
 * - desktop playback controls (`Controller`)
 * - the desktop language/data selector
 * - desktop playback analytics (playback toggle, scrub, episode marker clicks)
 *
 * The App shell is responsible for producing the shared data that flows
 * into `DesktopRootProps`; DesktopRoot does not know where that data comes
 * from. This is the seam that a future `MobileRoot` will plug into.
 */
const DesktopRoot: React.FC<DesktopRootProps> = ({
  timelines,
  currentTime,
  onTimeChange,
  totalDuration,
  episodes,
  datasetId,
  platform,
  orientation,
  compactLandscape,
  availableLanguages,
  selectedLanguageCode,
  onLanguageChange,
  isLoadingDatasets,
  hasDatasets,
}) => {
  const posthog = usePostHog();
  const analyticsEnabled = isPosthogActive;

  const onPlaybackToggle = useCallback(
    (playing: boolean) => {
      if (!analyticsEnabled) return;
      posthog.capture('timeline_playback_toggle', {
        playing,
        ...(datasetId ? { dataset_id: datasetId } : {}),
      });
    },
    [analyticsEnabled, posthog, datasetId]
  );

  const onEpisodeMarkerClick = useCallback(
    (payload: {
      marker: 'episode' | 'end';
      episode_id?: string;
      episode_number?: number;
      start_time_seconds: number;
    }) => {
      if (!analyticsEnabled) return;
      posthog.capture('timeline_episode_marker_click', {
        ...payload,
        ...(datasetId ? { dataset_id: datasetId } : {}),
      });
    },
    [analyticsEnabled, posthog, datasetId]
  );

  const onScrubInteraction = useCallback(
    (payload: { phase: 'start' | 'end'; time_seconds: number }) => {
      if (!analyticsEnabled) return;
      posthog.capture('timeline_scrub', {
        ...payload,
        ...(datasetId ? { dataset_id: datasetId } : {}),
      });
    },
    [analyticsEnabled, posthog, datasetId]
  );

  const dataSelector: JSX.Element = isLoadingDatasets ? (
    <div className="text-sm text-gray-500">Loading languages...</div>
  ) : !hasDatasets ? (
    <div className="text-sm text-amber-600 max-w-md">
      No dataset. Start the editor backend on port 5001, open the viewer dev URL Vite prints (any port), or set{' '}
      <code className="text-xs bg-amber-50 px-1 rounded">VITE_EDITOR_API_URL</code> to your export URL. Check the
      browser console if this persists (often CORS or wrong port).
    </div>
  ) : (
    <DataSelector
      languages={availableLanguages}
      selectedLanguageCode={selectedLanguageCode}
      onLanguageChange={onLanguageChange}
      platform={platform}
    />
  );

  return (
    <div className={`app${compactLandscape ? ' app--compact-landscape' : ''}`}>
      <ITimelineContainer
        timelines={timelines}
        currentTime={currentTime}
        episodes={episodes}
        dataSelector={dataSelector}
        platform={platform}
        orientation={orientation}
        compactLandscape={compactLandscape}
        datasetId={datasetId || undefined}
      />

      <Controller
        onTimeChange={onTimeChange}
        currentTime={currentTime}
        totalDuration={totalDuration}
        episodes={episodes}
        episodeLabel="Ep"
        platform={platform}
        compactLandscape={compactLandscape}
        onPlaybackToggle={onPlaybackToggle}
        onEpisodeMarkerClick={onEpisodeMarkerClick}
        onScrubInteraction={onScrubInteraction}
      />
    </div>
  );
};

export default DesktopRoot;
