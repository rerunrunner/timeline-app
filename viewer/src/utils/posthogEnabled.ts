import { posthogEnableInDev, posthogHost, posthogToken } from './runtimeConfig'

/** Token and host are set (PostHog may still be inactive in dev). */
export const isPosthogConfigured = Boolean(posthogToken && posthogHost)

/**
 * PostHog should initialize and send events. In development (`npm run dev`), this is
 * false unless `VITE_PUBLIC_POSTHOG_ENABLE_IN_DEV` is set so local runs do not send
 * analytics even when `.env.local` contains credentials.
 */
export const isPosthogActive = isPosthogConfigured && (!import.meta.env.DEV || posthogEnableInDev)
