'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Power, PowerOff, Save, DollarSign, GripVertical } from 'lucide-react';
import UniversalModal from './UniversalModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { authenticatedApiCall } from '@/utils/api-auth';

interface Addon {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  icon_svg?: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AddonsManagement() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState<Addon | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<Addon | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

  // Form state
  const [addonName, setAddonName] = useState('');
  const [addonDescription, setAddonDescription] = useState('');
  const [addonPrice, setAddonPrice] = useState<number | ''>(0);
  const [addonIconSvg, setAddonIconSvg] = useState('');

  const fetchAddons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authenticatedApiCall<{ addons: Addon[]; total: number }>(
        '/api/addons/?include_inactive=true'
      );
      // Sort by display_order
      const sorted = (data.addons || []).sort((a, b) => a.display_order - b.display_order);
      setAddons(sorted);
    } catch (err) {
      console.error('[AddonsManagement] Error fetching addons:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas ładowania dodatków');
      setAddons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddons();
  }, [fetchAddons]);

  // Filter addons by search query
  const filteredAddons = addons.filter((addon) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      addon.name.toLowerCase().includes(query) ||
      (addon.description && addon.description.toLowerCase().includes(query))
    );
  });

  // Reset form
  const resetForm = () => {
    setAddonName('');
    setAddonDescription('');
    setAddonPrice(0);
    setAddonIconSvg('');
    setSelectedAddon(null);
  };

  // Open create modal
  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  // Open edit modal
  const handleEdit = (addon: Addon) => {
    setSelectedAddon(addon);
    setAddonName(addon.name);
    setAddonDescription(addon.description || '');
    setAddonPrice(addon.price);
    setAddonIconSvg(addon.icon_svg || '');
    setShowEditModal(true);
  };

  // Open delete modal
  const handleDelete = (addon: Addon) => {
    setSelectedAddon(addon);
    setShowDeleteModal(true);
  };

  // Handle save (create or update)
  const handleSave = async () => {
    if (!addonName.trim()) {
      setError('Nazwa dodatku jest wymagana');
      return;
    }

    if (addonPrice === '' || addonPrice < 0) {
      setError('Cena musi być większa lub równa 0');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const addonData = {
        name: addonName.trim(),
        description: addonDescription.trim() || null,
        price: Number(addonPrice),
        icon_svg: addonIconSvg.trim() || null,
        is_active: true,
        display_order: 0, // Will be set to max + 1 on backend if 0
      };

      if (selectedAddon) {
        await authenticatedApiCall<Addon>(`/api/addons/${selectedAddon.id}`, {
          method: 'PUT',
          body: JSON.stringify(addonData),
        });
      } else {
        await authenticatedApiCall<Addon>('/api/addons/', {
          method: 'POST',
          body: JSON.stringify(addonData),
        });
      }

      await fetchAddons();
      resetForm();
      setShowCreateModal(false);
      setShowEditModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zapisywania dodatku');
      console.error('[AddonsManagement] Error saving addon:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!selectedAddon) return;
    try {
      setSaving(true);
      setError(null);
      await authenticatedApiCall(`/api/addons/${selectedAddon.id}`, {
        method: 'DELETE',
      });
      await fetchAddons();
      setShowDeleteModal(false);
      setSelectedAddon(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas usuwania dodatku');
      console.error('[AddonsManagement] Error deleting addon:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (addon: Addon) => {
    try {
      setSaving(true);
      setError(null);
      await authenticatedApiCall(`/api/addons/${addon.id}/toggle`, {
        method: 'PATCH',
      });
      await fetchAddons();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zmiany statusu dodatku');
      console.error('[AddonsManagement] Error toggling addon status:', err);
    } finally {
      setSaving(false);
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, addon: Addon) => {
    setDraggedItem(addon);
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

    const currentIndex = addons.findIndex(a => a.id === draggedItem.id);
    if (currentIndex === targetIndex) return;

    // Create new order array
    const newAddons = [...addons];
    const [removed] = newAddons.splice(currentIndex, 1);
    newAddons.splice(targetIndex, 0, removed);

    // Update display_order for all items
    const addonOrders = newAddons.map((addon, index) => ({
      id: addon.id,
      display_order: index,
    }));

    try {
      setSaving(true);
      setError(null);
      await authenticatedApiCall<{ addons: Addon[]; total: number }>('/api/addons/reorder', {
        method: 'POST',
        body: JSON.stringify({ addon_orders: addonOrders }),
      });
      await fetchAddons();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zmiany kolejności');
      console.error('[AddonsManagement] Error reordering addons:', err);
    } finally {
      setSaving(false);
      setDraggedItem(null);
    }
  };

  return (
    <div className="container mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Zarządzanie dodatkami</h1>

      {/* Search and Add New */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full sm:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj dodatków..."
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
          Dodaj nowy dodatek
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Addons List */}
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#03adf0]"></div>
          <p className="ml-4 text-gray-600">Ładowanie dodatków...</p>
        </div>
      ) : filteredAddons.length === 0 && searchQuery ? (
        <div className="text-center py-10 text-gray-500">
          <p>Brak dodatków pasujących do wyszukiwania.</p>
        </div>
      ) : filteredAddons.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <p>Brak dodatków w systemie. Dodaj pierwszy dodatek!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kolejność</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nazwa</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opis</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cena</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAddons.map((addon, index) => {
                const isDraggedOver = draggedOverIndex === index;
                return (
                  <tr
                    key={addon.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, addon)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`${!addon.is_active ? 'opacity-50' : ''} ${isDraggedOver ? 'bg-blue-50 border-t-2 border-blue-400' : ''} cursor-move hover:bg-gray-50 transition-colors`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <GripVertical className="w-5 h-5 text-gray-400" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{addon.display_order + 1}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{addon.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {addon.description || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{addon.price.toFixed(2)} PLN</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        addon.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {addon.is_active ? 'Aktywny' : 'Nieaktywny'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(addon)}
                          className="text-gray-600 hover:text-[#03adf0] transition-colors"
                          title={addon.is_active ? 'Wyłącz' : 'Włącz'}
                          disabled={saving}
                        >
                          {addon.is_active ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(addon)}
                          className="text-gray-600 hover:text-[#03adf0] transition-colors"
                          title="Edytuj"
                          disabled={saving}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(addon)}
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
        title={selectedAddon ? 'Edytuj dodatek' : 'Dodaj nowy dodatek'}
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
              <label htmlFor="addon-name" className="block text-sm font-medium text-gray-700 mb-2">
                Nazwa dodatku <span className="text-red-500">*</span>
              </label>
              <input
                id="addon-name"
                type="text"
                value={addonName}
                onChange={(e) => setAddonName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent transition-all"
                placeholder="np. Skuter wodny"
                disabled={saving}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="addon-description" className="block text-sm font-medium text-gray-700 mb-2">
                Opis dodatku <span className="text-gray-500 text-xs">(opcjonalny)</span>
              </label>
              <textarea
                id="addon-description"
                value={addonDescription}
                onChange={(e) => setAddonDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent transition-all resize-none"
                placeholder="np. 20 minut przejażdżki z opiekunem"
                disabled={saving}
              />
            </div>

            {/* Price */}
            <div>
              <label htmlFor="addon-price" className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1.5 text-[#03adf0]" />
                Cena (PLN) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="addon-price"
                  type="number"
                  value={addonPrice}
                  onChange={(e) => setAddonPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
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

            {/* Icon SVG */}
            <div>
              <label htmlFor="addon-icon-svg" className="block text-sm font-medium text-gray-700 mb-2">
                Kod SVG ikony <span className="text-gray-500 text-xs">(opcjonalny)</span>
              </label>
              <textarea
                id="addon-icon-svg"
                value={addonIconSvg}
                onChange={(e) => setAddonIconSvg(e.target.value)}
                rows={5}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent transition-all resize-none font-mono text-xs"
                placeholder="<svg>...</svg>"
                disabled={saving}
              />
              <p className="mt-2 text-xs text-gray-500">
                Wklej kod SVG ikony dla tego dodatku.
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
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={saving || !addonName.trim()}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#03adf0] rounded-lg hover:bg-[#0288c7] transition-colors disabled:opacity-50 shadow-sm"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Zapisywanie...' : selectedAddon ? 'Zapisz zmiany' : 'Dodaj dodatek'}
              </button>
            </div>
          </form>
        </div>
      </UniversalModal>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAddon && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          itemType="other"
          itemName={selectedAddon.name}
          itemId={selectedAddon.id}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setShowDeleteModal(false);
            setSelectedAddon(null);
            setError(null);
          }}
          isLoading={saving}
        />
      )}
    </div>
  );
}

