import React, { useState, useEffect } from 'react';
import { getTableData, updateRecord, deleteRecord, createRecord } from '../api/client';
import { Trash2 } from 'lucide-react';
import { EditorHeader, InlineEditableCell } from './widgets';

const EventTypeEditor: React.FC = () => {
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const eventTypesData = await getTableData('event_type', searchTerm);
      setEventTypes(eventTypesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  const handleDelete = async (eventTypeId: string) => {
    if (!confirm('Are you sure you want to delete this event type?')) {
      return;
    }

    try {
      setDeletingId(eventTypeId);
      await deleteRecord('event_type', eventTypeId);
      await fetchData();
    } catch (err) {
      alert('Failed to delete event type: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async () => {
    try {
      // Create new event type with default name
      const newEventType = {
        type: 'name me'
      };
      
      const createdEventType = await createRecord('event_type', newEventType);
      
      // Refresh the data to show the new event type
      await fetchData();
    } catch (err) {
      alert('Failed to create event type: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleInlineUpdate = async (columnName: string, value: any, recordId: string | number) => {
    try {
      // Find the current record
      const currentRecord = eventTypes.find(eventType => eventType.id === recordId);
      if (!currentRecord) {
        throw new Error('Event type not found');
      }
      
      // Create updated record with only the fields we want to update
      const updatedRecord = {
        id: currentRecord.id,
        type: currentRecord.type,
        [columnName]: value
      };
      
      await updateRecord('event_type', String(recordId), updatedRecord);
      
      // Update local data immediately for better UX
      setEventTypes(prevData => 
        prevData.map(eventType => 
          eventType.id === recordId 
            ? updatedRecord
            : eventType
        )
      );
    } catch (error) {
      throw error; // Re-throw to let InlineEditableCell handle it
    }
  };

  return (
    <div className="space-y-6">
      <EditorHeader
        title="Event Types"
        subtitle={`${eventTypes.length} event type${eventTypes.length !== 1 ? 's' : ''}`}
        onAddClick={handleCreate}
        addButtonText="Add Event Type"
        searchConfig={{
          placeholder: "Search event types...",
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
      ) : eventTypes.length === 0 ? (
        <div className="p-8 text-center text-gray-600">
          <p>No event types found</p>
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
                <th style={{ width: '95%' }}>Type</th>
                <th style={{ width: '5%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {eventTypes.map((eventType) => (
                <tr key={eventType.id}>
                  <InlineEditableCell
                    value={eventType.type}
                    column={{ name: 'type', type: 'VARCHAR', not_null: true, primary_key: false }}
                    recordId={eventType.id}
                    onSave={handleInlineUpdate}
                  />
                  <td>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDelete(eventType.id)}
                        disabled={deletingId === eventType.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="Delete event type"
                      >
                        {deletingId === eventType.id ? (
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

export default EventTypeEditor;
