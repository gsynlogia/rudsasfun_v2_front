'use client';

import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useState, useEffect } from 'react';

import { authenticatedApiCall, authenticatedFetch } from '@/utils/api-auth';
import { getApiBaseUrlRuntime, getStaticAssetUrl } from '@/utils/api-config';

interface GeneralProtection {
  id: number;
  name: string;
  price: number;  // Cannot be negative (protections are additional fees, not discounts)
  description?: string | null;
  icon_url?: string | null;
  icon_svg?: string | null;
  is_active: boolean;
  display_name: string;
}

export default function GeneralProtectionsManagement() {
  const [protections, setProtections] = useState<GeneralProtection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProtection, setSelectedProtection] = useState<GeneralProtection | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [protectionName, setProtectionName] = useState('');
  const [protectionPrice, setProtectionPrice] = useState<number | ''>(0);
  const [protectionDescription, setProtectionDescription] = useState('');
  const [iconSvg, setIconSvg] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconUploadUrl, setIconUploadUrl] = useState<string | null>(null);
  const [iconRelativePath, setIconRelativePath] = useState<string | null>(null);
  const [iconMethod, setIconMethod] = useState<'upload' | 'paste'>('upload');
  const [uploadingIcon, setUploadingIcon] = useState(false);

  useEffect(() => {
    fetchProtections();
  }, []);

  const fetchProtections = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authenticatedApiCall<{ protections: GeneralProtection[]; total: number; page: number; limit: number }>('/api/general-protections/?page=1&limit=100');
      setProtections(data.protections || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Błąd podczas ładowania ochron';
      console.error('[GeneralProtectionsManagement] Error fetching protections:', err);

      if (errorMessage.includes('404') || errorMessage.includes('Not found')) {
        setProtections([]);
        setError(null);
      } else if (errorMessage.includes('401') || errorMessage.includes('Session expired')) {
        setError('Sesja wygasła. Zaloguj się ponownie.');
        setProtections([]);
      } else {
        setError(errorMessage);
        setProtections([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProtectionName('');
    setProtectionPrice(0);
    setProtectionDescription('');
    setIconSvg('');
    setIconFile(null);
    setIconUploadUrl(null);
    setIconRelativePath(null);
    setIconMethod('upload');
    setSelectedProtection(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEdit = (protection: GeneralProtection) => {
    setSelectedProtection(protection);
    setProtectionName(protection.name);
    setProtectionPrice(protection.price);
    setProtectionDescription(protection.description || '');
    setIconSvg(protection.icon_svg || '');
    // If protection has icon_url, construct full URL for preview
    if (protection.icon_url) {
      const API_BASE_URL = getApiBaseUrlRuntime();
      // Check if icon_url is already a full URL or just a relative path
      if (protection.icon_url.startsWith('http://') || protection.icon_url.startsWith('https://')) {
        // Already a full URL, use it directly
        setIconUploadUrl(protection.icon_url);
        // Extract relative path from full URL
        const urlObj = new URL(protection.icon_url);
        const relativePath = urlObj.pathname.replace('/static/', '');
        setIconRelativePath(relativePath);
      } else {
        // Relative path, construct full URL
        setIconUploadUrl(`${API_BASE_URL}/static/${protection.icon_url}`);
        setIconRelativePath(protection.icon_url);
      }
    } else {
      setIconUploadUrl(null);
      setIconRelativePath(null);
    }
    setIconFile(null); // Clear any file selection
    setIconMethod(protection.icon_svg ? 'paste' : (protection.icon_url ? 'upload' : 'upload'));
    setShowEditModal(true);
  };

  const handleIconUpload = async (file: File) => {
    try {
      setUploadingIcon(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      // Use authenticatedFetch for FormData upload
      const API_BASE_URL = getApiBaseUrlRuntime();
      const response = await authenticatedFetch(`${API_BASE_URL}/api/general-protections/general-protection-icon-upload`, {
        method: 'POST',
        body: formData,
        // authenticatedFetch will handle Authorization header and Content-Type for FormData
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sesja wygasła. Zaloguj się ponownie.');
        }
        const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setIconUploadUrl(data.url);
      setIconRelativePath(data.relative_path);
      setIconFile(null); // Clear file input
      // Return both URL (for preview) and relative_path (for database)
      return { url: data.url, relative_path: data.relative_path };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Błąd podczas uploadu ikony';
      setError(errorMessage);
      console.error('[GeneralProtectionsManagement] Error uploading icon:', err);
      throw err;
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleSave = async () => {
    if (!protectionName.trim()) {
      setError('Nazwa ochrony jest wymagana');
      return;
    }

    if (protectionPrice === '' || Number(protectionPrice) < 0) {
      setError('Cena musi być większa lub równa 0');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Upload icon file if method is upload and a new file is selected
      let finalIconRelativePath: string | null = iconRelativePath;

      // If user selected a new file, upload it (this handles both new protections and editing existing ones)
      if (iconMethod === 'upload' && iconFile) {
        try {
          const uploadResult = await handleIconUpload(iconFile);
          // uploadResult is { url, relative_path }
          finalIconRelativePath = uploadResult.relative_path;
        } catch (uploadErr) {
          // Error already set in handleIconUpload
          return; // Stop saving if upload fails
        }
      }

      const protectionData: any = {
        name: protectionName.trim(),
        price: Number(protectionPrice),  // Cannot be negative
        description: protectionDescription.trim() || null,
        is_active: true,
      };

      // Add icon based on selected method
      if (iconMethod === 'paste' && iconSvg.trim()) {
        // User is using SVG paste method
        protectionData.icon_svg = iconSvg.trim();
        protectionData.icon_url = null; // Clear icon_url if using SVG
      } else if (iconMethod === 'upload') {
        // User is using upload method
        if (finalIconRelativePath) {
          // Either new upload or existing icon
          protectionData.icon_url = finalIconRelativePath; // Store relative path in database
          protectionData.icon_svg = null; // Clear icon_svg if using upload
        } else {
          // No icon provided - clear both
          protectionData.icon_url = null;
          protectionData.icon_svg = null;
        }
      } else {
        // No icon provided - clear both
        protectionData.icon_url = null;
        protectionData.icon_svg = null;
      }

      if (selectedProtection) {
        await authenticatedApiCall<GeneralProtection>(`/api/general-protections/${selectedProtection.id}`, {
          method: 'PUT',
          body: JSON.stringify(protectionData),
        });
      } else {
        await authenticatedApiCall<GeneralProtection>('/api/general-protections/', {
          method: 'POST',
          body: JSON.stringify(protectionData),
        });
      }

      await fetchProtections();
      resetForm();
      setShowCreateModal(false);
      setShowEditModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zapisywania ochrony');
      console.error('[GeneralProtectionsManagement] Error saving protection:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (protection: GeneralProtection) => {
    if (!confirm(`Czy na pewno chcesz usunąć ochronę "${protection.display_name}"?`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await authenticatedApiCall(`/api/general-protections/${protection.id}`, {
        method: 'DELETE',
      });
      await fetchProtections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas usuwania ochrony');
      console.error('[GeneralProtectionsManagement] Error deleting protection:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Ładowanie ochron ogólnych...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Ochrony ogólne</h1>
        <button
          onClick={handleCreate}
          className="bg-[#03adf0] text-white px-4 py-2 rounded-lg hover:bg-[#0288c7] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Dodaj ochronę
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ikona</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nazwa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cena</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opis</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {protections.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                  Brak ochron ogólnych. Kliknij "Dodaj ochronę", aby utworzyć nową.
                </td>
              </tr>
            ) : (
              protections.map((protection) => (
              <tr key={protection.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {protection.icon_svg ? (
                    <div
                      className="w-8 h-8 flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: protection.icon_svg }}
                    />
                  ) : protection.icon_url ? (
                    <img
                      src={getStaticAssetUrl(protection.icon_url) || ''}
                      alt={protection.display_name}
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                      -
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{protection.display_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {protection.price.toFixed(2)} PLN
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{protection.description || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(protection)}
                    className="text-[#03adf0] hover:text-[#0288c7] mr-4"
                  >
                    <Edit className="w-4 h-4 inline" />
                  </button>
                  <button
                    onClick={() => handleDelete(protection)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(2px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              resetForm();
              setShowCreateModal(false);
              setShowEditModal(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {selectedProtection ? 'Edytuj ochronę' : 'Dodaj ochronę'}
              </h2>
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(false);
                  setShowEditModal(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nazwa ochrony *
                </label>
                <input
                  type="text"
                  value={protectionName}
                  onChange={(e) => setProtectionName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  placeholder="np. Ubezpieczenie podstawowe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cena (PLN) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={protectionPrice}
                  onChange={(e) => setProtectionPrice(e.target.value ? parseFloat(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  placeholder="np. 50.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cena ochrony (musi być większa lub równa 0)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opis (opcjonalne)
                </label>
                <textarea
                  value={protectionDescription}
                  onChange={(e) => setProtectionDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  rows={3}
                  placeholder="Szczegółowy opis ochrony..."
                />
              </div>

              {/* Icon section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ikona (opcjonalne)
                </label>

                {/* Method selection */}
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="iconMethod"
                      value="upload"
                      checked={iconMethod === 'upload'}
                      onChange={(e) => setIconMethod(e.target.value as 'upload' | 'paste')}
                      className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0]"
                    />
                    <span className="text-sm text-gray-700">Wgraj plik</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="iconMethod"
                      value="paste"
                      checked={iconMethod === 'paste'}
                      onChange={(e) => setIconMethod(e.target.value as 'upload' | 'paste')}
                      className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0]"
                    />
                    <span className="text-sm text-gray-700">Wklej SVG</span>
                  </label>
                </div>

                {/* Upload method */}
                {iconMethod === 'upload' && (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept=".svg,.png,.jpg,.jpeg,.gif,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIconFile(file);
                          setIconSvg(''); // Clear SVG when uploading file
                          // Clear existing icon paths when new file is selected
                          setIconUploadUrl(null);
                          setIconRelativePath(null);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      disabled={uploadingIcon}
                    />
                    {iconFile && (
                      <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Wybrany plik: {iconFile.name}</p>
                        {iconFile.type.startsWith('image/') && (
                          <img
                            src={URL.createObjectURL(iconFile)}
                            alt="Preview"
                            className="w-20 h-20 object-contain bg-white border border-gray-300 rounded"
                          />
                        )}
                      </div>
                    )}
                    {iconUploadUrl && (
                      <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                        <p className="text-xs text-green-600 mb-1">Ikona została załadowana:</p>
                        <img
                          src={iconUploadUrl}
                          alt="Uploaded icon"
                          className="w-20 h-20 object-contain bg-white border border-gray-300 rounded"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Paste method */}
                {iconMethod === 'paste' && (
                  <div className="space-y-2">
                    <textarea
                      value={iconSvg}
                      onChange={(e) => {
                        setIconSvg(e.target.value);
                        setIconFile(null); // Clear file when pasting SVG
                        setIconUploadUrl(null);
                        setIconRelativePath(null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] font-mono text-xs"
                      rows={6}
                      placeholder="Wklej kod SVG tutaj..."
                    />
                    {iconSvg && iconSvg.trim() && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 mb-1">Podgląd:</p>
                        <div
                          className="w-16 h-16 border border-gray-200 rounded flex items-center justify-center bg-white"
                          dangerouslySetInnerHTML={{ __html: iconSvg }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(false);
                  setShowEditModal(false);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#03adf0] text-white rounded-lg hover:bg-[#0288c7] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  'Zapisywanie...'
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Zapisz
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}