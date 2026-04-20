import { useCallback, useEffect, useMemo, useState } from 'react'
import DesktopRoot from './features/desktop/DesktopRoot'
import { usePlatform } from './features/desktop/hooks/usePlatform'
import {
  useDatasetFiles,
  useEditorRefreshSocket,
  useLanguageSelection,
  useLocalizedTimelines,
  useSessionAnalytics,
  useUrlSync,
} from './features/shared'
import './App.css'

/**
 * App is intentionally a thin shell. It:
 *   - owns cross-cutting state via shared hooks (datasets, language, timelines,
 *     URL sync, session analytics)
 *   - detects the platform
 *   - hands the shared state to a feature "root" component
 *
 * Renderer selection is centralized in `selectRoot()` below so a future
 * MobileRoot can be wired in with a single switch. Until that renderer
 * exists and is validated, every platform (computer, tablet, mobile) is
 * routed to `DesktopRoot` — this preparation phase must not change live
 * behavior.
 */
function App() {
  const { platform, orientation, isCompactLandscape } = usePlatform()

  const {
    dataFiles,
    selectedDataFile,
    isLoading: isLoadingDatasets,
    refresh,
  } = useDatasetFiles()

  useEditorRefreshSocket(refresh)

  const currentDataFile = useMemo(
    () => dataFiles.find(df => df.id === selectedDataFile),
    [dataFiles, selectedDataFile]
  )

  const {
    availableLanguages,
    defaultLanguageCode,
    selectedLanguageCode,
    setSelectedLanguageCode,
  } = useLanguageSelection(currentDataFile)

  const [currentTime, setCurrentTime] = useState<number>(0)
  const resetPlayhead = useCallback(() => setCurrentTime(0), [])

  const { itimelines, totalDuration } = useLocalizedTimelines({
    dataFiles,
    selectedDataFile,
    selectedLanguageCode,
    onDatasetSwitch: resetPlayhead,
  })

  useUrlSync({
    currentTime,
    totalDuration,
    timelinesReady: itimelines.length > 0,
    selectedLanguageCode,
    defaultLanguageCode,
    setCurrentTime,
  })

  useSessionAnalytics({
    selectedDataFile,
    timelinesReady: itimelines.length > 0,
    selectedLanguageCode,
  })

  useEffect(() => {
    if (currentDataFile?.data.metadata?.name) {
      document.title = currentDataFile.data.metadata.name
    } else {
      document.title = 'Timeline Viewer'
    }
  }, [currentDataFile])

  // For now every platform renders DesktopRoot. When MobileRoot exists,
  // change this to `platform === 'mobile' ? <MobileRoot .../> : <DesktopRoot .../>`
  // — `tablet` intentionally stays on DesktopRoot.
  return (
    <DesktopRoot
      timelines={itimelines}
      currentTime={currentTime}
      onTimeChange={setCurrentTime}
      totalDuration={totalDuration}
      episodes={currentDataFile?.data.episodes}
      datasetId={selectedDataFile}
      platform={platform}
      orientation={orientation}
      compactLandscape={isCompactLandscape}
      availableLanguages={availableLanguages}
      selectedLanguageCode={selectedLanguageCode}
      onLanguageChange={setSelectedLanguageCode}
      isLoadingDatasets={isLoadingDatasets}
      hasDatasets={dataFiles.length > 0}
    />
  )
}

export default App
