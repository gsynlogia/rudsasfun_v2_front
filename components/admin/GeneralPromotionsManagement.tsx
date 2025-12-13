'use client';

import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useState, useEffect } from 'react';

import { authenticatedApiCall } from '@/utils/api-auth';

interface GeneralPromotion {
  id: number;
  name: string;
  price: number;  // Can be negative for discounts
  description?: string | null;
  is_active: boolean;
  display_name: string;
}

export default function GeneralPromotionsManagement() {
  const [promotions, setPromotions] = useState<GeneralPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<GeneralPromotion | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [promotionName, setPromotionName] = useState('');
  const [promotionPrice, setPromotionPrice] = useState<number | ''>(0);
  const [promotionDescription, setPromotionDescription] = useState('');

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authenticatedApiCall<{ promotions: GeneralPromotion[]; total: number; page: number; limit: number }>('/api/general-promotions/?page=1&limit=100');
      setPromotions(data.promotions || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Błąd podczas ładowania promocji';
      console.error('[GeneralPromotionsManagement] Error fetching promotions:', err);

      if (errorMessage.includes('404') || errorMessage.includes('Not found')) {
        setPromotions([]);
        setError(null);
      } else if (errorMessage.includes('401') || errorMessage.includes('Session expired')) {
        setError('Sesja wygasła. Zaloguj się ponownie.');
        setPromotions([]);
      } else {
        setError(errorMessage);
        setPromotions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPromotionName('');
    setPromotionPrice(0);
    setPromotionDescription('');
    setSelectedPromotion(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEdit = (promotion: GeneralPromotion) => {
    setSelectedPromotion(promotion);
    setPromotionName(promotion.name);
    setPromotionPrice(promotion.price);
    setPromotionDescription(promotion.description || '');
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!promotionName.trim()) {
      setError('Nazwa promocji jest wymagana');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const promotionData = {
        name: promotionName.trim(),
        price: Number(promotionPrice),  // Can be negative
        description: promotionDescription.trim() || null,
        is_active: true,
        // NO icon fields
      };

      if (selectedPromotion) {
        await authenticatedApiCall<GeneralPromotion>(`/api/general-promotions/${selectedPromotion.id}`, {
          method: 'PUT',
          body: JSON.stringify(promotionData),
        });
      } else {
        await authenticatedApiCall<GeneralPromotion>('/api/general-promotions/', {
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
      console.error('[GeneralPromotionsManagement] Error saving promotion:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (promotion: GeneralPromotion) => {
    if (!confirm(`Czy na pewno chcesz usunąć promocję "${promotion.display_name}"?`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await authenticatedApiCall(`/api/general-promotions/${promotion.id}`, {
        method: 'DELETE',
      });
      await fetchPromotions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas usuwania promocji');
      console.error('[GeneralPromotionsManagement] Error deleting promotion:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Ładowanie promocji ogólnych...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Promocje ogólne</h1>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cena</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opis</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {promotions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                  Brak promocji ogólnych. Kliknij &quot;Dodaj promocję&quot;, aby utworzyć nową.
                </td>
              </tr>
            ) : (
              promotions.map((promotion) => (
              <tr key={promotion.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{promotion.display_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {promotion.price < 0
                    ? `${promotion.price.toFixed(2)} PLN`  // Negative price (discount)
                    : promotion.price > 0
                      ? `+${promotion.price.toFixed(2)} PLN`  // Positive price
                      : '0.00 PLN'  // Free
                  }
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{promotion.description || '-'}</td>
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
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {selectedPromotion ? 'Edytuj promocję' : 'Dodaj promocję'}
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
                  Nazwa promocji *
                </label>
                <input
                  type="text"
                  value={promotionName}
                  onChange={(e) => setPromotionName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  placeholder="np. Wczesna rezerwacja"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cena (PLN) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={promotionPrice}
                  onChange={(e) => setPromotionPrice(e.target.value ? parseFloat(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  placeholder="np. -100.00 (ujemna = rabat)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ujemna wartość oznacza rabat (np. -100.00), dodatnia oznacza dodatkową opłatę
                </p>
              </div>

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

              {/* NO icon fields (unlike GeneralDietsManagement) */}
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

