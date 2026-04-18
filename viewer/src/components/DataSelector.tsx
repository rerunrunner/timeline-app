import React from 'react';

export interface LanguageOption {
  code: string;
  name: string;
  isDefault?: boolean;
}

interface DataSelectorProps {
  selectedLanguageCode: string;
  onLanguageChange: (languageCode: string) => void;
  languages: LanguageOption[];
}

const DataSelector: React.FC<DataSelectorProps> = ({ selectedLanguageCode, onLanguageChange, languages }) => {
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
            {language.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DataSelector; 