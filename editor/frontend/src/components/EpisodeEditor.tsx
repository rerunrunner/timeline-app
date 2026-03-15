import React, { useState, useEffect } from 'react';
import { getTableData, updateRecord, deleteRecord, createRecord } from '../api/client';
import { Trash2 } from 'lucide-react';
import { EditorHeader, InlineEditableCell, DurationEditor } from './widgets';

const EpisodeEditor: React.FC = () => {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const episodesData = await getTableData('episode', searchTerm);
      setEpisodes(episodesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  const handleDelete = async (episodeId: string) => {
    if (!confirm('Are you sure you want to delete this episode?')) {
      return;
    }

    try {
      setDeletingId(episodeId);
      await deleteRecord('episode', episodeId);
      await fetchData();
    } catch (err) {
      alert('Failed to delete episode: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async () => {
    try {
      // Find the latest episode number
      const latestEpisode = episodes.length > 0 
        ? episodes.reduce((latest, current) => 
            (current.number > latest.number ? current : latest), episodes[0])
        : null;
      
      const nextNumber = latestEpisode ? latestEpisode.number + 1 : 1;
      
      // Create new episode with defaults
      const newEpisode = {
        number: nextNumber,
        title: 'name me',
        duration: 0
      };
      
      const createdEpisode = await createRecord('episode', newEpisode);
      
      // Refresh the data to show the new episode
      await fetchData();
    } catch (err) {
      alert('Failed to create episode: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleInlineUpdate = async (columnName: string, value: any, recordId: string | number) => {
    try {
      // Find the current record
      const currentRecord = episodes.find(episode => episode.id === recordId);
      if (!currentRecord) {
        throw new Error('Episode not found');
      }
      
      // Create updated record with only the fields we want to update
      const updatedRecord = {
        id: currentRecord.id,
        number: currentRecord.number,
        title: currentRecord.title,
        duration: currentRecord.duration,
        [columnName]: value
      };
      
      await updateRecord('episode', String(recordId), updatedRecord);
      
      // Update local data immediately for better UX
      setEpisodes(prevData => 
        prevData.map(episode => 
          episode.id === recordId 
            ? updatedRecord
            : episode
        )
      );
    } catch (error) {
      throw error; // Re-throw to let InlineEditableCell handle it
    }
  };

  return (
    <div className="space-y-6">
      <EditorHeader
        title="Episodes"
        subtitle={`${episodes.length} episode${episodes.length !== 1 ? 's' : ''}`}
        onAddClick={handleCreate}
        addButtonText="Add Episode"
        searchConfig={{
          placeholder: "Search episodes...",
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
      ) : episodes.length === 0 ? (
        <div className="p-8 text-center text-gray-600">
          <p>No episodes found</p>
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
                <th style={{ width: '15%' }}>Number</th>
                <th style={{ width: '50%' }}>Title</th>
                <th style={{ width: '30%' }}>Duration</th>
                <th style={{ width: '5%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {episodes.map((episode) => (
                <tr key={episode.id}>
                  <InlineEditableCell
                    value={episode.number}
                    column={{ name: 'number', type: 'INTEGER', not_null: true, primary_key: false }}
                    recordId={episode.id}
                    onSave={handleInlineUpdate}
                  />
                  <InlineEditableCell
                    value={episode.title}
                    column={{ name: 'title', type: 'VARCHAR', not_null: true, primary_key: false }}
                    recordId={episode.id}
                    onSave={handleInlineUpdate}
                  />
                  <DurationEditor
                    value={episode.duration}
                    onSave={async (seconds) => {
                      await handleInlineUpdate('duration', seconds, episode.id);
                    }}
                  />
                  <td>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDelete(episode.id)}
                        disabled={deletingId === episode.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="Delete episode"
                      >
                        {deletingId === episode.id ? (
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

export default EpisodeEditor;
