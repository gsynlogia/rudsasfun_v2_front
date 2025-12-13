'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { authenticatedApiCall } from '@/utils/api-auth';

interface GeneralPromotionRelation {
  id: number;
  general_promotion_id: number;
  general_promotion_name: string;
  general_promotion_price: number;  // Can be negative
  price: number;  // Center-specific price (can be negative)
  created_at: string;
  updated_at: string;
}

interface CenterPromotion {
  id: number;
  property_id: number | null;
  name: string;
  description?: string | null;
  is_active: boolean;
  display_name: string;
  general_promotions: GeneralPromotionRelation[];
  property_city?: string | null;
  property_period?: string | null;
}

interface GeneralPromotion {
  id: number;
  name: string;
  price: number;  // Can be negative
  display_name: string;
}

export default function CenterPromotionsManagement() {
  const [promotions, setPromotions] = useState<CenterPromotion[]>([]);
  const [generalPromotions, setGeneralPromotions] = useState<GeneralPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<CenterPromotion | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [promotionName, setPromotionName] = useState('');
  const [selectedGeneralPromotionIds, setSelectedGeneralPromotionIds] = useState<number[]>([]);
  const [generalPromotionPrices, setGeneralPromotionPrices] = useState<Record<number, number>>({}); // general_promotion_id -> price (can be negative)
  const [promotionDescription, setPromotionDescription] = useState('');

  useEffect(() => {
    fetchPromotions();
    fetchGeneralPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authenticatedApiCall<{ promotions: CenterPromotion[]; total: number; page: number; limit: number }>('/api/center-promotions/');
      setPromotions(data.promotions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas ładowania promocji');
      console.error('[CenterPromotionsManagement] Error fetching promotions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGeneralPromotions = async () => {
    try {
      const data = await authenticatedApiCall<{ promotions: GeneralPromotion[] }>('/api/general-promotions/');
      setGeneralPromotions(data.promotions || []);
    } catch (err) {
      console.error('[CenterPromotionsManagement] Error fetching general promotions:', err);
    }
  };

  const resetForm = () => {
    setPromotionName('');
    setSelectedGeneralPromotionIds([]);
    setGeneralPromotionPrices({});
    setPromotionDescription('');
    setSelectedPromotion(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEdit = (promotion: CenterPromotion) => {
    setSelectedPromotion(promotion);
    setPromotionName(promotion.name);
    setPromotionDescription(promotion.description || '');
    
    // Set selected general promotions and their prices
    const selectedIds: number[] = [];
    const prices: Record<number, number> = {};
    promotion.general_promotions.forEach(rel => {
      selectedIds.push(rel.general_promotion_id);
      prices[rel.general_promotion_id] = rel.price;
    });
    setSelectedGeneralPromotionIds(selectedIds);
    setGeneralPromotionPrices(prices);
    
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!promotionName.trim()) {
      setError('Nazwa promocji dla ośrodka jest wymagana');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Build general promotions list with prices
      const generalPromotionsList = selectedGeneralPromotionIds.map(generalPromotionId => ({
        general_promotion_id: generalPromotionId,
        price: Number(generalPromotionPrices[generalPromotionId]) || 0  // Can be negative
      }));

      const promotionData = {
        property_id: null,  // Will be set elsewhere (in turnus edit page)
        name: promotionName.trim(),
        description: promotionDescription.trim() || null,
        is_active: true,
        general_promotions: generalPromotionsList,
        // NO icon fields
      };

      if (selectedPromotion) {
        await authenticatedApiCall<CenterPromotion>(`/api/center-promotions/${selectedPromotion.id}`, {
          method: 'PUT',
          body: JSON.stringify(promotionData),
        });
      } else {
        await authenticatedApiCall<CenterPromotion>('/api/center-promotions/', {
          method: 'POST',
          body: JSON.stringify(promotionData),
        });
      }

      await fetchPromotions();
      resetForm();
      setShowCreateModal(false);
      setShowEditModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zapisywania promocji');
      console.error('[CenterPromotionsManagement] Error saving promotion:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (promotion: CenterPromotion) => {
    if (!confirm(`Czy na pewno chcesz usunąć promocję "${promotion.display_name}"?`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await authenticatedApiCall(`/api/center-promotions/${promotion.id}`, {
        method: 'DELETE',
      });
      await fetchPromotions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas usuwania promocji');
      console.error('[CenterPromotionsManagement] Error deleting promotion:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Ładowanie promocji dla ośrodków...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Promocje dla ośrodków</h1>
        <button
          onClick={handleCreate}
          className="bg-[#03adf0] text-white px-4 py-2 rounded-lg hover:bg-[#0288c7] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Dodaj promocję
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Promocje ogólne</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {promotions.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                  Brak promocji dla ośrodków. Kliknij "Dodaj promocję", aby utworzyć nową.
                </td>
              </tr>
            ) : (
              promotions.map((promotion) => (
              <tr key={promotion.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{promotion.display_name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {promotion.general_promotions.length > 0 ? (
                    <ul className="list-disc list-inside">
                      {promotion.general_promotions.map((rel) => (
                        <li key={rel.id}>
                          {rel.general_promotion_name} - {rel.price < 0 
                            ? `${rel.price.toFixed(2)} PLN` 
                            : rel.price > 0 
                              ? `+${rel.price.toFixed(2)} PLN` 
                              : '0.00 PLN'
                          }
                        </li>
                      ))}
                    </ul>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(promotion)}
                    className="text-[#03adf0] hover:text-[#0288c7] mr-4"
                  >
                    <Edit className="w-4 h-4 inline" />
                  </button>
                  <button
                    onClick={() => handleDelete(promotion)}
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
                {selectedPromotion ? 'Edytuj promocję dla ośrodka' : 'Dodaj promocję dla ośrodka'}
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
                  Nazwa promocji dla ośrodka *
                </label>
                <input
                  type="text"
                  value={promotionName}
                  onChange={(e) => setPromotionName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  placeholder="np. BEAVER Promocja - Wczesna"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wybór promocji ogólnych
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {generalPromotions.length === 0 ? (
                    <p className="text-sm text-gray-500">Brak dostępnych promocji ogólnych</p>
                  ) : (
                    generalPromotions.map((gp) => {
                      const isSelected = selectedGeneralPromotionIds.includes(gp.id);
                      return (
                        <div key={gp.id} className="flex items-center gap-3 mb-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGeneralPromotionIds([...selectedGeneralPromotionIds, gp.id]);
                                setGeneralPromotionPrices({
                                  ...generalPromotionPrices,
                                  [gp.id]: gp.price  // Prefill with general promotion's price
                                });
                              } else {
                                setSelectedGeneralPromotionIds(selectedGeneralPromotionIds.filter(id => id !== gp.id));
                                const newPrices = { ...generalPromotionPrices };
                                delete newPrices[gp.id];
                                setGeneralPromotionPrices(newPrices);
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <label className="flex-1 text-sm">
                            {gp.display_name} (cena referencyjna: {gp.price < 0 
                              ? `${gp.price.toFixed(2)} PLN` 
                              : gp.price > 0 
                                ? `+${gp.price.toFixed(2)} PLN` 
                                : '0.00 PLN'
                            })
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {selectedGeneralPromotionIds.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wybrane promocje ogólne - ceny dla tego ośrodka
                  </label>
                  <div className="space-y-2">
                    {selectedGeneralPromotionIds.map((generalPromotionId) => {
                      const generalPromotion = generalPromotions.find(gp => gp.id === generalPromotionId);
                      if (!generalPromotion) return null;
                      return (
                        <div key={generalPromotionId} className="flex items-center gap-3">
                          <label className="w-48 text-sm text-gray-700">{generalPromotion.display_name}:</label>
                          <input
                            type="number"
                            step="0.01"
                            value={generalPromotionPrices[generalPromotionId] ?? generalPromotion.price}
                            onChange={(e) => {
                              const price = e.target.value ? parseFloat(e.target.value) : generalPromotion.price;
                              setGeneralPromotionPrices({
                                ...generalPromotionPrices,
                                [generalPromotionId]: price  // Can be negative
                              });
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                            placeholder="Cena (może być ujemna)"
                          />
                          <span className="text-sm text-gray-500">PLN</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Ujemna wartość oznacza rabat, dodatnia oznacza dodatkową opłatę
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opis (opcjonalne)
                </label>
                <textarea
                  value={promotionDescription}
                  onChange={(e) => setPromotionDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  rows={3}
                  placeholder="Szczegółowy opis promocji..."
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







