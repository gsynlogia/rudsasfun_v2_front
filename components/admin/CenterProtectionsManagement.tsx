'use client';

import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useState, useEffect } from 'react';

import { authenticatedApiCall } from '@/utils/api-auth';

interface GeneralProtectionRelation {
  id: number;
  general_protection_id: number;
  general_protection_name: string;
  general_protection_price: number;
  price: number;  // Center-specific price
  created_at: string;
  updated_at: string;
}

interface CenterProtection {
  id: number;
  property_id: number | null;
  name: string;
  description?: string | null;
  is_active: boolean;
  display_name: string;
  general_protections: GeneralProtectionRelation[];
  property_city?: string | null;
  property_period?: string | null;
}

interface GeneralProtection {
  id: number;
  name: string;
  price: number;  // Cannot be negative
  display_name: string;
}

export default function CenterProtectionsManagement() {
  const [protections, setProtections] = useState<CenterProtection[]>([]);
  const [generalProtections, setGeneralProtections] = useState<GeneralProtection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProtection, setSelectedProtection] = useState<CenterProtection | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [protectionName, setProtectionName] = useState('');
  const [selectedGeneralProtectionIds, setSelectedGeneralProtectionIds] = useState<number[]>([]);
  const [generalProtectionPrices, setGeneralProtectionPrices] = useState<Record<number, number>>({}); // general_protection_id -> price
  const [protectionDescription, setProtectionDescription] = useState('');

  useEffect(() => {
    fetchProtections();
    fetchGeneralProtections();
  }, []);

  const fetchProtections = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authenticatedApiCall<{ protections: CenterProtection[]; total: number; page: number; limit: number }>('/api/center-protections/');
      setProtections(data.protections || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas ładowania ochron');
      console.error('[CenterProtectionsManagement] Error fetching protections:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGeneralProtections = async () => {
    try {
      const data = await authenticatedApiCall<{ protections: GeneralProtection[] }>('/api/general-protections/');
      setGeneralProtections(data.protections || []);
    } catch (err) {
      console.error('[CenterProtectionsManagement] Error fetching general protections:', err);
    }
  };

  const resetForm = () => {
    setProtectionName('');
    setSelectedGeneralProtectionIds([]);
    setGeneralProtectionPrices({});
    setProtectionDescription('');
    setSelectedProtection(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEdit = (protection: CenterProtection) => {
    setSelectedProtection(protection);
    setProtectionName(protection.name);
    setProtectionDescription(protection.description || '');

    // Set selected general protections and their prices
    const selectedIds: number[] = [];
    const prices: Record<number, number> = {};
    protection.general_protections.forEach(rel => {
      selectedIds.push(rel.general_protection_id);
      prices[rel.general_protection_id] = rel.price;
    });
    setSelectedGeneralProtectionIds(selectedIds);
    setGeneralProtectionPrices(prices);

    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!protectionName.trim()) {
      setError('Nazwa ochrony dla ośrodka jest wymagana');
      return;
    }

    // Validate prices are non-negative
    for (const generalProtectionId of selectedGeneralProtectionIds) {
      const price = generalProtectionPrices[generalProtectionId];
      if (price === undefined || price < 0) {
        setError('Wszystkie ceny muszą być większe lub równe 0');
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);

      // Build general protections list with prices
      const generalProtectionsList = selectedGeneralProtectionIds.map(generalProtectionId => ({
        general_protection_id: generalProtectionId,
        price: Number(generalProtectionPrices[generalProtectionId]) || 0,  // Cannot be negative
      }));

      const protectionData = {
        property_id: null,  // Will be set elsewhere (in turnus edit page)
        name: protectionName.trim(),
        description: protectionDescription.trim() || null,
        is_active: true,
        general_protections: generalProtectionsList,
        // NO icon fields
      };

      if (selectedProtection) {
        await authenticatedApiCall<CenterProtection>(`/api/center-protections/${selectedProtection.id}`, {
          method: 'PUT',
          body: JSON.stringify(protectionData),
        });
      } else {
        await authenticatedApiCall<CenterProtection>('/api/center-protections/', {
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
      console.error('[CenterProtectionsManagement] Error saving protection:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (protection: CenterProtection) => {
    if (!confirm(`Czy na pewno chcesz usunąć ochronę "${protection.display_name}"?`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await authenticatedApiCall(`/api/center-protections/${protection.id}`, {
        method: 'DELETE',
      });
      await fetchProtections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas usuwania ochrony');
      console.error('[CenterProtectionsManagement] Error deleting protection:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Ładowanie ochron dla ośrodków...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Ochrony dla ośrodków</h1>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nazwa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ochrony ogólne</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {protections.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                  Brak ochron dla ośrodków. Kliknij "Dodaj ochronę", aby utworzyć nową.
                </td>
              </tr>
            ) : (
              protections.map((protection) => (
              <tr key={protection.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{protection.display_name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {protection.general_protections.length > 0 ? (
                    <ul className="list-disc list-inside">
                      {protection.general_protections.map((rel) => (
                        <li key={rel.id}>
                          {rel.general_protection_name} - {rel.price.toFixed(2)} PLN
                        </li>
                      ))}
                    </ul>
                  ) : (
                    '-'
                  )}
                </td>
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
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {selectedProtection ? 'Edytuj ochronę dla ośrodka' : 'Dodaj ochronę dla ośrodka'}
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
                  Nazwa ochrony dla ośrodka *
                </label>
                <input
                  type="text"
                  value={protectionName}
                  onChange={(e) => setProtectionName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  placeholder="np. BEAVER Ochrona - Podstawowa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wybór ochron ogólnych
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {generalProtections.length === 0 ? (
                    <p className="text-sm text-gray-500">Brak dostępnych ochron ogólnych</p>
                  ) : (
                    generalProtections.map((gp) => {
                      const isSelected = selectedGeneralProtectionIds.includes(gp.id);
                      return (
                        <div key={gp.id} className="flex items-center gap-3 mb-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGeneralProtectionIds([...selectedGeneralProtectionIds, gp.id]);
                                setGeneralProtectionPrices({
                                  ...generalProtectionPrices,
                                  [gp.id]: gp.price,  // Prefill with general protection's price
                                });
                              } else {
                                setSelectedGeneralProtectionIds(selectedGeneralProtectionIds.filter(id => id !== gp.id));
                                const newPrices = { ...generalProtectionPrices };
                                delete newPrices[gp.id];
                                setGeneralProtectionPrices(newPrices);
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <label className="flex-1 text-sm">
                            {gp.display_name} (cena referencyjna: {gp.price.toFixed(2)} PLN)
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {selectedGeneralProtectionIds.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wybrane ochrony ogólne - ceny dla tego ośrodka
                  </label>
                  <div className="space-y-2">
                    {selectedGeneralProtectionIds.map((generalProtectionId) => {
                      const generalProtection = generalProtections.find(gp => gp.id === generalProtectionId);
                      if (!generalProtection) return null;
                      return (
                        <div key={generalProtectionId} className="flex items-center gap-3">
                          <label className="w-48 text-sm text-gray-700">{generalProtection.display_name}:</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={generalProtectionPrices[generalProtectionId] ?? generalProtection.price}
                            onChange={(e) => {
                              const price = e.target.value ? parseFloat(e.target.value) : generalProtection.price;
                              if (price < 0) {
                                setError('Cena nie może być ujemna');
                                return;
                              }
                              setGeneralProtectionPrices({
                                ...generalProtectionPrices,
                                [generalProtectionId]: price,
                              });
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                            placeholder="Cena (≥ 0)"
                          />
                          <span className="text-sm text-gray-500">PLN</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Cena ochrony dla tego ośrodka (musi być większa lub równa 0)
                  </p>
                </div>
              )}

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