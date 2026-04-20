import { useEffect, useRef, useState } from 'react';
import { usePostHog } from '@posthog/react';
import { isPosthogActive } from '../../../utils/posthogEnabled';

/**
 * Inclusive [lower, upper] clamp for the playhead during autoplay.
 *
 * Forward playback (positive speed) stops at `upper`; reverse playback
 * (negative speed) stops at `lower`. Omitting `range` defaults to
 * `[0, totalDuration]`, which preserves the legacy forward-playback
 * behavior of `Controller`.
 */
export type AutoplayRange = [lower: number, upper: number];

/**
 * One-shot command from the overture orchestrator into the playback
 * engine. Each dispatch creates a new object reference, which `Controller`
 * watches via a ref-equality guard so it applies the command exactly once.
 */
export type OvertureHandoff =
  | { playing: true; speed: number; range?: AutoplayRange }
  | { playing: false }
  | null;

const PARK_TIME_SECONDS = 29 * 60 + 40;
const OVERTURE_DURATION_MS = 10000;
const OVERTURE_DURATION_SECONDS = OVERTURE_DURATION_MS / 1000;
const POST_OVERTURE_SPEED = 120;
const MIN_DURATION_FOR_OVERTURE = PARK_TIME_SECONDS + 60;
// Versioned so that materially changing the overture (e.g. a new park time
// or choreography) can re-show it for everyone by bumping the suffix,
// without writing a migration.
const STORAGE_KEY = 'timeline:overtureSeen:v1';

type UseFirstVisitOvertureArgs = {
  totalDuration: number;
  timelinesReady: boolean;
  hasDeepLink: boolean;
  /** DesktopRoot passes its `onTimeChange` prop here. */
  onTimeChange: (t: number) => void;
};

type UseFirstVisitOvertureResult = {
  autoStart: OvertureHandoff;
};

/**
 * First-visit "reverse overture" for the desktop renderer.
 *
 * On the first time the desktop viewer is shown to this browser profile,
 * this hook orchestrates a short cinematic intro:
 *   1. Snap the playhead to `totalDuration` so the canvas is fully populated
 *      in frame one (the bounce-killer).
 *   2. Dispatch an `autoStart` to `Controller` that plays backward from the
 *      end to `PARK_TIME_SECONDS` over `OVERTURE_DURATION_MS`. Controller's
 *      existing playback `setInterval` drives the motion; this hook owns no
 *      timer for the actual scrubbing.
 *   3. When that interval elapses, snap to `PARK_TIME_SECONDS` and dispatch
 *      a forward `autoStart` at `POST_OVERTURE_SPEED` so events keep arriving
 *      past the bounce window.
 *
 * Skipped if the user arrived via a deep link (`?t=...`), if the story is
 * too short to land somewhere useful at `PARK_TIME_SECONDS`, or if the
 * overture has already played for this browser profile (tracked in
 * `localStorage` so it persists across tabs and reloads — once-per-user-per-
 * device, not once-per-tab).
 *
 * Any user input during the overture cancels it: the phase-2 timer is
 * cleared and `Controller` is told to stop.
 */
export function useFirstVisitOverture({
  totalDuration,
  timelinesReady,
  hasDeepLink,
  onTimeChange,
}: UseFirstVisitOvertureArgs): UseFirstVisitOvertureResult {
  const posthog = usePostHog();
  const analyticsEnabled = isPosthogActive;

  const [autoStart, setAutoStart] = useState<OvertureHandoff>(null);

  // Capture the "already played?" decision at first render. If we read
  // localStorage inside the effect we'd see the flag we set ourselves on
  // the second strict-mode invocation and skip — orphaning the phase-2
  // timer that the first invocation's cleanup just tore down.
  const initialAlreadyPlayedRef = useRef<boolean | null>(null);
  if (initialAlreadyPlayedRef.current === null) {
    initialAlreadyPlayedRef.current =
      typeof window !== 'undefined' &&
      window.localStorage.getItem(STORAGE_KEY) === '1';
  }

  // Stable refs for values that should not re-fire the effect.
  const onTimeChangeRef = useRef(onTimeChange);
  useEffect(() => {
    onTimeChangeRef.current = onTimeChange;
  }, [onTimeChange]);
  const posthogRef = useRef(posthog);
  useEffect(() => {
    posthogRef.current = posthog;
  }, [posthog]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (initialAlreadyPlayedRef.current) return;
    if (hasDeepLink) return;
    if (!timelinesReady) return;
    if (totalDuration < MIN_DURATION_FOR_OVERTURE) return;

    window.localStorage.setItem(STORAGE_KEY, '1');

    const startedAt = Date.now();
    let cancelled = false;

    function cleanupListeners() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    }

    function cancelOverture(cause: 'keydown' | 'pointerdown') {
      if (cancelled) return;
      cancelled = true;
      clearTimeout(phase2Timer);
      setAutoStart({ playing: false });
      cleanupListeners();
      if (analyticsEnabled) {
        posthogRef.current.capture('timeline_overture_cancelled', {
          cause,
          elapsed_ms: Date.now() - startedAt,
        });
      }
    }

    function onKeyDown() {
      cancelOverture('keydown');
    }
    function onPointerDown() {
      cancelOverture('pointerdown');
    }

    if (analyticsEnabled) {
      posthogRef.current.capture('timeline_overture_started', {
        total_duration_seconds: Math.round(totalDuration),
        park_time_seconds: PARK_TIME_SECONDS,
        overture_duration_ms: OVERTURE_DURATION_MS,
      });
    }

    // Phase 1: jump to the end and play backward, clamped to [PARK, totalDuration].
    const reverseSpeed =
      -(totalDuration - PARK_TIME_SECONDS) / OVERTURE_DURATION_SECONDS;
    onTimeChangeRef.current(totalDuration);
    setAutoStart({
      playing: true,
      speed: reverseSpeed,
      range: [PARK_TIME_SECONDS, totalDuration],
    });

    // Phase 2 (after OVERTURE_DURATION_MS): snap to park and play forward at 120x.
    const phase2Timer = setTimeout(() => {
      if (cancelled) return;
      onTimeChangeRef.current(PARK_TIME_SECONDS);
      setAutoStart({ playing: true, speed: POST_OVERTURE_SPEED });
      cleanupListeners();
      if (analyticsEnabled) {
        posthogRef.current.capture('timeline_overture_completed', {
          elapsed_ms: Date.now() - startedAt,
        });
      }
    }, OVERTURE_DURATION_MS);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);

    return () => {
      cancelled = true;
      clearTimeout(phase2Timer);
      cleanupListeners();
    };
  }, [analyticsEnabled, hasDeepLink, timelinesReady, totalDuration]);

  return { autoStart };
}
