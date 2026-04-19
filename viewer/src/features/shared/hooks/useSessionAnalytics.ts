import { useEffect, useRef } from 'react';
import { usePostHog } from '@posthog/react';
import { isPosthogActive } from '../../../utils/posthogEnabled';

/** Avoid duplicate session_started in React StrictMode (dev double-mount). */
let timelineSessionStartLogged = false;
/** Wall-clock when dataset/timeline became ready (for `duration_ms` on exit). */
let timelineDatasetSessionStartTs = 0;

type UseSessionAnalyticsArgs = {
  selectedDataFile: string;
  timelinesReady: boolean;
};

/**
 * Cross-platform session lifecycle analytics. Fires `timeline_session_started`
 * once when a dataset becomes ready, and `timeline_session_ended` on pagehide.
 *
 * These events are renderer-agnostic; per-platform interaction events (scrubs,
 * episode markers, etc.) stay with their respective renderers.
 */
export function useSessionAnalytics({
  selectedDataFile,
  timelinesReady,
}: UseSessionAnalyticsArgs): void {
  const posthog = usePostHog();
  const pageEnteredAtRef = useRef(0);
  const analyticsEnabled = isPosthogActive;

  useEffect(() => {
    if (!analyticsEnabled) return;
    pageEnteredAtRef.current = Date.now();
  }, [analyticsEnabled]);

  useEffect(() => {
    if (!analyticsEnabled) return;
    if (!selectedDataFile || !timelinesReady || timelineSessionStartLogged) return;
    timelineSessionStartLogged = true;
    timelineDatasetSessionStartTs = Date.now();
    posthog.capture('timeline_session_started', {
      dataset_id: selectedDataFile,
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });
  }, [analyticsEnabled, posthog, selectedDataFile, timelinesReady]);

  useEffect(() => {
    if (!analyticsEnabled) return;
    const onPageHide = () => {
      if (pageEnteredAtRef.current === 0) return;
      const now = Date.now();
      const payload: Record<string, string | number> = {
        page_duration_ms: now - pageEnteredAtRef.current,
        path: typeof window !== 'undefined' ? window.location.pathname : '',
      };
      if (timelineSessionStartLogged && timelineDatasetSessionStartTs > 0) {
        payload.duration_ms = now - timelineDatasetSessionStartTs;
        payload.dataset_id = selectedDataFile;
      }
      posthog.capture('timeline_session_ended', payload);
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [analyticsEnabled, posthog, selectedDataFile]);
}
