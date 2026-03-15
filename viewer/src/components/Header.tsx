import React from 'react'
import DataSelector from './DataSelector'
import type { DataFile } from './DataSelector'

interface HeaderProps {
  dataSelector?: React.ReactNode;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ dataSelector, title = 'Timeline Viewer' }) => {
  return (
    <header className="header flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-gray-500">A project for exploring nonlinear narratives</p>
      </div>
      <div className="flex items-center gap-4">
        {dataSelector && (
          <div className="data-selector-container">
            {dataSelector}
          </div>
        )}
      </div>
    </header>
  )
}

export default Header 