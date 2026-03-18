import { useState, useEffect, useRef } from 'react'
import SockJS from 'sockjs-client'
import { Stomp } from '@stomp/stompjs'
import { hydrate } from './utils/hydrate/index'
import type { ITimeline } from './types/interfaces'
import { ITimelineContainer } from './components/ITimeline/Container'
import Controller from './components/Controller'
import DataSelector, { type DataFile } from './components/DataSelector'
import './App.css'

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
  const [dataFiles, setDataFiles] = useState<(DataFile & { data: any })[]>([])
  const [selectedDataFile, setSelectedDataFile] = useState<string>('')
  const [itimelines, setITimelines] = useState<ITimeline[]>([])
  const [currentTime, setCurrentTime] = useState<number>(0) // Current playhead position in seconds
  const [totalDuration, setTotalDuration] = useState<number>(0) // Total duration in seconds
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const prevSelectedDataFileRef = useRef<string | null>(null)

  const loadDataFiles = async () => {
    try {
      setIsLoading(true)
      const discoveredFiles: (DataFile & { data: any })[] = []

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
          }
        } catch {
          // Editor not running; no bundled data — user must use editor or configure VITE_EDITOR_API_URL
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

  const loadDataFile = (dataFileId: string, preserveTime = false) => {
    try {
      const dataFile = dataFiles.find(df => df.id === dataFileId)
      if (!dataFile) {
        throw new Error(`Unknown data file: ${dataFileId}`)
      }

      const timelineData = dataFile.data
      
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
    if (!selectedDataFile || dataFiles.length === 0) return
    const isSwitchingFile = prevSelectedDataFileRef.current !== selectedDataFile
    prevSelectedDataFileRef.current = selectedDataFile
    loadDataFile(selectedDataFile, !isSwitchingFile)
  }, [selectedDataFile, dataFiles])

  // Update document title when data file changes
  useEffect(() => {
    const currentDataFile = dataFiles.find(df => df.id === selectedDataFile)
    if (currentDataFile?.data.metadata?.name) {
      document.title = currentDataFile.data.metadata.name
    } else {
      document.title = 'Timeline Viewer'
    }
  }, [selectedDataFile, dataFiles])

  const handleDataFileChange = (dataFileId: string) => {
    setSelectedDataFile(dataFileId)
  }

  const handleTimeChange = (newTime: number) => {
    setCurrentTime(newTime)
  }

  // Get current data file for episodes
  const currentDataFile = dataFiles.find(df => df.id === selectedDataFile)

  const dataSelector =
    isLoading ? (
      <div className="text-sm text-gray-500">Loading data files...</div>
    ) : dataFiles.length === 0 ? (
      <div className="text-sm text-amber-600">
        No dataset. Start the editor or set VITE_EDITOR_API_URL to the export endpoint.
      </div>
    ) : (
      <DataSelector
        dataFiles={dataFiles}
        selectedDataFile={selectedDataFile}
        onDataFileChange={handleDataFileChange}
      />
    )

  return (
    <div className="app">
      <ITimelineContainer
        timelines={itimelines}
        currentTime={currentTime}
        onTimeChange={handleTimeChange}
        episodes={currentDataFile?.data.episodes}
        dataSelector={dataSelector}
      />
      
      <Controller 
        onTimeChange={handleTimeChange} 
        currentTime={currentTime} 
        totalDuration={totalDuration}
        episodes={currentDataFile?.data.episodes}
        episodeLabel="Ep"
      />
    </div>
  )
}

export default App
