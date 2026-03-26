type TimelineRuntimeConfig = {
  posthogToken?: string
  posthogHost?: string
  posthogEnableInDev?: boolean | string
}

declare global {
  interface Window {
    __TIMELINE_CONFIG__?: TimelineRuntimeConfig
  }
}

function readRuntimeConfig(): TimelineRuntimeConfig {
  if (typeof window === 'undefined') {
    return {}
  }

  return window.__TIMELINE_CONFIG__ ?? {}
}

function firstNonEmptyString(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === 'string' && value.trim() !== '')
}

function parseBooleanLike(value: boolean | string | undefined): boolean {
  return value === true || value === 'true' || value === '1'
}

const runtimeConfig = readRuntimeConfig()
const isDev = import.meta.env.DEV

function runtimeOnlyString(value: string | undefined): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

export const posthogToken = isDev
  ? firstNonEmptyString(
      runtimeConfig.posthogToken,
      import.meta.env.VITE_PUBLIC_POSTHOG_TOKEN,
    )
  : runtimeOnlyString(runtimeConfig.posthogToken)

export const posthogHost = isDev
  ? firstNonEmptyString(
      runtimeConfig.posthogHost,
      import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    )
  : runtimeOnlyString(runtimeConfig.posthogHost)

export const posthogEnableInDev = parseBooleanLike(
  runtimeConfig.posthogEnableInDev ?? import.meta.env.VITE_PUBLIC_POSTHOG_ENABLE_IN_DEV,
)
