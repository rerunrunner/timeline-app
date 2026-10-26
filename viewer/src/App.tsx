import { useCallback, useEffect, useMemo, useState } from 'react'
import DesktopRoot from './features/desktop/DesktopRoot'
import { usePlatform } from './features/desktop/hooks/usePlatform'
import { MobileRoot } from './features/mobile'
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
 * Renderer selection lives here so UI routing and shared state have one
 * source of truth. Phones use MobileRoot; tablets and computers retain
 * DesktopRoot.
 */
function App() {
  const { platform, orientation, isCompactLandscape } = usePlatform()
  const uiVersion = platform === 'mobile' ? 'mobile_v1' : 'desktop_v1'
  const hasTimeDeepLink = useMemo(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('t'),
    []
  )

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

  const [currentTime, setCurrentTime] = useState<number>(1780)
  const resetPlayhead = useCallback(() => setCurrentTime(1780), [])

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
    uiVersion,
  })

  useEffect(() => {
    if (currentDataFile?.data.metadata?.name) {
      document.title = currentDataFile.data.metadata.name
    } else {
      document.title = 'Timeline Viewer'
    }
  }, [currentDataFile])

  useEffect(() => {
    document.documentElement.classList.toggle(
      'mobile-viewer-page',
      platform === 'mobile'
    )
    return () => document.documentElement.classList.remove('mobile-viewer-page')
  }, [platform])

  if (platform === 'mobile') {
    return (
      <MobileRoot
        timelines={itimelines}
        currentTime={currentTime}
        hasTimeDeepLink={hasTimeDeepLink}
        onTimeChange={setCurrentTime}
        totalDuration={totalDuration}
        episodes={currentDataFile?.data.episodes}
        datasetId={selectedDataFile}
        platform="mobile"
        availableLanguages={availableLanguages}
        selectedLanguageCode={selectedLanguageCode}
        onLanguageChange={setSelectedLanguageCode}
        isLoadingDatasets={isLoadingDatasets}
        hasDatasets={dataFiles.length > 0}
      />
    )
  }

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
