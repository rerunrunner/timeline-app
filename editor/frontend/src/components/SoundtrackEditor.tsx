import React, { useState, useEffect } from 'react';
import { getTableData, updateRecord, deleteRecord } from '../api/client';
import { Trash2, ExternalLink } from 'lucide-react';
import { EditorHeader, InlineEditableCell } from './widgets';
import SoundtrackCreationModal from './SoundtrackCreationModal';

const SoundtrackEditor: React.FC = () => {
  const [soundtracks, setSoundtracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nextPosition, setNextPosition] = useState(0);
  const [sortBy, setSortBy] = useState<'position' | 'title'>('position');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const soundtracksData = await getTableData('soundtrack', searchTerm);
      setSoundtracks(soundtracksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  const handleDelete = async (soundtrackId: string) => {
    if (!confirm('Are you sure you want to delete this soundtrack?')) {
      return;
    }

    try {
      setDeletingId(soundtrackId);
      await deleteRecord('soundtrack', soundtrackId);
      await fetchData();
    } catch (err) {
      alert('Failed to delete soundtrack: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = () => {
    // Calculate next position (highest position + 10)
    const maxPosition = soundtracks.length > 0 
      ? Math.max(...soundtracks.map(s => s.position || 0))
      : 0;
    setShowCreateModal(true);
    setNextPosition(maxPosition + 10);
  };

  const handleCreateSuccess = () => {
    fetchData(); // Refresh the data
  };

  const handleInlineUpdate = async (columnName: string, value: any, recordId: string | number) => {
    try {
      // Find the current record
      const currentRecord = soundtracks.find(soundtrack => soundtrack.id === recordId);
      if (!currentRecord) {
        throw new Error('Soundtrack not found');
      }
      
      // Create updated record with only the fields we want to update
      const updatedRecord = {
        id: currentRecord.id,
        position: currentRecord.position,
        title: currentRecord.title,
        youtubeLink: currentRecord.youtubeLink,
        [columnName]: value
      };
      
      await updateRecord('soundtrack', String(recordId), updatedRecord);
      
      // Update local data immediately for better UX
      setSoundtracks(prevData => 
        prevData.map(soundtrack => 
          soundtrack.id === recordId 
            ? updatedRecord
            : soundtrack
        )
      );
    } catch (error) {
      throw error; // Re-throw to let InlineEditableCell handle it
    }
  };

  const openYouTubeLink = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleSort = (column: 'position' | 'title') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const sortedSoundtracks = [...soundtracks].sort((a, b) => {
    if (sortBy === 'position') {
      const aPos = a.position || 0;
      const bPos = b.position || 0;
      return sortOrder === 'asc' ? aPos - bPos : bPos - aPos;
    } else {
      const aTitle = a.title || '';
      const bTitle = b.title || '';
      return sortOrder === 'asc' 
        ? aTitle.localeCompare(bTitle)
        : bTitle.localeCompare(aTitle);
    }
  });

  const getDisplayPosition = (soundtrack: any) => {
    // Always calculate rank based on database position values, regardless of current sort
    const sortedByPosition = [...soundtracks].sort((a, b) => {
      const aPos = a.position || 0;
      const bPos = b.position || 0;
      return aPos - bPos; // Always ascending for ranking
    });
    return sortedByPosition.findIndex(s => s.id === soundtrack.id) + 1;
  };

  const handleDragStart = (e: React.DragEvent, soundtrackId: number) => {
    setDraggedId(soundtrackId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, soundtrackId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(soundtrackId);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    try {
      // Calculate new positions
      const sortedByPosition = [...soundtracks].sort((a, b) => (a.position || 0) - (b.position || 0));
      const draggedIndex = sortedByPosition.findIndex(s => s.id === draggedId);
      const targetIndex = sortedByPosition.findIndex(s => s.id === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return;

      // Create new position array
      const newPositions = [...sortedByPosition];
      const [draggedItem] = newPositions.splice(draggedIndex, 1);
      newPositions.splice(targetIndex, 0, draggedItem);

      // Calculate new fractional positions
      const reorderRequests = newPositions.map((soundtrack, index) => ({
        id: soundtrack.id,
        position: (index + 1) * 10.0 // Simple spacing of 10 units
      }));

      // Call reorder API
      await fetch('http://localhost:5001/api/tables/soundtrack/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reorderRequests),
      });

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Failed to reorder soundtracks:', error);
      alert('Failed to reorder soundtracks');
    } finally {
      setDraggedId(null);
      setDragOverId(null);
    }
  };

  return (
    <div className="space-y-6">
      <EditorHeader
        title="Soundtracks"
        subtitle={`${soundtracks.length} soundtrack${soundtracks.length !== 1 ? 's' : ''}`}
        onAddClick={handleCreate}
        addButtonText="Add Soundtrack"
        searchConfig={{
          placeholder: "Search soundtracks...",
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
      ) : soundtracks.length === 0 ? (
        <div className="p-8 text-center text-gray-600">
          <p>No soundtracks found</p>
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
                <th 
                  style={{ width: '10%' }} 
                  className="cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('position')}
                >
                  Position {sortBy === 'position' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  style={{ width: '30%' }} 
                  className="cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('title')}
                >
                  Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ width: '55%' }}>YouTube Link</th>
                <th style={{ width: '5%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedSoundtracks.map((soundtrack, index) => (
                <tr 
                  key={soundtrack.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, soundtrack.id)}
                  onDragOver={(e) => handleDragOver(e, soundtrack.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, soundtrack.id)}
                  className={`cursor-move ${draggedId === soundtrack.id ? 'opacity-50' : ''} ${dragOverId === soundtrack.id ? 'bg-blue-100' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getDisplayPosition(soundtrack)}
                  </td>
                  <InlineEditableCell
                    value={soundtrack.title}
                    column={{ name: 'title', type: 'VARCHAR', not_null: true, primary_key: false }}
                    recordId={soundtrack.id}
                    onSave={handleInlineUpdate}
                  />
                  <InlineEditableCell
                    value={soundtrack.youtubeLink}
                    column={{ name: 'youtubeLink', type: 'VARCHAR', not_null: false, primary_key: false }}
                    recordId={soundtrack.id}
                    onSave={handleInlineUpdate}
                  />
                  <td>
                    <div className="flex space-x-2">
                      {soundtrack.youtubeLink && (
                        <button
                          onClick={() => openYouTubeLink(soundtrack.youtubeLink)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Open YouTube link"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(soundtrack.id)}
                        disabled={deletingId === soundtrack.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="Delete soundtrack"
                      >
                        {deletingId === soundtrack.id ? (
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
      
      <SoundtrackCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
        nextPosition={nextPosition}
      />
    </div>
  );
};

export default SoundtrackEditor;
