import { useEffect, useRef, useState } from 'react';
import { hydrate } from '../../../utils/hydrate/index';
import { resolveLocalizedRawData } from '../../../utils/hydrate/localize';
import type { ITimeline } from '../../../types/interfaces';
import type { DatasetFile } from '../types';

type UseLocalizedTimelinesArgs = {
  dataFiles: DatasetFile[];
  selectedDataFile: string;
  selectedLanguageCode: string;
  /** Called synchronously when the selected dataset changes (not on refresh). */
  onDatasetSwitch?: () => void;
};

type UseLocalizedTimelinesResult = {
  itimelines: ITimeline[];
  totalDuration: number;
};

/**
 * Resolves the selected dataset in the selected language and hydrates it
 * into immutable `ITimeline` objects. Also exposes the total duration
 * computed from episodes.
 */
export function useLocalizedTimelines({
  dataFiles,
  selectedDataFile,
  selectedLanguageCode,
  onDatasetSwitch,
}: UseLocalizedTimelinesArgs): UseLocalizedTimelinesResult {
  const [itimelines, setITimelines] = useState<ITimeline[]>([]);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const prevSelectedDataFileRef = useRef<string | null>(null);

  const onDatasetSwitchRef = useRef(onDatasetSwitch);
  useEffect(() => {
    onDatasetSwitchRef.current = onDatasetSwitch;
  }, [onDatasetSwitch]);

  useEffect(() => {
    if (!selectedDataFile || dataFiles.length === 0 || !selectedLanguageCode) return;

    const dataFile = dataFiles.find(df => df.id === selectedDataFile);
    if (!dataFile) {
      console.error(`Unknown data file: ${selectedDataFile}`);
      return;
    }

    try {
      const isSwitchingFile = prevSelectedDataFileRef.current !== selectedDataFile;
      prevSelectedDataFileRef.current = selectedDataFile;

      const timelineData = resolveLocalizedRawData(dataFile.data, selectedLanguageCode);

      if (!Array.isArray(timelineData.timelines)) {
        throw new Error('Timelines is not an array');
      }

      setITimelines(hydrate(timelineData));

      const duration =
        timelineData.episodes?.reduce(
          (sum: number, episode: { duration: number }) => sum + episode.duration,
          0
        ) ?? 300;
      setTotalDuration(duration);

      if (isSwitchingFile) {
        onDatasetSwitchRef.current?.();
      }
    } catch (error) {
      console.error('Error loading timeline data:', error);
    }
  }, [selectedDataFile, dataFiles, selectedLanguageCode]);

  return { itimelines, totalDuration };
}
