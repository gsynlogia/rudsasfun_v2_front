'use client';

import { FileText, Plus, Search, Edit, Trash2, Power, PowerOff, Save, GripVertical } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { authenticatedApiCall } from '@/utils/api-auth';

import DeleteConfirmationModal from './DeleteConfirmationModal';
import UniversalModal from './UniversalModal';


interface Source {
  id: number;
  name: string;
  display_order: number;
  is_active: boolean;
  is_other: boolean;
  created_at: string;
  updated_at: string;
}

export default function SourcesManagement() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<Source | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

  // Form state
  const [sourceName, setSourceName] = useState('');
  const [isOther, setIsOther] = useState(false);

  const fetchSources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authenticatedApiCall<{ sources: Source[]; total: number }>(
        '/api/sources/?include_inactive=true',
      );
      // Sort by display_order
      const sorted = (data.sources || []).sort((a, b) => a.display_order - b.display_order);
      setSources(sorted);
    } catch (err) {
      console.error('[SourcesManagement] Error fetching sources:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas ładowania źródeł');
      setSources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // Filter sources by search query
  const filteredSources = sources.filter((source) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return source.name.toLowerCase().includes(query);
  });

  // Reset form
  const resetForm = () => {
    setSourceName('');
    setIsOther(false);
    setSelectedSource(null);
  };

  // Open create modal
  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  // Open edit modal
  const handleEdit = (source: Source) => {
    setSelectedSource(source);
    setSourceName(source.name);
    setIsOther(source.is_other);
    setShowEditModal(true);
  };

  // Open delete modal
  const handleDelete = (source: Source) => {
    setSelectedSource(source);
    setShowDeleteModal(true);
  };

  // Handle save (create or update)
  const handleSave = async () => {
    if (!sourceName.trim()) {
      setError('Nazwa źródła jest wymagana');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const sourceData = {
        name: sourceName.trim(),
        is_other: isOther,
        is_active: true,
        display_order: 0, // Will be set to max + 1 on backend if 0
      };

      if (selectedSource) {
        await authenticatedApiCall<Source>(`/api/sources/${selectedSource.id}`, {
          method: 'PUT',
          body: JSON.stringify(sourceData),
        });
      } else {
        await authenticatedApiCall<Source>('/api/sources/', {
          method: 'POST',
          body: JSON.stringify(sourceData),
        });
      }

      await fetchSources();
      resetForm();
      setShowCreateModal(false);
      setShowEditModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zapisywania źródła');
      console.error('[SourcesManagement] Error saving source:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!selectedSource) return;
    try {
      setSaving(true);
      setError(null);

      const _response = await authenticatedApiCall(`/api/sources/${selectedSource.id}`, {
        method: 'DELETE',
      });

      // DELETE should return 204 No Content, so response might be empty
      // If we get here without error, deletion was successful
      await fetchSources();
      setShowDeleteModal(false);
      setSelectedSource(null);
      setError(null); // Clear any previous errors
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Błąd podczas usuwania źródła';
      setError(errorMessage);
      console.error('[SourcesManagement] Error deleting source:', err);
      // Keep modal open on error so user can see the error message and try again or cancel
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (source: Source) => {
    try {
      setSaving(true);
      setError(null);
      await authenticatedApiCall(`/api/sources/${source.id}/toggle`, {
        method: 'PATCH',
      });
      await fetchSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zmiany statusu źródła');
      console.error('[SourcesManagement] Error toggling source status:', err);
    } finally {
      setSaving(false);
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, source: Source) => {
    setDraggedItem(source);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverIndex(index);
  };

  const handleDragLeave = () => {
    setDraggedOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDraggedOverIndex(null);

    if (!draggedItem) return;

    const currentIndex = sources.findIndex(s => s.id === draggedItem.id);
    if (currentIndex === targetIndex) return;

    // Create new order array
    const newSources = [...sources];
    const [removed] = newSources.splice(currentIndex, 1);
    newSources.splice(targetIndex, 0, removed);

    // Update display_order for all items
    const sourceOrders = newSources.map((source, index) => ({
      id: source.id,
      display_order: index,
    }));

    try {
      setSaving(true);
      setError(null);
      await authenticatedApiCall<{ sources: Source[]; total: number }>('/api/sources/reorder', {
        method: 'POST',
        body: JSON.stringify({ source_orders: sourceOrders }),
      });
      await fetchSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zmiany kolejności');
      console.error('[SourcesManagement] Error reordering sources:', err);
    } finally {
      setSaving(false);
      setDraggedItem(null);
    }
  };

  return (
    <div className="container mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Zarządzanie Źródłami Informacji (CMS)</h1>

      {/* Search and Add New */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full sm:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj źródeł..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent text-sm"
          />
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#03adf0] text-white rounded-lg hover:bg-[#0288c7] transition-colors shadow-sm text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Dodaj nowe źródło
        </button>
      </div>

      {/* Error Display - Show above everything, including modals */}
      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded z-50 relative">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Sources List */}
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#03adf0]"></div>
          <p className="ml-4 text-gray-600">Ładowanie źródeł...</p>
        </div>
      ) : filteredSources.length === 0 && searchQuery ? (
        <div className="text-center py-10 text-gray-500">
          <p>Brak źródeł pasujących do wyszukiwania.</p>
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <p>Brak źródeł w systemie. Dodaj pierwsze źródło!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kolejność</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nazwa</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Typ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSources.map((source, index) => {
                const isDraggedOver = draggedOverIndex === index;
                return (
                  <tr
                    key={source.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, source)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`${!source.is_active ? 'opacity-50' : ''} ${isDraggedOver ? 'bg-blue-50 border-t-2 border-blue-400' : ''} cursor-move hover:bg-gray-50 transition-colors`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <GripVertical className="w-5 h-5 text-gray-400" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{source.display_order + 1}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{source.name}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        source.is_other
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {source.is_other ? 'Inne' : 'Standardowe'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        source.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {source.is_active ? 'Aktywne' : 'Nieaktywne'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(source)}
                          className="text-gray-600 hover:text-[#03adf0] transition-colors"
                          title={source.is_active ? 'Wyłącz' : 'Włącz'}
                          disabled={saving}
                        >
                          {source.is_active ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(source)}
                          className="text-gray-600 hover:text-[#03adf0] transition-colors"
                          title="Edytuj"
                          disabled={saving}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(source)}
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

      {/* Create/Edit Modal */}
      <UniversalModal
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          resetForm();
        }}
        title={selectedSource ? 'Edytuj źródło' : 'Dodaj nowe źródło'}
        maxWidth="md"
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
              <label htmlFor="source-name" className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1.5 text-[#03adf0]" />
                Nazwa źródła <span className="text-red-500">*</span>
              </label>
              <input
                id="source-name"
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent transition-all"
                placeholder="np. To moja kolejna impreza z Radsas Fun"
                disabled={saving}
              />
            </div>

            {/* Is Other */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOther}
                  onChange={(e) => setIsOther(e.target.checked)}
                  className="w-4 h-4 text-[#03adf0] border-gray-300 rounded focus:ring-[#03adf0]"
                  disabled={saving}
                />
                <span className="text-sm text-gray-700">
                  To opcja &quot;Inne&quot; (wymaga dodatkowego pola tekstowego)
                </span>
              </label>
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
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={saving || !sourceName.trim()}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#03adf0] rounded-lg hover:bg-[#0288c7] transition-colors disabled:opacity-50 shadow-sm"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Zapisywanie...' : selectedSource ? 'Zapisz zmiany' : 'Dodaj źródło'}
              </button>
            </div>
          </form>
        </div>
      </UniversalModal>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedSource && (
        <div>
          <DeleteConfirmationModal
            isOpen={showDeleteModal}
            itemType="other"
            itemName={selectedSource.name}
            itemId={selectedSource.id}
            onConfirm={handleDeleteConfirm}
            onCancel={() => {
              setShowDeleteModal(false);
              setSelectedSource(null);
              setError(null); // Clear error when canceling
            }}
            isLoading={saving}
          />
          {/* Show error in modal overlay if error occurs during delete */}
          {error && showDeleteModal && (
            <div className="fixed inset-0 flex items-center justify-center z-[60] p-4 pointer-events-none">
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded shadow-lg max-w-md w-full pointer-events-auto">
                <p className="text-sm text-red-700 font-medium">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setShowDeleteModal(false);
                    setSelectedSource(null);
                  }}
                  className="mt-2 px-3 py-1 text-xs font-medium text-red-700 bg-white border border-red-300 rounded hover:bg-red-50"
                >
                  Zamknij
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

