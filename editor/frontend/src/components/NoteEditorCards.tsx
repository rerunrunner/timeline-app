import React, { useState, useEffect } from 'react';
import { EditorHeader, CardEditor, CardField, TextArea } from './widgets';
import { getTableData, updateRecord, deleteRecord } from '../api/client';
import NoteCreationModal from './NoteCreationModal';

interface Note {
  id: number;
  title: string;
  contextEventId: number | null;
  body: string;
}

interface Event {
  id: number;
  shortDescription: string;
}



const NoteEditorCards: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [notesData, eventsData] = await Promise.all([
        getTableData('note'),
        getTableData('event')
      ]);

      // Ensure we have arrays
      setNotes(Array.isArray(notesData) ? notesData : []);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please check if the backend server is running.');
      // Set empty arrays on error to prevent crashes
      setNotes([]);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const eventsForDropdown = events.map(event => ({
    value: event.id,
    label: event.shortDescription
  }));


  const filteredNotes = !searchTerm ? notes : notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFieldUpdate = async (field: string, value: string | number | null, noteId: number) => {
    try {
      const updatedNote = notes.find(note => note.id === noteId);
      if (!updatedNote) return;

      const updatedData = { ...updatedNote, [field]: value };
      
      await updateRecord('note', noteId.toString(), updatedData);
      
      setNotes(prevNotes =>
        prevNotes.map(note =>
          note.id === noteId ? { ...note, [field]: value } : note
        )
      );
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleDelete = async (noteId: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await deleteRecord('note', noteId.toString());
      setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleCreate = () => {
    setShowCreateModal(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div>
        <EditorHeader 
          title="Notes" 
          subtitle="Error"
          onAddClick={() => {}} 
        />
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EditorHeader 
        title="Notes" 
        subtitle={`${filteredNotes.length} notes`}
        onAddClick={handleCreate}
        searchConfig={{
          placeholder: "Search notes...",
          value: searchTerm,
          onChange: setSearchTerm
        }}
      />
      
      <div className="card-editor-container">
        {filteredNotes.map(note => (
          <CardEditor
            key={note.id}
            onDelete={() => handleDelete(note.id)}
            headerFields={
              <>
                <CardField
                  label="Title"
                  value={note.title}
                  onChange={(value) => handleFieldUpdate('title', value, note.id)}
                  className="flex-1"
                />
                <CardField
                  label="Context Event"
                  value={note.contextEventId}
                  type="select"
                  options={eventsForDropdown}
                  onChange={(value) => handleFieldUpdate('contextEventId', value || null, note.id)}
                  className="flex-1"
                />
              </>
            }
          >
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Body
              </label>
              <TextArea
                value={note.body}
                onChange={(value) => handleFieldUpdate('body', value, note.id)}
                placeholder="Note content..."
                rows={8}
              />
            </div>
          </CardEditor>
        ))}
      </div>

      <NoteCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(newNote) => {
          setNotes(prevNotes => [...prevNotes, newNote]);
          setShowCreateModal(false);
        }}
        events={events}
      />
    </div>
  );
};

export default NoteEditorCards;
