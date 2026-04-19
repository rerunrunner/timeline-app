# features/desktop

The current desktop timeline experience. This feature owns:

- the timeline canvas and related visualization (`ITimeline/`)
- desktop playback controls (`Controller.tsx`, `controller/`)
- the desktop language/data selector (`DataSelector.tsx`)
- the `usePlatform` hook today (may move to `features/shared` later if a
  genuinely cross-platform consumer emerges; keep it here for now to avoid
  promoting interaction concepts prematurely)
- desktop-only interaction logic: event `locked`/`active` selection,
  playhead-driven focus, hover behavior, and desktop event analytics

Nothing in this folder should be imported by `features/mobile`. Mobile is
expected to be designed from the ground up rather than reusing desktop
visuals or interaction patterns.
