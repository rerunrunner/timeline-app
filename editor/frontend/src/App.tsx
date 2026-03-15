import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams } from 'react-router-dom';
import { SchemaProvider, useSchema } from './contexts/SchemaContext';
import EventEditorCards from './components/EventEditorCards';
import NoteEditorCards from './components/NoteEditorCards';
import EpisodeEditor from './components/EpisodeEditor';
import EventTypeEditor from './components/EventTypeEditor';
import TagEditor from './components/TagEditor';
import SoundtrackEditor from './components/SoundtrackEditor';
import TimelineEditor from './components/TimelineEditor';
import TimelineSliceEditor from './components/TimelineSliceEditor';
import DatasetMetadataDisplay from './components/DatasetMetadataDisplay';
import { Database, Table } from 'lucide-react';
import './styles/app.css';

const Sidebar: React.FC = () => {
  const { schema, loading } = useSchema();

  if (loading) {
    return (
      <div className="sidebar flex flex-col h-full">
        <div className="flex items-center space-x-2 mb-6">
          <Database className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900">Timeline Editor</h1>
        </div>
        <div className="animate-pulse flex-1">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
        <DatasetMetadataDisplay />
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="sidebar flex flex-col h-full">
        <div className="flex items-center space-x-2 mb-6">
          <Database className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900">Timeline Editor</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-600">Failed to load schema</p>
        </div>
        <DatasetMetadataDisplay />
      </div>
    );
  }

  // Only show specific editors in the sidebar
  const allowedTables = [
    'episode',
    'event_type', 
    'tag',
    'soundtrack',
    'timeline',
    'timeline_slice',
    'event',
    'note'
  ];

  return (
    <div className="sidebar flex flex-col h-full">
      <div className="flex items-center space-x-2 mb-6">
        <Database className="h-6 w-6 text-blue-600" />
        <h1 className="text-xl font-semibold text-gray-900">Timeline Editor</h1>
      </div>
      
      <nav className="space-y-1 flex-1">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
          Editors
        </h2>
        {allowedTables.map((tableName) => (
          <Link
            key={tableName}
            to={`/table/${tableName}`}
            className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Table className="h-4 w-4" />
            <span className="capitalize">{tableName.replace(/_/g, ' ')}</span>
          </Link>
        ))}
      </nav>
      
      <DatasetMetadataDisplay />
    </div>
  );
};

const TableRoute: React.FC = () => {
  const { tableName } = useParams<{ tableName: string }>();
  
  if (!tableName) {
    return <div>Table not found</div>;
  }

  // Use specialized editors for specific tables
  switch (tableName) {
    case 'event':
      return <EventEditorCards />;
    case 'note':
      return <NoteEditorCards />;
    case 'episode':
      return <EpisodeEditor />;
    case 'event_type':
      return <EventTypeEditor />;
    case 'tag':
      return <TagEditor />;
    case 'soundtrack':
      return <SoundtrackEditor />;
    case 'timeline':
      return <TimelineEditor />;
    case 'timeline_slice':
      return <TimelineSliceEditor />;
    default:
      return <div className="p-8 text-center text-gray-600">
        <p>No specialized editor available for "{tableName}"</p>
        <p className="text-sm mt-2">This table is not supported in the current version.</p>
      </div>;
  }
};

const AppContent: React.FC = () => {
  const { error } = useSchema();

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Make sure the backend server is running on port 5000.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={
            <div className="text-center py-12">
              <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to Timeline Editor</h2>
              <p className="text-gray-600">Select a table from the sidebar to start editing.</p>
            </div>
          } />
          <Route path="/table/:tableName" element={<TableRoute />} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <SchemaProvider>
      <Router>
        <AppContent />
      </Router>
    </SchemaProvider>
  );
};

export default App;
