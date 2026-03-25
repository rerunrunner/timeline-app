/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_POSTHOG_TOKEN?: string
  readonly VITE_PUBLIC_POSTHOG_HOST?: string
  /** Set to `true` or `1` to send PostHog events during `npm run dev` (default is off). */
  readonly VITE_PUBLIC_POSTHOG_ENABLE_IN_DEV?: string
}
