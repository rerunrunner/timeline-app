import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import posthog from 'posthog-js'
import { PostHogProvider } from '@posthog/react'
import './index.css'
import App from './App.tsx'
import { isPosthogActive } from './utils/posthogEnabled'
import { posthogHost, posthogToken } from './utils/runtimeConfig'

declare global {
  interface Window {
    posthog?: typeof posthog
  }
}

let analyticsClient = posthog
let usingParentClient = false

if (isPosthogActive && posthogToken && posthogHost) {
  // The site shell and viewer are same-origin. When embedded, reuse the
  // parent's initialized PostHog client so site and viewer events share one
  // identity, session, and event queue. Direct viewer visits initialize here.
  try {
    const parentWindow = window.parent as Window & { posthog?: typeof posthog }
    if (
      window.parent !== window &&
      window.parent.location.origin === window.location.origin &&
      parentWindow.posthog?.__loaded
    ) {
      analyticsClient = parentWindow.posthog
      usingParentClient = true
    }
  } catch {
    // Cross-origin embedding is not supported for client reuse; initialize locally.
  }

  const isInternalHost = window.location.hostname.toLowerCase().startsWith('i.')

  if (!usingParentClient) {
    posthog.init(posthogToken, {
      api_host: posthogHost,
      defaults: '2026-01-30',
      // Default is `identified_only`: anonymous custom events show in Activity but
      // do not build Person profiles until identify(). Timeline has no login flow.
      person_profiles: 'always',
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      // Internal traffic is marked at the final capture boundary for every event.
      before_send: (event) => {
        if (isInternalHost) {
          event.properties = {
            ...event.properties,
            is_internal: true,
          }
        }
        return event
      },
    })
  }

  analyticsClient.register({ surface: 'viewer' })

  if (isInternalHost) {
    analyticsClient.setPersonProperties({ is_internal: true })
    analyticsClient.register({ is_internal: true })
  }

  // The homepage records its own real pageview. The viewer records only the
  // transition into the timeline, avoiding a synthetic homepage pageview.
  const homepageParams = new URLSearchParams(window.location.search)
  if (homepageParams.get('homepage_entry') === '1') {
    analyticsClient.capture('homepage_timeline_opened', {
      destination_path: window.location.pathname,
      entry_point: 'homepage_timeline_embed',
      source_control: 'homepage',
      surface: 'viewer',
    })
  } else {
    // Direct links to the viewer should still be measurable as viewer landings.
    // Homepage-to-viewer transitions are already represented by the site's
    // homepage pageview and the transition event above.
    analyticsClient.capture('$pageview', {
      $current_url: window.location.href,
      ...(document.referrer ? { $referrer: document.referrer } : {}),
      page_type: 'viewer',
      surface: 'viewer',
    })
  }

  // In an iframe, document.referrer is the embedding page, not the original
  // external source. The homepage passes its referrer through this parameter.
  const landing = homepageParams.get('landing_referrer')
  if (landing !== null) {
    analyticsClient.register_once({ landing_referrer: landing })
  }
}

const root = document.getElementById('root')!

createRoot(root).render(
  <StrictMode>
    {isPosthogActive && posthogToken && posthogHost ? (
      <PostHogProvider client={analyticsClient}>
        <App />
      </PostHogProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
)
