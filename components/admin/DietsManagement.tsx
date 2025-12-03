'use client';

import { useState, useEffect } from 'react';
import { UtensilsCrossed, Plus, Search, Edit, Trash2, Power, PowerOff, Save, DollarSign, FileText } from 'lucide-react';
import UniversalModal from './UniversalModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { authenticatedApiCall } from '@/utils/api-auth';

interface Diet {
  id: number;
  name: string;
  price: number;
  description?: string | null;
  icon_name?: string | null;
  icon_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function DietsManagement() {
  const [diets, setDiets] = useState<Diet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDiet, setSelectedDiet] = useState<Diet | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [dietName, setDietName] = useState('');
  const [dietPrice, setDietPrice] = useState<number | ''>(0);
  const [dietDescription, setDietDescription] = useState('');
  const [dietIconName, setDietIconName] = useState('');
  const [dietIconUrl, setDietIconUrl] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  // Fetch all diets
  const fetchDiets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authenticatedApiCall<{ diets: Diet[]; total: number }>(
        '/api/diets/?include_inactive=true'
      );
      setDiets(data.diets || []);
    } catch (err) {
      console.error('[DietsManagement] Error fetching diets:', err);
      const errorMessage = err instanceof Error ? err.message : 'Błąd podczas ładowania diet';
      setError(errorMessage);
      setDiets([]);
      
      // If it's an authentication error, the SectionGuard should handle redirect
      if (errorMessage.includes('Not authenticated') || errorMessage.includes('Session expired')) {
        // Don't set error, let SectionGuard handle it
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiets();
  }, []);

  // Filter diets by search query
  const filteredDiets = diets.filter((diet) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      diet.name.toLowerCase().includes(query) ||
      (diet.description && diet.description.toLowerCase().includes(query)) ||
      (diet.icon_name && diet.icon_name.toLowerCase().includes(query))
    );
  });

  // Reset form
  const resetForm = () => {
    setDietName('');
    setDietPrice(0);
    setDietDescription('');
    setDietIconName('');
    setDietIconUrl(null);
    setIconFile(null);
    setSelectedDiet(null);
  };

  // Open create modal
  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  // Open edit modal
  const handleEdit = (diet: Diet) => {
    setSelectedDiet(diet);
    setDietName(diet.name);
    setDietPrice(diet.price);
    setDietDescription(diet.description || '');
    setDietIconName(diet.icon_name || '');
    setDietIconUrl(diet.icon_url || null);
    setIconFile(null);
    setShowEditModal(true);
  };

  // Open delete modal
  const handleDelete = (diet: Diet) => {
    setSelectedDiet(diet);
    setShowDeleteModal(true);
  };

  // Handle icon upload
  const handleIconUpload = async (file: File): Promise<string | null> => {
    if (!file.name.endsWith('.svg')) {
      setError('Tylko pliki SVG są dozwolone');
      return null;
    }

    try {
      setUploadingIcon(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await authenticatedApiCall<{ url: string; filename: string; relative_path: string }>(
        '/api/diets/upload-icon',
        {
          method: 'POST',
          body: formData,
        }
      );

      // Return the full URL for display, but we'll store relative_path in database
      return response.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas przesyłania ikony');
      console.error('[DietsManagement] Error uploading icon:', err);
      return null;
    } finally {
      setUploadingIcon(false);
    }
  };

  // Handle file input change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIconFile(file);
    const uploadedUrl = await handleIconUpload(file);
    if (uploadedUrl) {
      setDietIconUrl(uploadedUrl);
    }
  };

  // Handle save (create or update)
  const handleSave = async () => {
    if (!dietName.trim()) {
      setError('Nazwa diety jest wymagana');
      return;
    }

    if (dietPrice === '' || dietPrice < 0) {
      setError('Cena musi być większa lub równa 0');
      return;
    }

    // Upload icon if file is selected but not yet uploaded
    let finalIconUrl = dietIconUrl;
    if (iconFile && !dietIconUrl) {
      const uploadResult = await handleIconUpload(iconFile);
      if (!uploadResult) {
        return; // Error already set in handleIconUpload
      }
      finalIconUrl = uploadResult;
      setDietIconUrl(finalIconUrl);
    }

    try {
      setSaving(true);
      setError(null);

      // Convert full URL to relative path for storage
      let iconUrlToStore = finalIconUrl;
      if (iconUrlToStore && iconUrlToStore.startsWith('http')) {
        try {
          const url = new URL(iconUrlToStore);
          iconUrlToStore = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
        } catch {
          // Keep original if URL parsing fails
        }
      }

      const dietData = {
        name: dietName.trim(),
        price: Number(dietPrice),
        description: dietDescription.trim() || null,
        icon_name: dietIconName.trim() || null,
        icon_url: iconUrlToStore || null,
        is_active: true,
      };

      if (selectedDiet) {
        await authenticatedApiCall<Diet>(`/api/diets/${selectedDiet.id}`, {
          method: 'PUT',
          body: JSON.stringify(dietData),
        });
      } else {
        await authenticatedApiCall<Diet>('/api/diets/', {
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
      console.error('[DietsManagement] Error saving diet:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!selectedDiet) return;

    try {
      setSaving(true);
      setError(null);

      await authenticatedApiCall(`/api/diets/${selectedDiet.id}`, {
        method: 'DELETE',
      });

      await fetchDiets();
      setShowDeleteModal(false);
      setSelectedDiet(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas usuwania diety');
      console.error('[DietsManagement] Error deleting diet:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active status
  const handleToggleStatus = async (diet: Diet) => {
    try {
      setSaving(true);
      setError(null);

      await authenticatedApiCall<Diet>(`/api/diets/${diet.id}/toggle`, {
        method: 'PATCH',
      });

      await fetchDiets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zmiany statusu diety');
      console.error('[DietsManagement] Error toggling diet status:', err);
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
          <p className="text-sm text-gray-600">Ładowanie diet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Zarządzanie dietami</h1>
            <p className="text-sm text-gray-500 mt-1">Dodawaj, edytuj i zarządzaj dietami dostępnymi w systemie</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#03adf0] text-white rounded-lg hover:bg-[#0288c7] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Dodaj dietę
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj diety po nazwie, opisie lub ikonie..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
          />
        </div>
      </div>

      {/* Diets Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredDiets.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Brak diet do wyświetlenia</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ikona</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nazwa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cena</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opis</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDiets.map((diet) => {
                  return (
                    <tr key={diet.id} className={!diet.is_active ? 'opacity-50' : ''}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {diet.icon_url ? (
                          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded">
                            <img 
                              src={diet.icon_url} 
                              alt={diet.name}
                              className="w-6 h-6 object-contain"
                              onError={(e) => {
                                // Fallback if image fails to load
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ) : diet.icon_name ? (
                          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded">
                            <span className="text-xs font-mono text-gray-600">{diet.icon_name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-8 h-8">
                            <span className="text-gray-400">-</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{diet.name}</div>
                        {diet.icon_name && !diet.icon_url && (
                          <div className="text-xs text-gray-500">{diet.icon_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{diet.price.toFixed(2)} PLN</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {diet.description || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          diet.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {diet.is_active ? 'Aktywna' : 'Nieaktywna'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(diet)}
                            className="text-gray-600 hover:text-[#03adf0] transition-colors"
                            title={diet.is_active ? 'Wyłącz' : 'Włącz'}
                            disabled={saving}
                          >
                            {diet.is_active ? (
                              <PowerOff className="w-4 h-4" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEdit(diet)}
                            className="text-gray-600 hover:text-[#03adf0] transition-colors"
                            title="Edytuj"
                            disabled={saving}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(diet)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Usuń"
                            disabled={saving}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <UniversalModal
        isOpen={showCreateModal || showEditModal}
              onClose={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                resetForm();
              }}
        title={selectedDiet ? 'Edytuj dietę' : 'Dodaj nową dietę'}
        maxWidth="lg"
      >
        <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="space-y-5"
            >
            {/* Name */}
            <div>
              <label htmlFor="diet-name" className="block text-sm font-medium text-gray-700 mb-2">
                <UtensilsCrossed className="w-4 h-4 inline mr-1.5 text-[#03adf0]" />
                Nazwa diety <span className="text-red-500">*</span>
              </label>
              <input
                id="diet-name"
                type="text"
                value={dietName}
                onChange={(e) => setDietName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent transition-all"
                placeholder="np. Dieta wegetariańska"
                disabled={saving}
              />
            </div>

            {/* Price */}
            <div>
              <label htmlFor="diet-price" className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1.5 text-[#03adf0]" />
                Cena (PLN) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="diet-price"
                  type="number"
                  value={dietPrice}
                  onChange={(e) => setDietPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent transition-all"
                  placeholder="0.00"
                  disabled={saving}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">PLN</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="diet-description" className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1.5 text-[#03adf0]" />
                Opis diety <span className="text-gray-500 text-xs">(opcjonalny)</span>
              </label>
              <textarea
                id="diet-description"
                value={dietDescription}
                onChange={(e) => setDietDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent transition-all resize-none"
                placeholder="Krótki opis diety, np. dieta bezglutenowa, wegańska, itp."
                disabled={saving}
              />
            </div>

            {/* Icon Upload (Optional) */}
            <div>
              <label htmlFor="icon-file" className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1.5 text-[#03adf0]" />
                Ikona SVG (opcjonalnie)
              </label>
              <div className="space-y-3">
                {dietIconUrl && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border-2 border-[#03adf0] rounded-lg">
                    <div className="flex items-center justify-center w-12 h-12 bg-white rounded-lg border border-[#03adf0]">
                      <img 
                        src={dietIconUrl} 
                        alt="Preview"
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Wybrana ikona:</p>
                      <p className="text-xs font-mono text-gray-600 truncate">{dietIconUrl}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDietIconUrl(null);
                        setIconFile(null);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                      disabled={saving || uploadingIcon}
                    >
                      Usuń
                    </button>
                  </div>
                )}
                <div>
                  <input
                    id="icon-file"
                    type="file"
                    accept=".svg"
                    onChange={handleFileChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#03adf0] file:text-white hover:file:bg-[#0288c7] file:cursor-pointer"
                    disabled={saving || uploadingIcon}
                  />
                  {uploadingIcon && (
                    <p className="mt-1.5 text-xs text-blue-600">Przesyłanie ikony...</p>
                  )}
                </div>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Wybierz plik SVG jako ikonę diety. Jeśli nie wybierzesz ikony, dieta będzie wyświetlana bez ikony.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                style={{ cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={saving || !dietName.trim()}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#03adf0] rounded-lg hover:bg-[#0288c7] transition-colors disabled:opacity-50 shadow-sm"
                style={{ cursor: (saving || !dietName.trim()) ? 'not-allowed' : 'pointer' }}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Zapisywanie...' : selectedDiet ? 'Zapisz zmiany' : 'Dodaj dietę'}
              </button>
            </div>
          </form>
        </div>
      </UniversalModal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedDiet(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Usuń dietę"
        message={`Czy na pewno chcesz usunąć dietę "${selectedDiet?.name}"? Ta operacja jest nieodwracalna.`}
        isLoading={saving}
      />
    </div>
  );
}

