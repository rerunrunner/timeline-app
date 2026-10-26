import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePostHog } from '@posthog/react';
import { isPosthogActive } from '../../../utils/posthogEnabled';

/** Avoid duplicate session_started in React StrictMode (dev double-mount). */
let timelineSessionStartLogged = false;
/** Wall-clock when dataset/timeline became ready (for `duration_ms` on exit). */
let timelineDatasetSessionStartTs = 0;

type UseSessionAnalyticsArgs = {
  selectedDataFile: string;
  timelinesReady: boolean;
  /** Dataset language code from DataSelector (ISO-ish code, e.g. en, ko). */
  selectedLanguageCode: string;
  /** Renderer selected by the App shell. */
  uiVersion: 'mobile_v1' | 'desktop_v1';
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
  selectedLanguageCode,
  uiVersion,
}: UseSessionAnalyticsArgs): void {
  const posthog = usePostHog();
  const pageEnteredAtRef = useRef(0);
  const analyticsEnabled = isPosthogActive;

  useLayoutEffect(() => {
    if (!analyticsEnabled) return;
    posthog.register({ ui_version: uiVersion });
  }, [analyticsEnabled, posthog, uiVersion]);

  useEffect(() => {
    if (!analyticsEnabled) return;
    pageEnteredAtRef.current = Date.now();
  }, [analyticsEnabled]);

  useEffect(() => {
    if (!analyticsEnabled || !selectedLanguageCode) return;
    posthog.register({ selected_language: selectedLanguageCode });
  }, [analyticsEnabled, posthog, selectedLanguageCode]);

  useEffect(() => {
    if (!analyticsEnabled) return;
    if (!selectedDataFile || !timelinesReady || timelineSessionStartLogged) return;
    timelineSessionStartLogged = true;
    timelineDatasetSessionStartTs = Date.now();
    posthog.capture('timeline_session_started', {
      dataset_id: selectedDataFile,
      selected_language: selectedLanguageCode || undefined,
      ui_version: uiVersion,
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });
  }, [
    analyticsEnabled,
    posthog,
    selectedDataFile,
    selectedLanguageCode,
    timelinesReady,
    uiVersion,
  ]);

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
      if (selectedLanguageCode) {
        payload.selected_language = selectedLanguageCode;
      }
      payload.ui_version = uiVersion;
      posthog.capture('timeline_session_ended', payload);
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [analyticsEnabled, posthog, selectedDataFile, selectedLanguageCode, uiVersion]);
}
