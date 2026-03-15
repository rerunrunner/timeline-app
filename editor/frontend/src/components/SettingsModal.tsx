import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../api/client';

interface AppSettings {
  id: string;
  exportPath: string;
  loggingLevel: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    exportPath: '',
    loggingLevel: 'INFO'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      const settings: AppSettings = response.data;
      setFormData({
        exportPath: settings.exportPath || '',
        loggingLevel: settings.loggingLevel || 'INFO'
      });
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.put('/settings', {
        id: 'default',
        exportPath: formData.exportPath,
        loggingLevel: formData.loggingLevel
      });

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Application Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="exportPath" className="block text-sm font-medium text-gray-700 mb-2">
              Export Path
            </label>
            <input
              type="text"
              id="exportPath"
              value={formData.exportPath}
              onChange={(e) => setFormData({ ...formData, exportPath: e.target.value })}
              placeholder="../../../runner-data/export"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Path where the dataset will be exported (relative to backend-java)
            </p>
          </div>

          <div>
            <label htmlFor="loggingLevel" className="block text-sm font-medium text-gray-700 mb-2">
              Logging Level
            </label>
            <select
              id="loggingLevel"
              value={formData.loggingLevel}
              onChange={(e) => setFormData({ ...formData, loggingLevel: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="INFO">INFO</option>
              <option value="DEBUG">DEBUG</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Change logging level (requires server restart to take effect)
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;

