/**
 * Integration contract for the future mobile renderer.
 *
 * This file is intentionally interface-only — no runtime components, no
 * card UI, no mini-map, no next/back navigation yet. Its job is to pin
 * down what shared data a `MobileRoot` will consume so the App shell
 * (`src/App.tsx`) can be evolved to route `platform === 'mobile'` without
 * re-deriving boundaries at implementation time.
 *
 * Design commitments captured here:
 *
 * 1. Mobile consumes the same shared, hydrated data as desktop:
 *    - `timelines` (from `features/shared` hydration)
 *    - playback state (`currentTime`, `onTimeChange`, `totalDuration`)
 *    - `episodes` metadata
 *    - language/dataset state
 *    - `datasetId` for analytics tagging
 *
 * 2. Mobile does NOT inherit desktop interaction concepts:
 *    - no `lockedEvent`
 *    - no `activeEvent`
 *    - no hover-based focus
 *    - no playhead-driven "most recent event" selection
 *    Navigation on mobile will be card-per-event with explicit next/back,
 *    plus a mini-map for orientation. Selection is the mobile renderer's
 *    own concern and stays inside `features/mobile`.
 *
 * 3. Mobile does NOT reuse desktop visual components. `DataSelector`,
 *    `ITimelineContainer`/`ViewPort`/`Timeline`, the `EventViewer`,
 *    `ResizableEventViewer`, `Controller`, `Playbar`, and
 *    `EpisodeTimeSelector` all remain desktop-owned in `features/desktop`.
 *    Mobile builds its own language picker, event card, and navigation
 *    affordances from the ground up.
 *
 * 4. Analytics:
 *    - `useSessionAnalytics` in `features/shared` is cross-platform and
 *      fires on both desktop and mobile.
 *    - Desktop-specific playback events (`timeline_playback_toggle`,
 *      `timeline_scrub`, `timeline_episode_marker_click`,
 *      `timeline_event_group_click`, `timeline_event_hover`,
 *      `timeline_soundtrack_outbound`) stay in `features/desktop` and
 *      should NOT be emitted by `MobileRoot`. Mobile will define its own
 *      event names (e.g. card advance, mini-map jump) at implementation
 *      time.
 *
 * 5. Renderer selection stays in the App shell. `platform === 'mobile'`
 *    will be the only condition that routes to `MobileRoot`; `tablet`
 *    continues to render `DesktopRoot` until a product decision says
 *    otherwise.
 */

import type { ITimeline } from '../../types/interfaces';
import type { RawLanguage } from '../../utils/hydrate/types';

/**
 * Platforms that may route to a mobile renderer in the future. `tablet`
 * and `computer` are intentionally excluded here: the App shell keeps
 * them on `DesktopRoot` regardless of how `MobileRoot` evolves.
 */
export type MobilePlatform = 'mobile';

/**
 * Props the future `MobileRoot` will accept from the App shell.
 *
 * Kept deliberately separate from `DesktopRootProps` — the shapes may look
 * similar today, but mobile must be free to diverge (e.g. drop
 * `compactLandscape`, add orientation-driven gestures, carry different
 * language-picker affordances) without being anchored to desktop.
 */
export interface MobileRootProps {
  /** Hydrated timelines ready to render. */
  timelines: ITimeline[];
  /** Current playhead position (seconds). */
  currentTime: number;
  /** Move the playhead. Mobile may drive this from card navigation, the
   *  mini-map, or gestures rather than a scrub bar. */
  onTimeChange: (time: number) => void;
  /** Total duration (seconds) across all episodes. */
  totalDuration: number;
  /** Episode metadata available for orientation/jump affordances. */
  episodes?: Array<{ id: string; episodeNumber: number; title: string; duration: number }>;
  /** Current dataset id for analytics tagging; empty string when unknown. */
  datasetId: string;

  /** Mobile renderer only ever sees `mobile`. */
  platform: MobilePlatform;

  /** Full language list for this dataset. */
  availableLanguages: RawLanguage[];
  /** Currently selected language code. */
  selectedLanguageCode: string;
  /** Change the active language; shared URL sync will persist `?lang=`. */
  onLanguageChange: (code: string) => void;

  /** Dataset discovery is still in-flight. */
  isLoadingDatasets: boolean;
  /** At least one dataset was discovered. */
  hasDatasets: boolean;
}

/**
 * The shape the App shell will import once `MobileRoot` is implemented.
 * Exported as a type so the shell can stay typed even while the component
 * file is stubbed.
 */
export type MobileRootComponent = (props: MobileRootProps) => JSX.Element;
