import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';

interface CardEditorProps {
  onDelete?: () => void;
  children: React.ReactNode;
  headerFields?: React.ReactNode;
  className?: string;
  'data-event-id'?: string;
}

export const CardEditor: React.FC<CardEditorProps> = ({
  onDelete,
  children,
  headerFields,
  className = '',
  'data-event-id': dataEventId
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`card-editor ${className}`} data-event-id={dataEventId}>
      <div className="card-editor-header" onClick={toggleExpanded}>
        <div className="card-editor-header-left">
          <button
            className="card-editor-toggle"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
            type="button"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {headerFields && (
            <div className="card-editor-header-fields">
              {headerFields}
            </div>
          )}
        </div>
        
        {onDelete && (
          <div className="card-editor-actions">
            <button
              className="card-editor-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              type="button"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
      
      {isExpanded && (
        <div className="card-editor-content">
          {children}
        </div>
      )}
    </div>
  );
};
