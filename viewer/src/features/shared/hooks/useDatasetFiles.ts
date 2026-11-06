import { useCallback, useEffect, useState } from 'react';
import { usePostHog } from '@posthog/react';
import { isPosthogActive } from '../../../utils/posthogEnabled';
import type { DatasetFile } from '../types';

type UseDatasetFilesResult = {
  dataFiles: DatasetFile[];
  selectedDataFile: string;
  setSelectedDataFile: (id: string) => void;
  isLoading: boolean;
  refresh: () => void;
};

/**
 * Discovers available datasets at runtime.
 *
 * - In dev: fetches from the editor API (configurable via `VITE_EDITOR_API_URL`)
 *   so changes surface without re-export.
 * - In prod: loads the packaged `dataset.json` from `BASE_URL`.
 *
 * `refresh()` re-runs discovery, used by editor live-refresh wiring.
 */
export function useDatasetFiles(): UseDatasetFilesResult {
  const [dataFiles, setDataFiles] = useState<DatasetFile[]>([]);
  const [selectedDataFile, setSelectedDataFile] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const posthog = usePostHog();
  const analyticsEnabled = isPosthogActive;

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    const loadDataFiles = async () => {
      try {
        setIsLoading(true);
        const discoveredFiles: DatasetFile[] = [];
      let failureReason = 'no_dataset_found';

        if (import.meta.env.DEV) {
          const apiUrl =
            import.meta.env.VITE_EDITOR_API_URL ?? 'http://localhost:5001/api/export/dataset';
          try {
            const res = await fetch(apiUrl);
            if (res.ok) {
              const data = await res.json();
              if (data?.metadata) {
                const filename =
                  data.metadata.filename ??
                  `${data.metadata.id}.${data.metadata.version ?? 'dev'}.json`;
                discoveredFiles.push({
                  id: data.metadata.id,
                  name: data.metadata.name,
                  description: data.metadata.description ?? '',
                  filename,
                  data: { ...data, metadata: { ...data.metadata, filename } },
                });
              }
            } else {
              failureReason = `http_${res.status}`;
              console.warn(
                `[viewer] Editor export failed: HTTP ${res.status} ${res.statusText} (${apiUrl}). Is the backend on port 5001?`
              );
            }
          } catch (err) {
            failureReason = 'network_error';
            console.warn(
              `[viewer] Could not reach editor export (${apiUrl}). CORS, wrong URL, or backend not running.`,
              err
            );
          }
        }

        if (!import.meta.env.DEV && discoveredFiles.length === 0) {
          try {
            const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
            const res = await fetch(`${base}/dataset.json`);
            if (res.ok) {
              const data = await res.json();
              if (data?.metadata) {
                const filename =
                  data.metadata.filename ??
                  `${data.metadata.id}.${data.metadata.version ?? 'dev'}.json`;
                discoveredFiles.push({
                  id: data.metadata.id,
                  name: data.metadata.name,
                  description: data.metadata.description ?? '',
                  filename,
                  data: { ...data, metadata: { ...data.metadata, filename } },
                });
              }
            } else {
              failureReason = `http_${res.status}`;
            }
          } catch {
            failureReason = 'network_error';
          }
        }

        if (cancelled) return;
        setDataFiles(discoveredFiles);
        if (discoveredFiles.length === 0 && analyticsEnabled) {
          posthog.capture('timeline_load_failed', {
            stage: 'dataset_discovery',
            reason: failureReason,
            environment: import.meta.env.DEV ? 'development' : 'production',
            path: typeof window !== 'undefined' ? window.location.pathname : undefined,
          });
        }
        if (discoveredFiles.length > 0) {
          setSelectedDataFile(discoveredFiles[0].id);
        }
      } catch (error) {
        console.error('Error loading data files:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadDataFiles();
    return () => {
      cancelled = true;
    };
  }, [analyticsEnabled, posthog, refreshKey]);

  return { dataFiles, selectedDataFile, setSelectedDataFile, isLoading, refresh };
}
