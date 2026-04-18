import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '../api/client';

interface AppSettings {
  id: string;
  exportPath: string;
  loggingLevel: string;
  translationProvider: string;
  translationBaseUrl: string;
  translationModel: string;
  translationApiKey: string;
  autoTranslateOnSave: boolean;
  translationTimeoutMs: number;
}

interface Language {
  id: number;
  code: string;
  name: string;
  localizedName: string;
  flagEmoji?: string | null;
  isDefault: boolean;
  isEnabled: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

type SettingsTab = 'general' | 'languages';

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [formData, setFormData] = useState({
    exportPath: '',
    loggingLevel: 'INFO',
    translationProvider: 'lmstudio',
    translationBaseUrl: '',
    translationModel: '',
    translationApiKey: '',
    autoTranslateOnSave: false,
    translationTimeoutMs: 300000
  });
  const [languages, setLanguages] = useState<Language[]>([]);
  const [newLanguage, setNewLanguage] = useState({
    code: '',
    name: '',
    localizedName: '',
    flagEmoji: '',
    isEnabled: true
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [languagesLoading, setLanguagesLoading] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);
  const [languageActionKey, setLanguageActionKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('general');
      setSettingsError(null);
      setLanguageError(null);
      fetchSettings();
      fetchLanguages();
    }
  }, [isOpen]);

  const getErrorMessage = (err: unknown, fallback: string) => {
    const responseMessage = (err as { response?: { data?: { message?: string } | string } })?.response?.data;
    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return responseMessage;
    }
    if (typeof responseMessage === 'object' && responseMessage && 'message' in responseMessage) {
      const message = responseMessage.message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
    return fallback;
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      const settings: AppSettings = response.data;
      setFormData({
        exportPath: settings.exportPath || '',
        loggingLevel: settings.loggingLevel || 'INFO',
        translationProvider: settings.translationProvider || 'lmstudio',
        translationBaseUrl: settings.translationBaseUrl || '',
        translationModel: settings.translationModel || '',
        translationApiKey: settings.translationApiKey || '',
        autoTranslateOnSave: settings.autoTranslateOnSave || false,
        translationTimeoutMs: settings.translationTimeoutMs || 300000
      });
    } catch (err) {
      console.error('Error fetching settings:', err);
      setSettingsError('Failed to load settings.');
    }
  };

  const fetchLanguages = async () => {
    setLanguagesLoading(true);
    try {
      const response = await api.get('/languages?enabledOnly=false');
      setLanguages(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching languages:', err);
      setLanguageError('Failed to load supported languages.');
    } finally {
      setLanguagesLoading(false);
    }
  };

  const handleSettingsSave = async () => {
    setSettingsLoading(true);
    setSettingsError(null);

    try {
      await api.put('/settings', {
        id: 'default',
        exportPath: formData.exportPath,
        loggingLevel: formData.loggingLevel,
        translationProvider: formData.translationProvider,
        translationBaseUrl: formData.translationBaseUrl,
        translationModel: formData.translationModel,
        translationApiKey: formData.translationApiKey || null,
        autoTranslateOnSave: formData.autoTranslateOnSave,
        translationTimeoutMs: formData.translationTimeoutMs
      });

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving settings:', err);
      setSettingsError(getErrorMessage(err, 'Failed to save settings. Please try again.'));
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleAddLanguage = async () => {
    setLanguageActionKey('new');
    setLanguageError(null);

    try {
      const response = await api.post('/languages', {
        code: newLanguage.code,
        name: newLanguage.name,
        localizedName: newLanguage.localizedName,
        flagEmoji: newLanguage.flagEmoji || null,
        isEnabled: newLanguage.isEnabled
      });

      setLanguages((prev) => [...prev, response.data].sort((a, b) => {
        if (a.isDefault !== b.isDefault) {
          return a.isDefault ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      }));
      setNewLanguage({ code: '', name: '', localizedName: '', flagEmoji: '', isEnabled: true });
    } catch (err) {
      console.error('Error creating language:', err);
      setLanguageError(getErrorMessage(err, 'Failed to add language.'));
    } finally {
      setLanguageActionKey(null);
    }
  };

  const handleToggleLanguage = async (language: Language) => {
    if (language.isDefault) {
      return;
    }

    const actionKey = `toggle-${language.id}`;
    setLanguageActionKey(actionKey);
    setLanguageError(null);

    try {
      const response = await api.put(`/languages/${language.id}`, {
        code: language.code,
        name: language.name,
        localizedName: language.localizedName,
        flagEmoji: language.flagEmoji || null,
        isEnabled: !language.isEnabled
      });

      setLanguages((prev) => prev.map((entry) => (
        entry.id === language.id ? response.data : entry
      )));
    } catch (err) {
      console.error('Error updating language:', err);
      setLanguageError(getErrorMessage(err, 'Failed to update language.'));
    } finally {
      setLanguageActionKey(null);
    }
  };

  const handleDeleteLanguage = async (language: Language) => {
    if (language.isDefault) {
      return;
    }

    if (!confirm(`Remove ${language.name} (${language.code}) and delete its stored translations?`)) {
      return;
    }

    const actionKey = `delete-${language.id}`;
    setLanguageActionKey(actionKey);
    setLanguageError(null);

    try {
      await api.delete(`/languages/${language.id}`);
      setLanguages((prev) => prev.filter((entry) => entry.id !== language.id));
    } catch (err) {
      console.error('Error deleting language:', err);
      setLanguageError(getErrorMessage(err, 'Failed to remove language.'));
    } finally {
      setLanguageActionKey(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Application Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-200 px-6 pt-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 text-sm font-medium rounded-t-md border ${
                activeTab === 'general'
                  ? 'bg-white border-gray-200 border-b-white text-gray-900'
                  : 'bg-gray-50 border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('languages')}
              className={`px-4 py-2 text-sm font-medium rounded-t-md border ${
                activeTab === 'languages'
                  ? 'bg-white border-gray-200 border-b-white text-gray-900'
                  : 'bg-gray-50 border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Supported Languages
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'general' ? (
            <div className="space-y-6">
              {settingsError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {settingsError}
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
                  placeholder="TIMELINE_DATA_DIR/export"
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

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900">Translation</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure the HTTP translation provider used for reveal auto-translation.
                </p>
              </div>

              <div>
                <label htmlFor="translationProvider" className="block text-sm font-medium text-gray-700 mb-2">
                  Translation Provider
                </label>
                <select
                  id="translationProvider"
                  value={formData.translationProvider}
                  onChange={(e) => setFormData({ ...formData, translationProvider: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="lmstudio">LM Studio</option>
                </select>
              </div>

              <div>
                <label htmlFor="translationBaseUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Provider Base URL
                </label>
                <input
                  type="text"
                  id="translationBaseUrl"
                  value={formData.translationBaseUrl}
                  onChange={(e) => setFormData({ ...formData, translationBaseUrl: e.target.value })}
                  placeholder="http://127.0.0.1:1234/v1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Base URL for the provider API. LM Studio should usually point to its OpenAI-compatible `/v1` endpoint.
                </p>
              </div>

              <div>
                <label htmlFor="translationModel" className="block text-sm font-medium text-gray-700 mb-2">
                  Model Name
                </label>
                <input
                  type="text"
                  id="translationModel"
                  value={formData.translationModel}
                  onChange={(e) => setFormData({ ...formData, translationModel: e.target.value })}
                  placeholder="qwen2.5-14b-instruct"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="translationApiKey" className="block text-sm font-medium text-gray-700 mb-2">
                  API Key (Optional)
                </label>
                <input
                  type="password"
                  id="translationApiKey"
                  value={formData.translationApiKey}
                  onChange={(e) => setFormData({ ...formData, translationApiKey: e.target.value })}
                  placeholder="Optional for LM Studio"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="translationTimeoutMs" className="block text-sm font-medium text-gray-700 mb-2">
                  Request Timeout (ms)
                </label>
                <input
                  type="number"
                  id="translationTimeoutMs"
                  min={1000}
                  step={1000}
                  value={formData.translationTimeoutMs}
                  onChange={(e) => setFormData({ ...formData, translationTimeoutMs: Number(e.target.value) || 300000 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.autoTranslateOnSave}
                  onChange={(e) => setFormData({ ...formData, autoTranslateOnSave: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Auto-translate enabled target languages when default reveal text changes
                </span>
              </label>
            </div>
          ) : (
            <div className="space-y-6">
              {languageError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {languageError}
                </div>
              )}

              <div>
                <h3 className="text-lg font-medium text-gray-900">Supported Languages</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add or remove target languages for reveal translation. The default language is kept read-only here.
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Add Language</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="languageCode" className="block text-sm font-medium text-gray-700 mb-2">
                      Code
                    </label>
                    <input
                      type="text"
                      id="languageCode"
                      value={newLanguage.code}
                      onChange={(e) => setNewLanguage({ ...newLanguage, code: e.target.value })}
                      placeholder="es"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="languageFlagEmoji" className="block text-sm font-medium text-gray-700 mb-2">
                      Flag
                    </label>
                    <input
                      type="text"
                      id="languageFlagEmoji"
                      value={newLanguage.flagEmoji}
                      onChange={(e) => setNewLanguage({ ...newLanguage, flagEmoji: e.target.value })}
                      placeholder="🇪🇸"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="languageName" className="block text-sm font-medium text-gray-700 mb-2">
                      Canonical Name
                    </label>
                    <input
                      type="text"
                      id="languageName"
                      value={newLanguage.name}
                      onChange={(e) => setNewLanguage({ ...newLanguage, name: e.target.value })}
                      placeholder="Spanish"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="languageLocalizedName" className="block text-sm font-medium text-gray-700 mb-2">
                      Localized Name
                    </label>
                    <input
                      type="text"
                      id="languageLocalizedName"
                      value={newLanguage.localizedName}
                      onChange={(e) => setNewLanguage({ ...newLanguage, localizedName: e.target.value })}
                      placeholder="Español"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={newLanguage.isEnabled}
                    onChange={(e) => setNewLanguage({ ...newLanguage, isEnabled: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Enable immediately</span>
                </label>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddLanguage}
                    disabled={languageActionKey === 'new'}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors"
                  >
                    {languageActionKey === 'new' ? 'Adding...' : 'Add Language'}
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[0.5fr_1fr_1.2fr_1.2fr_auto_auto] gap-4 px-4 py-3 bg-gray-50 text-sm font-medium text-gray-700 border-b border-gray-200">
                  <div>Flag</div>
                  <div>Code</div>
                  <div>Name</div>
                  <div>Localized Name</div>
                  <div>Enabled</div>
                  <div>Actions</div>
                </div>

                {languagesLoading ? (
                  <div className="p-4 text-sm text-gray-500">Loading supported languages...</div>
                ) : languages.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">No supported languages configured.</div>
                ) : (
                  languages.map((language) => {
                    const toggleKey = `toggle-${language.id}`;
                    const deleteKey = `delete-${language.id}`;

                    return (
                      <div
                        key={language.id}
                        className="grid grid-cols-[0.5fr_1fr_1.2fr_1.2fr_auto_auto] gap-4 px-4 py-3 items-center border-b last:border-b-0 border-gray-100"
                      >
                        <div className="text-lg leading-none">{language.flagEmoji || ' '}</div>
                        <div className="font-mono text-sm text-gray-900">{language.code}</div>
                        <div className="text-sm text-gray-900">{language.name}</div>
                        <div className="text-sm text-gray-900">
                          {language.localizedName}
                          {language.isDefault && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                              Default
                            </span>
                          )}
                        </div>
                        <div>
                          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={language.isEnabled}
                              disabled={language.isDefault || languageActionKey === toggleKey}
                              onChange={() => handleToggleLanguage(language)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            {language.isEnabled ? 'Yes' : 'No'}
                          </label>
                        </div>
                        <div className="flex justify-end">
                          {language.isDefault ? (
                            <span className="text-sm text-gray-400">Protected</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteLanguage(language)}
                              disabled={languageActionKey === deleteKey}
                              className="text-sm text-red-600 hover:text-red-800 disabled:text-red-300"
                            >
                              {languageActionKey === deleteKey ? 'Removing...' : 'Remove'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            {activeTab === 'general' ? 'Cancel' : 'Close'}
          </button>
          {activeTab === 'general' && (
            <button
              type="button"
              onClick={handleSettingsSave}
              disabled={settingsLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {settingsLoading ? 'Saving...' : 'Save Settings'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

