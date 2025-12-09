'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { authenticatedApiCall, authenticatedFetch } from '@/utils/api-auth';
import { getApiBaseUrlRuntime, getStaticAssetUrl } from '@/utils/api-config';

interface GeneralDiet {
  id: number;
  name: string;
  price: number;
  description?: string | null;
  icon_url?: string | null;
  icon_svg?: string | null;
  is_active: boolean;
  display_name: string;
}

export default function GeneralDietsManagement() {
  const [diets, setDiets] = useState<GeneralDiet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDiet, setSelectedDiet] = useState<GeneralDiet | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [dietName, setDietName] = useState('');
  const [dietPrice, setDietPrice] = useState<number | ''>(0);
  const [dietDescription, setDietDescription] = useState('');
  const [iconSvg, setIconSvg] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconUploadUrl, setIconUploadUrl] = useState<string | null>(null);
  const [iconRelativePath, setIconRelativePath] = useState<string | null>(null);
  const [iconMethod, setIconMethod] = useState<'upload' | 'paste'>('upload');
  const [uploadingIcon, setUploadingIcon] = useState(false);

  useEffect(() => {
    fetchDiets();
  }, []);

  const fetchDiets = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[GeneralDietsManagement] Fetching diets from /api/general-diets/?page=1&limit=100');
      const data = await authenticatedApiCall<{ diets: GeneralDiet[]; total: number; page: number; limit: number }>('/api/general-diets/?page=1&limit=100');
      console.log('[GeneralDietsManagement] Received data:', data);
      console.log('[GeneralDietsManagement] Diets count:', data.diets?.length || 0);
      setDiets(data.diets || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Błąd podczas ładowania diet';
      console.error('[GeneralDietsManagement] Error fetching diets:', err);
      console.error('[GeneralDietsManagement] Error message:', errorMessage);
      
      // If 404 or "Not found", treat as empty list (no diets yet)
      if (errorMessage.includes('404') || errorMessage.includes('Not found') || errorMessage.includes('Resource not found')) {
        setDiets([]);
        setError(null); // Clear error for 404 - empty list is valid
      } else if (errorMessage.includes('401') || errorMessage.includes('Session expired') || errorMessage.includes('Not authenticated')) {
        // Authentication error - show error
        setError('Sesja wygasła. Zaloguj się ponownie.');
        setDiets([]);
      } else {
        // Other errors - show error message
        setError(errorMessage);
        setDiets([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDietName('');
    setDietPrice(0);
    setDietDescription('');
    setIconSvg('');
    setIconFile(null);
    setIconUploadUrl(null);
    setIconRelativePath(null);
    setIconMethod('upload');
    setSelectedDiet(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEdit = (diet: GeneralDiet) => {
    setSelectedDiet(diet);
    setDietName(diet.name);
    setDietPrice(diet.price);
    setDietDescription(diet.description || '');
    setIconSvg(diet.icon_svg || '');
    // If diet has icon_url, construct full URL for preview
    if (diet.icon_url) {
      // Use getStaticAssetUrl to properly handle all URL formats
      const fullUrl = getStaticAssetUrl(diet.icon_url);
      setIconUploadUrl(fullUrl || null);
      
      // Extract relative path for database storage
      if (diet.icon_url.startsWith('http://') || diet.icon_url.startsWith('https://')) {
        // Full URL - extract path
        const urlObj = new URL(diet.icon_url);
        let path = urlObj.pathname;
        // Remove /static/ prefix if present
        if (path.startsWith('/static/')) {
          path = path.replace('/static/', '');
        }
        setIconRelativePath(path);
      } else {
        // Relative path - remove /static/ prefix if present
        let relativePath = diet.icon_url;
        if (relativePath.startsWith('/static/')) {
          relativePath = relativePath.replace('/static/', '');
        } else if (relativePath.startsWith('/')) {
          relativePath = relativePath.substring(1);
        }
        setIconRelativePath(relativePath);
      }
    } else {
      setIconUploadUrl(null);
      setIconRelativePath(null);
    }
    setIconFile(null); // Clear any file selection
    setIconMethod(diet.icon_svg ? 'paste' : (diet.icon_url ? 'upload' : 'upload'));
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
      const response = await authenticatedFetch(`${API_BASE_URL}/api/general-diets/general-diet-icon-upload`, {
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
      console.error('[GeneralDietsManagement] Error uploading icon:', err);
      throw err;
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleSave = async () => {
    if (!dietName.trim()) {
      setError('Nazwa diety jest wymagana');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Upload icon file if method is upload and file is selected
      // Always upload if new file is selected, even if iconRelativePath exists (user wants to replace old icon)
      let finalIconRelativePath: string | null = iconRelativePath;
      
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

      const dietData: any = {
        name: dietName.trim(),
        price: Number(dietPrice),
        description: dietDescription.trim() || null,
        is_active: true,
      };
      
      // Add icon based on selected method
      if (iconMethod === 'paste' && iconSvg.trim()) {
        dietData.icon_svg = iconSvg.trim();
        dietData.icon_url = null; // Clear icon_url if using SVG
      } else if (iconMethod === 'upload' && finalIconRelativePath) {
        dietData.icon_url = finalIconRelativePath; // Store relative path in database
        dietData.icon_svg = null; // Clear icon_svg if using upload
      } else {
        // No icon provided - clear both
        dietData.icon_url = null;
        dietData.icon_svg = null;
      }

      if (selectedDiet) {
        await authenticatedApiCall<GeneralDiet>(`/api/general-diets/${selectedDiet.id}`, {
          method: 'PUT',
          body: JSON.stringify(dietData),
        });
      } else {
        await authenticatedApiCall<GeneralDiet>('/api/general-diets/', {
          method: 'POST',
          body: JSON.stringify(dietData),
        });
      }

      await fetchDiets();
      resetForm();
      setShowCreateModal(false);
      setShowEditModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zapisywania diety');
      console.error('[GeneralDietsManagement] Error saving diet:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (diet: GeneralDiet) => {
    if (!confirm(`Czy na pewno chcesz usunąć dietę "${diet.display_name}"?`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await authenticatedApiCall(`/api/general-diets/${diet.id}`, {
        method: 'DELETE',
      });
      await fetchDiets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas usuwania diety');
      console.error('[GeneralDietsManagement] Error deleting diet:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Ładowanie diet ogólnych...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Diety ogólne</h1>
        <button
          onClick={handleCreate}
          className="bg-[#03adf0] text-white px-4 py-2 rounded-lg hover:bg-[#0288c7] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Dodaj dietę
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {diets.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                  Brak diet ogólnych. Kliknij "Dodaj dietę", aby utworzyć nową.
                </td>
              </tr>
            ) : (
              diets.map((diet) => (
              <tr key={diet.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {diet.icon_svg ? (
                    <div 
                      className="w-10 h-10 flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: diet.icon_svg }}
                    />
                  ) : diet.icon_url ? (
                    <img 
                      src={getStaticAssetUrl(diet.icon_url) || ''} 
                      alt={diet.name}
                      className="w-10 h-10 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                      Brak
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{diet.display_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{diet.price.toFixed(2)} PLN</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(diet)}
                    className="text-[#03adf0] hover:text-[#0288c7] mr-4"
                  >
                    <Edit className="w-4 h-4 inline" />
                  </button>
                  <button
                    onClick={() => handleDelete(diet)}
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
          className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fadeIn"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => {
            if (!saving) {
              resetForm();
              setShowCreateModal(false);
              setShowEditModal(false);
            }
          }}
        >
          <div
            className="bg-white shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn"
            style={{ borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedDiet ? 'Edytuj dietę ogólną' : 'Dodaj dietę ogólną'}
                </h2>
                <button
                  onClick={() => {
                    if (!saving) {
                      resetForm();
                      setShowCreateModal(false);
                      setShowEditModal(false);
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  style={{ cursor: 'pointer' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nazwa diety *
                </label>
                <input
                  type="text"
                  value={dietName}
                  onChange={(e) => setDietName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                  placeholder="np. wegetariańska"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cena (PLN) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={dietPrice}
                  onChange={(e) => setDietPrice(e.target.value ? parseFloat(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opis
                </label>
                <textarea
                  value={dietDescription}
                  onChange={(e) => setDietDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ikona (opcjonalne)
                </label>
                
                {/* Method selection */}
                <div className="mb-3 flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="iconMethod"
                      value="upload"
                      checked={iconMethod === 'upload'}
                      onChange={(e) => setIconMethod(e.target.value as 'upload' | 'paste')}
                      className="mr-2"
                    />
                    <span className="text-sm">Upload pliku</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="iconMethod"
                      value="paste"
                      checked={iconMethod === 'paste'}
                      onChange={(e) => setIconMethod(e.target.value as 'upload' | 'paste')}
                      className="mr-2"
                    />
                    <span className="text-sm">Wklej kod SVG</span>
                  </label>
                </div>

                {/* Upload method */}
                {iconMethod === 'upload' && (
                  <div>
                    <input
                      type="file"
                      accept=".svg,.png,.jpg,.jpeg,.gif,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIconFile(file);
                          setIconSvg(''); // Clear SVG when uploading file
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent text-sm"
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
                          src={getStaticAssetUrl(iconUploadUrl) || iconUploadUrl || ''} 
                          alt="Uploaded icon"
                          className="w-20 h-20 object-contain bg-white border border-gray-300 rounded"
                        />
                      </div>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Obsługiwane formaty: SVG, PNG, JPG, JPEG, GIF, WEBP
                    </p>
                  </div>
                )}

                {/* Paste SVG method */}
                {iconMethod === 'paste' && (
                  <div>
                    <textarea
                      value={iconSvg}
                      onChange={(e) => {
                        setIconSvg(e.target.value);
                        setIconFile(null); // Clear file when pasting SVG
                        setIconUploadUrl(null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent font-mono text-xs"
                      rows={8}
                      placeholder="Wklej kod SVG tutaj, np. &lt;svg width=&quot;24&quot; height=&quot;24&quot; viewBox=&quot;0 0 24 24&quot;&gt;...&lt;/svg&gt;"
                    />
                    {iconSvg && iconSvg.trim() && (
                      <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                        <p className="text-xs text-gray-600 mb-2">Podgląd ikony:</p>
                        <div 
                          className="flex items-center justify-center w-20 h-20 bg-white border border-gray-300 rounded"
                          style={{ 
                            minWidth: '80px',
                            minHeight: '80px'
                          }}
                          dangerouslySetInnerHTML={{ __html: iconSvg }}
                        />
                      </div>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Wklej pełny kod SVG. Ikona będzie wyświetlana w tle i używana w następnym kroku.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  if (!saving) {
                    resetForm();
                    setShowCreateModal(false);
                    setShowEditModal(false);
                  }
                }}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: 0 }}
              >
                Anuluj
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-[#03adf0] border-2 border-[#03adf0] hover:bg-[#0288c7] transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ borderRadius: 0 }}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Zapisywanie...' : 'Zapisz'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Animations CSS */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

