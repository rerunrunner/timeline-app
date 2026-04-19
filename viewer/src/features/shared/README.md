# features/shared

Non-visual shared code consumed by `features/desktop` and, in the future,
`features/mobile`.

Scope:
- dataset loading and hydration wiring
- localization/language state
- URL sync (`?t=`, `?lang=`)
- platform detection
- editor live-refresh wiring
- analytics primitives that are genuinely cross-platform

Explicitly out of scope:
- reusable visual components. Desktop and mobile build their own UI.
- desktop-only interaction concepts such as `lockedEvent`, `activeEvent`,
  hover-based focus, or playhead-driven event selection. Those live in
  `features/desktop`.
