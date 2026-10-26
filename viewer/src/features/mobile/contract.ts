/**
 * Integration contract between the App shell and the mobile renderer.
 *
 * Design commitments:
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
 *    Selection is the mobile renderer's own concern and stays inside
 *    `features/mobile`.
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
 *      should NOT be emitted by `MobileRoot`.
 *
 * 5. Renderer selection stays in the App shell. `platform === 'mobile'`
 *    is the only condition that routes to `MobileRoot`; `tablet`
 *    continues to render `DesktopRoot` until a product decision says
 *    otherwise.
 */

import type { ITimeline } from '../../types/interfaces';
import type { RawLanguage } from '../../utils/hydrate/types';

/**
 * Platforms that route to the mobile renderer. `tablet`
 * and `computer` are intentionally excluded here: the App shell keeps
 * them on `DesktopRoot` regardless of how `MobileRoot` evolves.
 */
export type MobilePlatform = 'mobile';

/**
 * Props `MobileRoot` accepts from the App shell.
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
  /** The landing URL explicitly selected a playback time. */
  hasTimeDeepLink: boolean;
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
