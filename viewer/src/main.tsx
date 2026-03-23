import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import posthog from 'posthog-js'
import { PostHogProvider } from '@posthog/react'
import './index.css'
import App from './App.tsx'

const token = import.meta.env.VITE_PUBLIC_POSTHOG_TOKEN
const host = import.meta.env.VITE_PUBLIC_POSTHOG_HOST

if (token && host) {
  posthog.init(token, {
    api_host: host,
    defaults: '2026-01-30',
    // Default is `identified_only`: anonymous custom events show in Activity but
    // do not build Person profiles until identify(). Timeline has no login flow.
    person_profiles: 'always',
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
  })
}

const root = document.getElementById('root')!

createRoot(root).render(
  <StrictMode>
    {token && host ? (
      <PostHogProvider client={posthog}>
        <App />
      </PostHogProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
)
