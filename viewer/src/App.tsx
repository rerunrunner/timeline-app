import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { usePostHog } from '@posthog/react'
import SockJS from 'sockjs-client'
import { Stomp } from '@stomp/stompjs'
import { hydrate } from './utils/hydrate/index'
import type { ITimeline } from './types/interfaces'
import { ITimelineContainer } from './components/ITimeline/Container'
import Controller from './components/Controller'
import DataSelector from './components/DataSelector'
import { usePlatform } from './hooks/usePlatform'
import { isPosthogActive } from './utils/posthogEnabled'
import type { RawData } from './utils/hydrate/types'
import { getAvailableLanguages, getDefaultLanguageCode, resolveLocalizedRawData } from './utils/hydrate/localize'
import './App.css'

/** Parse `?t=<seconds>` for deep-linking (non-negative number). */
function readTimeFromUrl(): number | null {
  if (typeof window === 'undefined') return null
  const raw = new URLSearchParams(window.location.search).get('t')
  if (raw == null || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function readLanguageFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const raw = new URLSearchParams(window.location.search).get('lang')
  if (raw == null || raw === '') return null
  return raw
}

/** Avoid duplicate session_started in React StrictMode (dev double-mount). */
let timelineSessionStartLogged = false
/** Wall-clock when dataset/timeline became ready (for `duration_ms` on exit). */
let timelineDatasetSessionStartTs = 0

type DatasetFile = {
  id: string
  name: string
  description: string
  filename: string
  data: RawData
}

function getEditorBaseUrl(): string | null {
  const url = import.meta.env.VITE_EDITOR_API_URL ?? (import.meta.env.DEV ? 'http://localhost:5001/api/export/dataset' : null)
  if (!url) return null
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

function App() {
  const posthog = usePostHog()
  const { platform, orientation, isCompactLandscape } = usePlatform()
  const [dataFiles, setDataFiles] = useState<DatasetFile[]>([])
  const [selectedDataFile, setSelectedDataFile] = useState<string>('')
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>('')
  const [itimelines, setITimelines] = useState<ITimeline[]>([])
  const [currentTime, setCurrentTime] = useState<number>(0) // Current playhead position in seconds
  const [totalDuration, setTotalDuration] = useState<number>(0) // Total duration in seconds
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const prevSelectedDataFileRef = useRef<string | null>(null)
  const urlTimeAppliedRef = useRef(false)
  const urlSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pageEnteredAtRef = useRef(0)

  const analyticsEnabled = isPosthogActive
  const currentDataFile = useMemo(
    () => dataFiles.find(df => df.id === selectedDataFile),
    [dataFiles, selectedDataFile]
  )
  const availableLanguages = useMemo(
    () => getAvailableLanguages(currentDataFile?.data),
    [currentDataFile]
  )
  const defaultLanguageCode = useMemo(
    () => getDefaultLanguageCode(currentDataFile?.data),
    [currentDataFile]
  )

  useEffect(() => {
    if (!analyticsEnabled) return
    pageEnteredAtRef.current = Date.now()
  }, [analyticsEnabled])

  useEffect(() => {
    if (!analyticsEnabled) return
    if (!selectedDataFile || itimelines.length === 0 || timelineSessionStartLogged) return
    timelineSessionStartLogged = true
    timelineDatasetSessionStartTs = Date.now()
    posthog.capture('timeline_session_started', {
      dataset_id: selectedDataFile,
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    })
  }, [analyticsEnabled, posthog, selectedDataFile, itimelines.length])

  useEffect(() => {
    if (!analyticsEnabled) return
    const onPageHide = () => {
      if (pageEnteredAtRef.current === 0) return
      const now = Date.now()
      const payload: Record<string, string | number> = {
        page_duration_ms: now - pageEnteredAtRef.current,
        path:
          typeof window !== 'undefined' ? window.location.pathname : '',
      }
      if (timelineSessionStartLogged && timelineDatasetSessionStartTs > 0) {
        payload.duration_ms = now - timelineDatasetSessionStartTs
        payload.dataset_id = selectedDataFile
      }
      posthog.capture('timeline_session_ended', payload)
    }
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [analyticsEnabled, posthog, selectedDataFile])

  const loadDataFiles = async () => {
    try {
      setIsLoading(true)
      const discoveredFiles: DatasetFile[] = []

      // In dev: try editor API first so changes show without exporting
      if (import.meta.env.DEV) {
        const apiUrl = import.meta.env.VITE_EDITOR_API_URL ?? 'http://localhost:5001/api/export/dataset'
        try {
          const res = await fetch(apiUrl)
          if (res.ok) {
            const data = await res.json()
            if (data?.metadata) {
              const filename = data.metadata.filename ?? `${data.metadata.id}.${data.metadata.version ?? 'dev'}.json`
              discoveredFiles.push({
                id: data.metadata.id,
                name: data.metadata.name,
                description: data.metadata.description ?? '',
                filename,
                data: { ...data, metadata: { ...data.metadata, filename } }
              })
            }
          } else {
            console.warn(
              `[viewer] Editor export failed: HTTP ${res.status} ${res.statusText} (${apiUrl}). Is the backend on port 5001?`
            )
          }
        } catch (err) {
          console.warn(
            `[viewer] Could not reach editor export (${apiUrl}). CORS, wrong URL, or backend not running.`,
            err
          )
        }
      }

      // Production: load only from packaged dataset (built by npm run build:static)
      if (!import.meta.env.DEV && discoveredFiles.length === 0) {
        try {
          const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
          const res = await fetch(`${base}/dataset.json`)
          if (res.ok) {
            const data = await res.json()
            if (data?.metadata) {
              const filename = data.metadata.filename ?? `${data.metadata.id}.${data.metadata.version ?? 'dev'}.json`
              discoveredFiles.push({
                id: data.metadata.id,
                name: data.metadata.name,
                description: data.metadata.description ?? '',
                filename,
                data: { ...data, metadata: { ...data.metadata, filename } }
              })
            }
          }
        } catch {
          // Ignore; will show empty state
        }
      }

      setDataFiles(discoveredFiles)
      if (discoveredFiles.length > 0) {
        setSelectedDataFile(discoveredFiles[0].id)
      }
    } catch (error) {
      console.error('Error loading data files:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDataFiles()
  }, [refreshKey])

  useEffect(() => {
    if (!currentDataFile) return

    setSelectedLanguageCode(currentLanguageCode => {
      if (currentLanguageCode && availableLanguages.some(language => language.code === currentLanguageCode)) {
        return currentLanguageCode
      }

      const languageFromUrl = readLanguageFromUrl()
      if (languageFromUrl && availableLanguages.some(language => language.code === languageFromUrl)) {
        return languageFromUrl
      }

      return defaultLanguageCode
    })
  }, [availableLanguages, currentDataFile, defaultLanguageCode])

  // When editor pushes metadata/version update, re-fetch dataset and re-render (playhead preserved via loadDataFile(..., true))
  useEffect(() => {
    const baseUrl = getEditorBaseUrl()
    if (!baseUrl) return
    const socket = new SockJS(`${baseUrl}/ws`)
    const stompClient = Stomp.over(socket)
    stompClient.connect({}, () => {
      stompClient.subscribe('/topic/metadata', () => {
        setRefreshKey((k) => k + 1)
      })
    })
    return () => {
      try {
        stompClient?.disconnect?.()
      } catch {
        // ignore
      }
    }
  }, [])

  const loadDataFile = (dataFileId: string, languageCode: string, preserveTime = false) => {
    try {
      const dataFile = dataFiles.find(df => df.id === dataFileId)
      if (!dataFile) {
        throw new Error(`Unknown data file: ${dataFileId}`)
      }

      const timelineData = resolveLocalizedRawData(dataFile.data, languageCode)
      
      if (!Array.isArray(timelineData.timelines)) {
        throw new Error('Timelines is not an array')
      }
      
      // Generate new ITimeline objects using the new hydrate function
      const newHydratedTimelines = hydrate(timelineData)
      setITimelines(newHydratedTimelines)
      
      // Calculate total duration from episodes
      const duration = timelineData.episodes?.reduce((sum: number, episode: any) => sum + episode.duration, 0) || 300
      setTotalDuration(duration)
      
      // Only reset playhead when switching to a different dataset, not when refreshing the same one
      if (!preserveTime) {
        setCurrentTime(0)
      }
    } catch (error) {
      console.error('Error loading timeline data:', error)
    }
  }

  // (Re)load current dataset into timeline when selection or data list changes. Preserve playhead when only data refreshed.
  useEffect(() => {
    if (!selectedDataFile || dataFiles.length === 0 || !selectedLanguageCode) return
    const isSwitchingFile = prevSelectedDataFileRef.current !== selectedDataFile
    prevSelectedDataFileRef.current = selectedDataFile
    loadDataFile(selectedDataFile, selectedLanguageCode, !isSwitchingFile)
  }, [selectedDataFile, dataFiles, selectedLanguageCode])

  // Update document title when data file changes
  useEffect(() => {
    const currentDataFile = dataFiles.find(df => df.id === selectedDataFile)
    if (currentDataFile?.data.metadata?.name) {
      document.title = currentDataFile.data.metadata.name
    } else {
      document.title = 'Timeline Viewer'
    }
  }, [selectedDataFile, dataFiles])

  // Deep-link: ?t=<seconds> on first load after data is ready
  useEffect(() => {
    if (itimelines.length === 0 || totalDuration <= 0) return
    if (urlTimeAppliedRef.current) return
    urlTimeAppliedRef.current = true
    const sec = readTimeFromUrl()
    if (sec != null) {
      setCurrentTime(Math.min(Math.max(0, sec), totalDuration))
    }
  }, [itimelines.length, totalDuration])

  // Keep URL in sync (debounced) so users can copy a shareable link
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current)
    urlSyncTimerRef.current = setTimeout(() => {
      urlSyncTimerRef.current = null
      const params = new URLSearchParams(window.location.search)
      const rounded = Math.round(currentTime)
      if (rounded <= 0) params.delete('t')
      else params.set('t', String(rounded))
      if (selectedLanguageCode && selectedLanguageCode !== defaultLanguageCode) params.set('lang', selectedLanguageCode)
      else params.delete('lang')
      const q = params.toString()
      const path = window.location.pathname
      const hash = window.location.hash
      const next = q ? `${path}?${q}${hash}` : `${path}${hash}`
      if (next !== window.location.pathname + window.location.search + window.location.hash) {
        window.history.replaceState(null, '', next)
      }
    }, 350)
    return () => {
      if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current)
    }
  }, [currentTime, defaultLanguageCode, selectedLanguageCode])

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguageCode(languageCode)
  }

  const handleTimeChange = (newTime: number) => {
    setCurrentTime(newTime)
  }

  const onPlaybackToggle = useCallback(
    (playing: boolean) => {
      if (!analyticsEnabled) return
      posthog.capture('timeline_playback_toggle', {
        playing,
        ...(selectedDataFile ? { dataset_id: selectedDataFile } : {}),
      })
    },
    [analyticsEnabled, posthog, selectedDataFile]
  )

  const onEpisodeMarkerClick = useCallback(
    (payload: {
      marker: 'episode' | 'end'
      episode_id?: string
      episode_number?: number
      start_time_seconds: number
    }) => {
      if (!analyticsEnabled) return
      posthog.capture('timeline_episode_marker_click', {
        ...payload,
        ...(selectedDataFile ? { dataset_id: selectedDataFile } : {}),
      })
    },
    [analyticsEnabled, posthog, selectedDataFile]
  )

  const onScrubInteraction = useCallback(
    (payload: { phase: 'start' | 'end'; time_seconds: number }) => {
      if (!analyticsEnabled) return
      posthog.capture('timeline_scrub', {
        ...payload,
        ...(selectedDataFile ? { dataset_id: selectedDataFile } : {}),
      })
    },
    [analyticsEnabled, posthog, selectedDataFile]
  )

  const dataSelector: JSX.Element =
    isLoading ? (
      <div className="text-sm text-gray-500">Loading languages...</div>
    ) : dataFiles.length === 0 ? (
      <div className="text-sm text-amber-600 max-w-md">
        No dataset. Start the editor backend on port 5001, open the viewer dev URL Vite prints (any port), or set{' '}
        <code className="text-xs bg-amber-50 px-1 rounded">VITE_EDITOR_API_URL</code> to your export URL. Check the
        browser console if this persists (often CORS or wrong port).
      </div>
    ) : (
      <DataSelector
        languages={availableLanguages}
        selectedLanguageCode={selectedLanguageCode}
        onLanguageChange={handleLanguageChange}
        platform={platform}
      />
    )

  return (
    <div className={`app${isCompactLandscape ? ' app--compact-landscape' : ''}`}>
      <ITimelineContainer
        timelines={itimelines}
        currentTime={currentTime}
        episodes={currentDataFile?.data.episodes}
        dataSelector={dataSelector}
        platform={platform}
        orientation={orientation}
        compactLandscape={isCompactLandscape}
        datasetId={selectedDataFile || undefined}
      />
      
      <Controller 
        onTimeChange={handleTimeChange} 
        currentTime={currentTime} 
        totalDuration={totalDuration}
        episodes={currentDataFile?.data.episodes}
        episodeLabel="Ep"
        platform={platform}
        compactLandscape={isCompactLandscape}
        onPlaybackToggle={onPlaybackToggle}
        onEpisodeMarkerClick={onEpisodeMarkerClick}
        onScrubInteraction={onScrubInteraction}
      />
    </div>
  )
}

export default App
