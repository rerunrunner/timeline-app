import React, { useState, useEffect } from 'react';
import { getTableData, updateRecord, deleteRecord, createRecord } from '../api/client';
import { Trash2 } from 'lucide-react';
import { EditorHeader, InlineEditableCell } from './widgets';

const TimelineEditor: React.FC = () => {
  const [timelines, setTimelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const timelinesData = await getTableData('timeline', searchTerm);
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

  const handleDelete = async (timelineId: string) => {
    if (!confirm('Are you sure you want to delete this timeline?')) {
      return;
    }

    try {
      setDeletingId(timelineId);
      await deleteRecord('timeline', timelineId);
      await fetchData();
    } catch (err) {
      alert('Failed to delete timeline: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async () => {
    try {
      // Create a new timeline with default values
      const newTimeline = {
        shortId: `tl${timelines.length + 1}`,
        title: 'New Timeline'
      };
      
      const created = await createRecord('timeline', newTimeline);
      
      // Add to the list so it appears immediately
      setTimelines(prev => [...prev, created]);
    } catch (err) {
      alert('Failed to create timeline: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleInlineUpdate = async (columnName: string, value: any, recordId: string | number) => {
    try {
      // Find the current record
      const currentRecord = timelines.find(timeline => timeline.id === recordId);
      if (!currentRecord) {
        throw new Error('Timeline not found');
      }
      
      // Create updated record with only the fields we want to update
      const updatedRecord = {
        id: currentRecord.id,
        shortId: currentRecord.shortId,
        title: currentRecord.title,
        [columnName]: value
      };
      
      await updateRecord('timeline', String(recordId), updatedRecord);
      
      // Update local data immediately for better UX
      setTimelines(prevData => 
        prevData.map(timeline => 
          timeline.id === recordId 
            ? updatedRecord
            : timeline
        )
      );
    } catch (error) {
      throw error; // Re-throw to let InlineEditableCell handle it
    }
  };

  return (
    <div className="space-y-6">
      <EditorHeader
        title="Timelines"
        subtitle={`${timelines.length} timeline${timelines.length !== 1 ? 's' : ''}`}
        onAddClick={handleCreate}
        addButtonText="Add Timeline"
        searchConfig={{
          placeholder: "Search timelines...",
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
      ) : timelines.length === 0 ? (
        <div className="p-8 text-center text-gray-600">
          <p>No timelines found</p>
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
                <th style={{ width: '10%' }}>Short ID</th>
                <th style={{ width: '85%' }}>Title</th>
                <th style={{ width: '5%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {timelines.map((timeline) => (
                <tr key={timeline.id}>
                  <InlineEditableCell
                    value={timeline.shortId}
                    column={{ name: 'shortId', type: 'VARCHAR', not_null: true, primary_key: false }}
                    recordId={timeline.id}
                    onSave={handleInlineUpdate}
                  />
                  <InlineEditableCell
                    value={timeline.title}
                    column={{ name: 'title', type: 'VARCHAR', not_null: true, primary_key: false }}
                    recordId={timeline.id}
                    onSave={handleInlineUpdate}
                  />
                  <td>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDelete(timeline.id)}
                        disabled={deletingId === timeline.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="Delete timeline"
                      >
                        {deletingId === timeline.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TimelineEditor;
