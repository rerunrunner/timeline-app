import React, { useState, useEffect } from 'react';
import { Info, Download, Settings, Cog } from 'lucide-react';
import api from '../api/client';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import MetadataEditModal from './MetadataEditModal';
import SettingsModal from './SettingsModal';

interface DatasetMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
}

const DatasetMetadataDisplay: React.FC = () => {
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [includeImages, setIncludeImages] = useState(false);
  const [exportToFilesystem, setExportToFilesystem] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [exportPath, setExportPath] = useState<string>('../../../runner-data/export');

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await api.get('/metadata');
        setMetadata(response.data);
        
        // Check if metadata is valid, if not show modal
        if (!response.data || !response.data.name || !response.data.id) {
          setShowEditModal(true);
        }
      } catch (err) {
        setError('Failed to load metadata');
        console.error('Error fetching metadata:', err);
        // If fetch fails, show modal to create metadata
        setShowEditModal(true);
      } finally {
        setLoading(false);
      }
    };

    const fetchSettings = async () => {
      try {
        const response = await api.get('/settings');
        setExportPath(response.data.exportPath || '../../../runner-data/export');
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };

    fetchMetadata();
    fetchSettings();

    // Set up WebSocket connection
    const socket = new SockJS('http://localhost:5001/ws');
    const stompClient = Stomp.over(socket);
    
    stompClient.connect({}, () => {
      console.log('Connected to WebSocket');
      
      // Subscribe to metadata updates
      stompClient.subscribe('/topic/metadata', (message) => {
        try {
          const updatedMetadata = JSON.parse(message.body);
          setMetadata(updatedMetadata);
          console.log('Received metadata update:', updatedMetadata);
        } catch (err) {
          console.error('Error parsing metadata update:', err);
        }
      });
    });

    // Cleanup on unmount
    return () => {
      if (stompClient) {
        stompClient.disconnect();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="mt-auto p-4 border-t border-gray-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <>
        <div className="mt-auto p-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-gray-500">
            <Info className="h-4 w-4" />
            <span className="text-sm">Please configure dataset metadata</span>
          </div>
        </div>
        
        {/* Show modal even when metadata is not available */}
        <MetadataEditModal
          isOpen={!loading}
          onClose={() => {
            if (metadata) {
              setShowEditModal(false);
            }
            // Don't allow closing if no metadata - force user to create it
          }}
          metadata={null}
          onSave={async () => {
            // Force refresh metadata
            try {
              const response = await api.get('/metadata');
              setMetadata(response.data);
              setShowEditModal(false);
              setError(null);
            } catch (err) {
              console.error('Error fetching metadata:', err);
            }
          }}
        />
      </>
    );
  }

  const truncateDescription = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleExport = async () => {
    if (!metadata) return;

    try {
      setExporting(true);
      
      if (exportToFilesystem) {
        // Export to filesystem (uses path from settings)
        const url = `/api/export/dataset/to-filesystem?includeImages=${includeImages}`;
        const response = await fetch(url, { method: 'POST' });

        if (!response.ok) {
          throw new Error('Filesystem export failed');
        }
        
        const result = await response.json();
        
        if (result.success) {
          // Success - no alert needed for filesystem export
          console.log(`Dataset exported successfully to: ${result.path} (${result.size} bytes)`);
        } else {
          throw new Error(result.message);
        }
      } else {
        // Download to browser
        const url = includeImages 
          ? `/api/export/dataset?includeImages=true`
          : `/api/export/dataset`;
        
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Export failed');
        }
        
        // Get filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = includeImages 
          ? `${metadata.id}.${metadata.version}.zip`
          : `${metadata.id}.${metadata.version}.json`;
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        // Create blob and download
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      }
      
      // Reset checkboxes after successful export
      setIncludeImages(false);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export dataset. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="mt-auto p-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Info className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Dataset Info</span>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title="Edit metadata"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      
      <div className="space-y-1">
        <div>
          <span className="text-xs font-medium text-gray-500">Name:</span>
          <p className="text-sm text-gray-900">{metadata.name}</p>
        </div>
        
        {metadata.description && (
          <div>
            <span className="text-xs font-medium text-gray-500">Description:</span>
            <p 
              className="text-sm text-gray-700 cursor-help" 
              title={metadata.description}
            >
              {truncateDescription(metadata.description)}
            </p>
          </div>
        )}
        
        <div>
          <span className="text-xs font-medium text-gray-500">Version:</span>
          <p className="text-sm text-gray-900 font-mono">{metadata.version}</p>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Cog className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Settings</span>
          </div>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title="Application settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
        
        <div className="mb-3 space-y-2">
          <label className="flex items-center space-x-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={exportToFilesystem}
              onChange={(e) => setExportToFilesystem(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Export to filesystem ({exportPath})</span>
          </label>
          
          <label className="flex items-center space-x-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={includeImages}
              onChange={(e) => setIncludeImages(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Include images</span>
          </label>
        </div>
        
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>
            {exporting 
              ? 'Exporting...' 
              : exportToFilesystem
                ? (includeImages ? 'Export to Filesystem + Images' : 'Export to Filesystem')
                : (includeImages ? 'Download Dataset + Images' : 'Download Dataset')
            }
          </span>
        </button>
      </div>
    </div>

    <MetadataEditModal
      isOpen={showEditModal || (!metadata && !loading)}
      onClose={() => {
        // Only allow closing if metadata exists
        if (metadata) {
          setShowEditModal(false);
        }
      }}
      metadata={metadata}
      onSave={async () => {
        // Force refresh metadata
        try {
          const response = await api.get('/metadata');
          setMetadata(response.data);
          setShowEditModal(false);
          setError(null);
        } catch (err) {
          console.error('Error fetching metadata:', err);
        }
      }}
    />
    
    <SettingsModal
      isOpen={showSettingsModal}
      onClose={() => setShowSettingsModal(false)}
      onSave={async () => {
        setShowSettingsModal(false);
        // Refresh settings to update export path display
        try {
          const response = await api.get('/settings');
          setExportPath(response.data.exportPath || '../../../runner-data/export');
        } catch (err) {
          console.error('Error fetching settings:', err);
        }
      }}
    />
    </>
  );
};

export default DatasetMetadataDisplay;
