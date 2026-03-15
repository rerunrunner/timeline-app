import React from 'react';
import { Plus } from 'lucide-react';
import { SearchInput } from '.';

interface SortOption {
  value: string;
  label: string;
}

interface SortConfig {
  value: string;
  onChange: (value: string) => void;
  options: SortOption[];
  label?: string;
}

interface SearchConfig {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

interface FilterConfig {
  label: string;
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  options: Array<{ value: string | number | null; label: string }>;
}

interface EditorHeaderProps {
  title: string;
  subtitle: string;
  onAddClick: () => void;
  addButtonText?: string;
  className?: string;
  searchConfig?: SearchConfig;
  sortConfig?: SortConfig;
  filterConfigs?: FilterConfig[];
}

const EditorHeader: React.FC<EditorHeaderProps> = ({
  title,
  subtitle,
  onAddClick,
  addButtonText = "Add",
  className = "",
  searchConfig,
  sortConfig,
  filterConfigs
}) => {
  return (
    <div className="space-y-6">
      <div className={`flex justify-between items-center ${className}`}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600">{subtitle}</p>
        </div>
        <button
          onClick={onAddClick}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>{addButtonText}</span>
        </button>
      </div>
      
      {/* Search, Filter, and Sort Row */}
      {(searchConfig || sortConfig || filterConfigs) && (
        <div className="flex items-center gap-4">
          {searchConfig && (
            <div className="flex-1">
              <SearchInput
                placeholder={searchConfig.placeholder || "Search..."}
                value={searchConfig.value}
                onChange={searchConfig.onChange}
              />
            </div>
          )}
          
          {filterConfigs && filterConfigs.map((filterConfig, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <label 
                htmlFor={`filter-${idx}`}
                className="text-sm font-medium text-gray-700 whitespace-nowrap"
              >
                {filterConfig.label}
              </label>
              <select
                id={`filter-${idx}`}
                value={filterConfig.value === null ? '' : filterConfig.value}
                onChange={(e) => {
                  const value = e.target.value;
                  filterConfig.onChange(value === '' ? null : (isNaN(Number(value)) ? value : Number(value)));
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {filterConfig.options.map((option) => (
                  <option key={String(option.value)} value={option.value === null ? '' : option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          
          {sortConfig && (
            <div className="flex items-center gap-2">
              <label 
                htmlFor="sortBy" 
                className="text-sm font-medium text-gray-700 whitespace-nowrap"
              >
                {sortConfig.label || 'Sort by:'}
              </label>
              <select
                id="sortBy"
                value={sortConfig.value}
                onChange={(e) => sortConfig.onChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sortConfig.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EditorHeader;
