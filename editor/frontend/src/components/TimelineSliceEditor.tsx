import React, { useState, useEffect, useRef } from 'react';
import { getTableData, updateRecord, deleteRecord } from '../api/client';
import { Trash2, ChevronRight } from 'lucide-react';
import { EditorHeader, InlineEditableCell } from './widgets';

// Custom inline editable component for notes that doesn't return a <td>
const InlineEditableNotes: React.FC<{
  value: any;
  onSave: (value: any) => void;
  className?: string;
}> = ({ value, onSave, className = '' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isResizing, setIsResizing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleClick = () => {
    setIsEditing(true);
    setEditValue(value || '');
  };

  const calculateRows = (text: string) => {
    if (!text) return 3;
    const lines = text.split('\n').length;
    return Math.max(3, Math.min(lines, 10)); // Min 3 rows, max 10 rows
  };

  const handleSave = async () => {
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      // Revert on error
      setEditValue(value || '');
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
    // Let Enter create new lines naturally - don't prevent default
  };

  const handleBlur = () => {
    // Don't save if clicking on resize handle
    if (!isResizing) {
      handleSave();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startY = e.clientY;
    const startHeight = textareaRef.current?.offsetHeight || 60;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = Math.max(60, startHeight + (e.clientY - startY));
      if (textareaRef.current) {
        textareaRef.current.style.height = `${newHeight}px`;
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (isEditing) {
    return (
      <div className="relative">
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            autoFocus
            className={`w-full text-sm bg-transparent border border-blue-300 rounded p-2 resize-none ${className}`}
            rows={calculateRows(editValue)}
            style={{
              fontSize: '0.875rem',
              backgroundColor: 'white',
              minHeight: '60px'
            }}
          />
        <div 
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center text-blue-500 hover:text-blue-700 transition-colors"
          onMouseDown={handleMouseDown}
          title="Drag to resize"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" className="opacity-60">
            <path d="M0 8 L8 0 L8 8 Z" fill="currentColor"/>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer hover:bg-blue-50 transition-colors p-2 rounded min-h-[60px] ${className}`}
      style={{
        fontSize: '0.875rem',
        color: value ? '#111827' : '#9ca3af',
        fontStyle: value ? 'normal' : 'italic',
        whiteSpace: 'pre-wrap'
      }}
    >
      {value || 'Click to add notes...'}
    </div>
  );
};

const TimelineSliceEditor: React.FC = () => {
  const [timelineSlices, setTimelineSlices] = useState<any[]>([]);
  const [timelines, setTimelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [timelineSlicesData, timelinesData] = await Promise.all([
        getTableData('timeline_slice', searchTerm),
        getTableData('timeline')
      ]);
      
      setTimelineSlices(timelineSlicesData);
      setTimelines(timelinesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  const handleDelete = async (timelineSliceId: string) => {
    if (!confirm('Are you sure you want to delete this timeline slice?')) {
      return;
    }

    try {
      setDeletingId(timelineSliceId);
      await deleteRecord('timeline_slice', timelineSliceId);
      await fetchData();
    } catch (err) {
      alert('Failed to delete timeline slice: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = () => {
    // For now, we'll handle creation through a simple prompt
    // In the future, this could open a simple modal or inline form
    const shortDescription = prompt('Enter timeline slice description:');
    if (shortDescription) {
      // TODO: Implement timeline slice creation
      console.log('Create timeline slice with description:', shortDescription);
    }
  };

  const toggleRowExpansion = (sliceId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sliceId)) {
        newSet.delete(sliceId);
      } else {
        newSet.add(sliceId);
      }
      return newSet;
    });
  };

  const handleInlineUpdate = async (columnName: string, value: any, recordId: string | number) => {
    try {
      // Find the current record
      const currentRecord = timelineSlices.find(slice => slice.id === recordId);
      if (!currentRecord) {
        throw new Error('Timeline slice not found');
      }
      
      // Create updated record with only the fields we want to update
      const updatedRecord = {
        id: currentRecord.id,
        timelineId: currentRecord.timelineId,
        shortDescription: currentRecord.shortDescription,
        startTimestamp: currentRecord.startTimestamp,
        endTimestamp: currentRecord.endTimestamp,
        importance: currentRecord.importance,
        notes: currentRecord.notes,
        [columnName]: value
      };
      
      await updateRecord('timeline_slice', String(recordId), updatedRecord);
      
      // Update local data immediately for better UX
      setTimelineSlices(prevData => 
        prevData.map(slice => 
          slice.id === recordId 
            ? updatedRecord
            : slice
        )
      );
    } catch (error) {
      throw error; // Re-throw to let InlineEditableCell handle it
    }
  };


  const formatDate = (timestamp: string) => {
    if (!timestamp) return 'None';
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString();
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="space-y-6">
      <EditorHeader
        title="Timeline Slices"
        subtitle={`${timelineSlices.length} slice${timelineSlices.length !== 1 ? 's' : ''}`}
        onAddClick={handleCreate}
        addButtonText="Add Timeline Slice"
        searchConfig={{
          placeholder: "Search timeline slices...",
          value: searchTerm,
          onChange: setSearchTerm
        }}
      />

      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 text-blue-600 hover:text-blue-800"
          >
            Try again
          </button>
        </div>
      ) : timelineSlices.length === 0 ? (
        <div className="p-8 text-center text-gray-600">
          <p>No timeline slices found</p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="editable-table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Timeline</th>
                <th style={{ width: '25%' }}>Description</th>
                <th style={{ width: '15%' }}>Start Date</th>
                <th style={{ width: '15%' }}>End Date</th>
                <th style={{ width: '10%' }}>Importance</th>
                <th style={{ width: '15%' }}>Notes</th>
                <th style={{ width: '5%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {timelineSlices.map((slice) => (
                <React.Fragment key={slice.id}>
                  <tr>
                    <td>
                      <select
                        value={slice.timelineId || ''}
                        onChange={(e) => handleInlineUpdate('timelineId', e.target.value ? parseInt(e.target.value) : null, slice.id)}
                      >
                        <option value="">None</option>
                        {timelines.map(timeline => (
                          <option key={timeline.id} value={timeline.id}>
                            {timeline.shortId} - {timeline.title}
                          </option>
                        ))}
                      </select>
                    </td>
                    <InlineEditableCell
                      value={slice.shortDescription}
                      column={{ name: 'shortDescription', type: 'VARCHAR', not_null: true, primary_key: false }}
                      recordId={slice.id}
                      onSave={handleInlineUpdate}
                    />
                    <td>
                      <span className="text-sm text-gray-900">
                        {formatDate(slice.startTimestamp)}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-900">
                        {formatDate(slice.endTimestamp)}
                      </span>
                    </td>
                    <td>
                      <select
                        value={slice.importance || ''}
                        onChange={(e) => handleInlineUpdate('importance', e.target.value, slice.id)}
                      >
                        <option value="">None</option>
                        <option value="high">High</option>
                        <option value="low">Low</option>
                      </select>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleRowExpansion(slice.id)}
                          className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                          title={expandedRows.has(slice.id) ? "Collapse notes" : "Expand notes"}
                        >
                          <div className={`transition-transform duration-300 ease-in-out ${expandedRows.has(slice.id) ? 'rotate-90' : 'rotate-0'}`}>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </button>
                        <span 
                          className="text-sm text-gray-500 truncate cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => toggleRowExpansion(slice.id)}
                          title="Click to expand and edit notes"
                        >
                          {slice.notes ? (slice.notes.length > 30 ? slice.notes.substring(0, 30) + '...' : slice.notes) : 'No notes'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div >
                        <button
                          onClick={() => handleDelete(slice.id)}
                          disabled={deletingId === slice.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title="Delete timeline slice"
                        >
                          {deletingId === slice.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr className={`notes-expand-row ${expandedRows.has(slice.id) ? 'expanded' : 'collapsed'}`}>
                    <td colSpan={7} className="bg-gray-50">
                      <div className="notes-expand-content">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Notes
                        </label>
                        <InlineEditableNotes
                          value={slice.notes}
                          onSave={(value) => handleInlineUpdate('notes', value, slice.id)}
                        />
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TimelineSliceEditor;
