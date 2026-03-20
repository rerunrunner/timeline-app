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
