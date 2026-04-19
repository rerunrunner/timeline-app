import { useEffect, useRef } from 'react';

/** Parse `?t=<seconds>` for deep-linking (non-negative number). */
function readTimeFromUrl(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('t');
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

type UseUrlSyncArgs = {
  currentTime: number;
  totalDuration: number;
  timelinesReady: boolean;
  selectedLanguageCode: string;
  defaultLanguageCode: string;
  setCurrentTime: (time: number) => void;
};

/**
 * Two-way sync between the URL and the playhead/language state.
 *
 * - Reads `?t=<seconds>` once after the dataset is ready and applies it (clamped).
 * - Writes `?t` (rounded) and `?lang` (when non-default) back into the URL,
 *   debounced so rapid scrub updates do not spam history.
 */
export function useUrlSync({
  currentTime,
  totalDuration,
  timelinesReady,
  selectedLanguageCode,
  defaultLanguageCode,
  setCurrentTime,
}: UseUrlSyncArgs): void {
  const urlTimeAppliedRef = useRef(false);
  const urlSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Deep-link: ?t=<seconds> on first load after data is ready
  useEffect(() => {
    if (!timelinesReady || totalDuration <= 0) return;
    if (urlTimeAppliedRef.current) return;
    urlTimeAppliedRef.current = true;
    const sec = readTimeFromUrl();
    if (sec != null) {
      setCurrentTime(Math.min(Math.max(0, sec), totalDuration));
    }
  }, [timelinesReady, totalDuration, setCurrentTime]);

  // Keep URL in sync (debounced) so users can copy a shareable link
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current);
    urlSyncTimerRef.current = setTimeout(() => {
      urlSyncTimerRef.current = null;
      const params = new URLSearchParams(window.location.search);
      const rounded = Math.round(currentTime);
      if (rounded <= 0) params.delete('t');
      else params.set('t', String(rounded));
      if (selectedLanguageCode && selectedLanguageCode !== defaultLanguageCode) {
        params.set('lang', selectedLanguageCode);
      } else {
        params.delete('lang');
      }
      const q = params.toString();
      const path = window.location.pathname;
      const hash = window.location.hash;
      const next = q ? `${path}?${q}${hash}` : `${path}${hash}`;
      if (next !== window.location.pathname + window.location.search + window.location.hash) {
        window.history.replaceState(null, '', next);
      }
    }, 350);
    return () => {
      if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current);
    };
  }, [currentTime, defaultLanguageCode, selectedLanguageCode]);
}
