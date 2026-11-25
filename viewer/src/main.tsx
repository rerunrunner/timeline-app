import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import posthog from 'posthog-js'
import { PostHogProvider } from '@posthog/react'
import './index.css'
import App from './App.tsx'
import { isPosthogActive } from './utils/posthogEnabled'
import { posthogHost, posthogToken } from './utils/runtimeConfig'

if (isPosthogActive && posthogToken && posthogHost) {
  const isInternalHost = window.location.hostname.toLowerCase().startsWith('i.')

  posthog.init(posthogToken, {
    api_host: posthogHost,
    defaults: '2026-01-30',
    // Default is `identified_only`: anonymous custom events show in Activity but
    // do not build Person profiles until identify(). Timeline has no login flow.
    person_profiles: 'always',
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
    // Apply the internal marker at the final capture boundary so every custom
    // timeline event (including high-frequency interactions) carries it.
    // Leave PostHog's own internal events unchanged.
    before_send: (event) => {
      if (isInternalHost && event?.event?.startsWith('timeline_')) {
        event.properties = {
          ...event.properties,
          is_internal: true,
        }
      }
      return event
    },
  })

  if (isInternalHost) {
    posthog.setPersonProperties({ is_internal: true })
    posthog.register({ is_internal: true })
  }

  // The root page deliberately disables PostHog's automatic pageviews and
  // autocapture. Its shell passes the original landing context to this viewer,
  // so record exactly one homepage pageview and the resulting viewer transition
  // through this already-initialized PostHog client.
  const homepageParams = new URLSearchParams(window.location.search)
  if (homepageParams.get('homepage_entry') === '1') {
    const homepageUrl = homepageParams.get('homepage_url') || ''
    const homepageReferrer = homepageParams.get('homepage_referrer') || ''
    const landingProperties: Record<string, string> = {
      landing_url: homepageUrl,
    }
    if (homepageReferrer) {
      landingProperties.landing_referrer = homepageReferrer
    }

    posthog.capture('$pageview', {
      ...landingProperties,
      $current_url: homepageUrl,
      ...(homepageReferrer ? { $referrer: homepageReferrer } : {}),
      page_type: 'homepage',
    })
    posthog.capture('homepage_timeline_opened', {
      ...landingProperties,
      destination_path: window.location.pathname,
      entry_point: 'homepage_timeline_embed',
      source_control: 'homepage',
    })
  }

  // In an iframe, `document.referrer` is the embedding page (e.g. the site shell),
  // not Reddit/Tumblr/etc. The parent page passes its own referrer via
  // `?landing_referrer=` so analytics can attribute traffic correctly.
  const landing = new URLSearchParams(window.location.search).get('landing_referrer')
  if (landing !== null) {
    posthog.register_once({
      landing_referrer: landing,
    })
  }
}

const root = document.getElementById('root')!

createRoot(root).render(
  <StrictMode>
    {isPosthogActive && posthogToken && posthogHost ? (
      <PostHogProvider client={posthog}>
        <App />
      </PostHogProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
)
