import { useEffect, useMemo, useState } from 'react';
import {
  getAvailableLanguages,
  getDefaultLanguageCode,
} from '../../../utils/hydrate/localize';
import type { RawLanguage } from '../../../utils/hydrate/types';
import type { DatasetFile } from '../types';

function readLanguageFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('lang');
  if (raw == null || raw === '') return null;
  return raw;
}

type UseLanguageSelectionResult = {
  availableLanguages: RawLanguage[];
  defaultLanguageCode: string;
  selectedLanguageCode: string;
  setSelectedLanguageCode: (code: string) => void;
};

/**
 * Derives available languages and default language from the current dataset,
 * and tracks the selected language code. Initial selection honors `?lang=` if
 * present and valid, otherwise falls back to the dataset's default.
 */
export function useLanguageSelection(
  currentDataFile: DatasetFile | undefined
): UseLanguageSelectionResult {
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>('');

  const availableLanguages = useMemo(
    () => getAvailableLanguages(currentDataFile?.data),
    [currentDataFile]
  );
  const defaultLanguageCode = useMemo(
    () => getDefaultLanguageCode(currentDataFile?.data),
    [currentDataFile]
  );

  useEffect(() => {
    if (!currentDataFile) return;

    setSelectedLanguageCode(currentLanguageCode => {
      if (
        currentLanguageCode &&
        availableLanguages.some(language => language.code === currentLanguageCode)
      ) {
        return currentLanguageCode;
      }

      const languageFromUrl = readLanguageFromUrl();
      if (
        languageFromUrl &&
        availableLanguages.some(language => language.code === languageFromUrl)
      ) {
        return languageFromUrl;
      }

      return defaultLanguageCode;
    });
  }, [availableLanguages, currentDataFile, defaultLanguageCode]);

  return {
    availableLanguages,
    defaultLanguageCode,
    selectedLanguageCode,
    setSelectedLanguageCode,
  };
}
