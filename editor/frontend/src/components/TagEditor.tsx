import React, { useState, useEffect } from 'react';
import { getTableData, updateRecord, deleteRecord, createRecord } from '../api/client';
import { Trash2 } from 'lucide-react';
import { EditorHeader, InlineEditableCell } from './widgets';

const TagEditor: React.FC = () => {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const tagsData = await getTableData('tag', searchTerm);
      setTags(tagsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  const handleDelete = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) {
      return;
    }

    try {
      setDeletingId(tagId);
      await deleteRecord('tag', tagId);
      await fetchData();
    } catch (err) {
      alert('Failed to delete tag: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async () => {
    try {
      // Create new tag with default name
      const newTag = {
        tag: 'name me'
      };
      
      await createRecord('tag', newTag);
      
      // Refresh the data to show the new tag
      await fetchData();
    } catch (err) {
      alert('Failed to create tag: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleInlineUpdate = async (columnName: string, value: any, recordId: string | number) => {
    try {
      // Find the current record
      const currentRecord = tags.find(tag => tag.id === recordId);
      if (!currentRecord) {
        throw new Error('Tag not found');
      }
      
      // Create updated record with only the fields we want to update
      const updatedRecord = {
        id: currentRecord.id,
        tag: currentRecord.tag,
        [columnName]: value
      };
      
      await updateRecord('tag', String(recordId), updatedRecord);
      
      // Update local data immediately for better UX
      setTags(prevData => 
        prevData.map(tag => 
          tag.id === recordId 
            ? updatedRecord
            : tag
        )
      );
    } catch (error) {
      throw error; // Re-throw to let InlineEditableCell handle it
    }
  };

  return (
    <div className="space-y-6">
      <EditorHeader
        title="Tags"
        subtitle={`${tags.length} tag${tags.length !== 1 ? 's' : ''}`}
        onAddClick={handleCreate}
        addButtonText="Add Tag"
        searchConfig={{
          placeholder: "Search tags...",
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
      ) : tags.length === 0 ? (
        <div className="p-8 text-center text-gray-600">
          <p>No tags found</p>
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
                <th style={{ width: '95%' }}>Tag</th>
                <th style={{ width: '5%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.id}>
                  <InlineEditableCell
                    value={tag.tag}
                    column={{ name: 'tag', type: 'VARCHAR', not_null: true, primary_key: false }}
                    recordId={tag.id}
                    onSave={handleInlineUpdate}
                  />
                  <td>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDelete(tag.id)}
                        disabled={deletingId === tag.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="Delete tag"
                      >
                        {deletingId === tag.id ? (
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

export default TagEditor;
