import React from 'react';
import type { Platform } from './hooks/usePlatform';

export interface LanguageOption {
  code: string;
  name: string;
  localizedName?: string;
  flagEmoji?: string | null;
  isDefault?: boolean;
}

interface DataSelectorProps {
  selectedLanguageCode: string;
  onLanguageChange: (languageCode: string) => void;
  languages: LanguageOption[];
  platform: Platform;
}

const DataSelector: React.FC<DataSelectorProps> = ({ selectedLanguageCode, onLanguageChange, languages, platform }) => {
  const formatLanguageLabel = (language: LanguageOption) => {
    if (platform === 'mobile') {
      return language.flagEmoji || language.code.toUpperCase();
    }
    const parts = [language.flagEmoji, language.localizedName || language.name].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : language.code;
  };

  return (
    <div className="data-selector">
      <label htmlFor="data-file-select" className="sr-only">
        Select Language
      </label>
      <select
        id="data-file-select"
        value={selectedLanguageCode}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {languages.map((language) => (
          <option key={language.code} value={language.code}>
            {formatLanguageLabel(language)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DataSelector; 