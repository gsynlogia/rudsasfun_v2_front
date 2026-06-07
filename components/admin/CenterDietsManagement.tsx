'use client';

import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useState, useEffect } from 'react';

import { authenticatedApiCall } from '@/utils/api-auth';

interface GeneralDietRelation {
  id: number;
  general_diet_id: number;
  general_diet_name: string;
  general_diet_price: number;
  price: number;
  created_at: string;
  updated_at: string;
}

interface CenterDiet {
  id: number;
  property_id: number | null;
  name: string;
  description?: string | null;
  is_active: boolean;
  display_name: string;
  general_diets: GeneralDietRelation[];
  property_city?: string | null;
  property_period?: string | null;
}

interface GeneralDiet {
  id: number;
  name: string;
  price: number;
  display_name: string;
}

interface CampProperty {
  id: number;
  camp_id: number;
  period: string;
  city: string;
  start_date: string;
  end_date: string;
}

export default function CenterDietsManagement() {
  const [diets, setDiets] = useState<CenterDiet[]>([]);
  const [generalDiets, setGeneralDiets] = useState<GeneralDiet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDiet, setSelectedDiet] = useState<CenterDiet | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [dietName, setDietName] = useState('');
  const [selectedGeneralDietIds, setSelectedGeneralDietIds] = useState<number[]>([]);
  const [generalDietPrices, setGeneralDietPrices] = useState<Record<number, number>>({}); // general_diet_id -> price
  const [dietDescription, setDietDescription] = useState('');

  useEffect(() => {
    fetchDiets();
    fetchGeneralDiets();
  }, []);

  const fetchDiets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authenticatedApiCall<{ diets: CenterDiet[]; total: number; page: number; limit: number }>('/api/center-diets/');
      setDiets(data.diets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas ładowania diet');
      console.error('[CenterDietsManagement] Error fetching diets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGeneralDiets = async () => {
    try {
      const data = await authenticatedApiCall<{ diets: GeneralDiet[] }>('/api/general-diets/');
      setGeneralDiets(data.diets || []);
    } catch (err) {
      console.error('[CenterDietsManagement] Error fetching general diets:', err);
    }
  };

  // Properties are no longer needed - will be set elsewhere
  const fetchProperties = async () => {
    // No longer fetching properties
  };

  const resetForm = () => {
    setDietName('');
    setSelectedGeneralDietIds([]);
    setGeneralDietPrices({});
    setDietDescription('');
    setSelectedDiet(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEdit = (diet: CenterDiet) => {
    setSelectedDiet(diet);
    setDietName(diet.name || '');

    // Populate selected general diets and their prices
    const selectedIds: number[] = [];
    const prices: Record<number, number> = {};
    diet.general_diets.forEach(rel => {
      selectedIds.push(rel.general_diet_id);
      prices[rel.general_diet_id] = rel.price;
    });
    setSelectedGeneralDietIds(selectedIds);
    setGeneralDietPrices(prices);

    setDietDescription(diet.description || '');
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!dietName.trim()) {
      setError('Nazwa diety dla ośrodka jest wymagana');
      return;
    }

    // Validate all prices
    for (const generalDietId of selectedGeneralDietIds) {
      const price = generalDietPrices[generalDietId];
      if (price === undefined || price === null || Number(price) < 0) {
        setError(`Cena dla diety ${generalDiets.find(gd => gd.id === generalDietId)?.name || generalDietId} musi być większa lub równa 0`);
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);

      // Build general diets list with prices
      const generalDietsList = selectedGeneralDietIds.map(generalDietId => ({
        general_diet_id: generalDietId,
        price: Number(generalDietPrices[generalDietId]),
      }));

      const payload = {
        property_id: null, // Will be set elsewhere
        name: dietName.trim(),
        description: dietDescription.trim() || null,
        is_active: true,
        general_diets: generalDietsList,
      };

      if (selectedDiet) {
        await authenticatedApiCall<CenterDiet>(`/api/center-diets/${selectedDiet.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await authenticatedApiCall<CenterDiet>('/api/center-diets/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      await fetchDiets();
      resetForm();
      setShowCreateModal(false);
      setShowEditModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zapisywania diety');
      console.error('[CenterDietsManagement] Error saving diet:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (diet: CenterDiet) => {
    if (!confirm(`Czy na pewno chcesz usunąć dietę "${diet.display_name}"?`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await authenticatedApiCall(`/api/center-diets/${diet.id}`, {
        method: 'DELETE',
      });
      await fetchDiets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas usuwania diety');
      console.error('[CenterDietsManagement] Error deleting diet:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Ładowanie diet dla ośrodków...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Diety dla ośrodków</h1>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nazwa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cena</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {diets.map((diet) => (
              <tr key={diet.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{diet.display_name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {diet.general_diets && diet.general_diets.length > 0 ? (
                    <div className="space-y-1">
                      {diet.general_diets.map((rel) => (
                        <div key={rel.id} className="text-xs">
                          {rel.general_diet_name}: {rel.price.toFixed(2)} PLN
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">Brak</span>
                  )}
                </td>
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
            ))}
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
                  {selectedDiet ? 'Edytuj dietę dla ośrodka' : 'Dodaj dietę dla ośrodka'}
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
              {/* 1. Nazwa diety dla ośrodka - PIERWSZA POZYCJA */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nazwa diety dla ośrodka *
                </label>
                <input
                  type="text"
                  value={dietName}
                  onChange={(e) => setDietName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                  placeholder="Wprowadź nazwę diety dla ośrodka"
                  disabled={saving}
                />
              </div>

              {/* 2. Wybór diet ogólnych - MULTI-SELECT */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wybierz diety ogólne
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {generalDiets.map((gd) => (
                    <label key={gd.id} className="flex items-center mb-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedGeneralDietIds.includes(gd.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Add to selection and prefill price from general diet
                            setSelectedGeneralDietIds([...selectedGeneralDietIds, gd.id]);
                            setGeneralDietPrices({
                              ...generalDietPrices,
                              [gd.id]: gd.price,
                            });
                          } else {
                            // Remove from selection
                            setSelectedGeneralDietIds(selectedGeneralDietIds.filter(id => id !== gd.id));
                            const newPrices = { ...generalDietPrices };
                            delete newPrices[gd.id];
                            setGeneralDietPrices(newPrices);
                          }
                        }}
                        className="mr-2"
                        disabled={saving}
                      />
                      <span className="text-sm text-gray-700">
                        {gd.display_name} - {gd.price.toFixed(2)} PLN
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 3. Lista wybranych diet z cenami */}
              {selectedGeneralDietIds.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wybrane diety ogólne - ceny dla tego ośrodka
                  </label>
                  <div className="space-y-3 border border-gray-300 rounded-lg p-4 bg-gray-50">
                    {selectedGeneralDietIds.map((generalDietId) => {
                      const generalDiet = generalDiets.find(gd => gd.id === generalDietId);
                      if (!generalDiet) return null;

                      return (
                        <div key={generalDietId} className="flex items-center gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">{generalDiet.display_name}</p>
                            <p className="text-xs text-gray-500">
                              Cena referencyjna: {generalDiet.price.toFixed(2)} PLN
                            </p>
                          </div>
                          <div className="w-32">
                            <label className="block text-xs text-gray-600 mb-1">Cena dla ośrodka</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={generalDietPrices[generalDietId] || generalDiet.price}
                              onChange={(e) => {
                                const price = e.target.value ? parseFloat(e.target.value) : generalDiet.price;
                                setGeneralDietPrices({
                                  ...generalDietPrices,
                                  [generalDietId]: price,
                                });
                              }}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                              disabled={saving}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Możesz zmienić cenę dla każdej diety ogólnej. To nie zmienia cen w dietach ogólnych.
                  </p>
                </div>
              )}

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
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(false);
                  setShowEditModal(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Anuluj
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#03adf0] text-white rounded-lg hover:bg-[#0288c7] disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Zapisywanie...' : 'Zapisz'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}