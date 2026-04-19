# features/mobile

Reserved boundary for the future mobile experience: a card-per-event flow
with next/back navigation and a mini-map for orientation.

Not implemented yet. During the current preparation phase, mobile devices
continue to receive the desktop renderer from `features/desktop`. The App
shell (`src/App.tsx`) will pick up `MobileRoot` once it exists; the
switching point is already documented there.

## What lives here today

- `contract.ts` — the interface-level commitment from the App shell to a
  future `MobileRoot`: what shared data it will receive and, just as
  importantly, what it will NOT receive (no `lockedEvent`, no
  `activeEvent`, no hover-based focus, no desktop visual components).

## Design rules for when this is built

- Do not import from `features/desktop`. Mobile is a ground-up design.
- Consume shared data/bootstrap state from `features/shared` only.
- Do not assume desktop concepts like `lockedEvent`, `activeEvent`, or
  hover-driven focus apply. Navigation is card-by-card and explicit.
- Define mobile-native analytics events; do not reuse desktop event names
  whose semantics do not translate (scrub, hover, episode marker click,
  event group click, soundtrack outbound).
- `tablet` stays on `DesktopRoot`. Only `platform === 'mobile'` routes
  here.
