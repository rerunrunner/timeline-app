import React from 'react';

export interface DataFile {
  id: string;
  name: string;
  description: string;
  filename: string;
}

interface DataSelectorProps {
  selectedDataFile: string;
  onDataFileChange: (dataFileId: string) => void;
  dataFiles: DataFile[];
}

const DataSelector: React.FC<DataSelectorProps> = ({ selectedDataFile, onDataFileChange, dataFiles }) => {
  return (
    <div className="data-selector">
      <label htmlFor="data-file-select" className="sr-only">
        Select Data File
      </label>
      <select
        id="data-file-select"
        value={selectedDataFile}
        onChange={(e) => onDataFileChange(e.target.value)}
        className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {dataFiles.map((dataFile) => (
          <option key={dataFile.id} value={dataFile.id}>
            {dataFile.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DataSelector; 