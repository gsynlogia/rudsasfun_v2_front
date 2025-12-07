'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { authenticatedApiCall } from '@/utils/api-auth';

interface GeneralDiet {
  id: number;
  name: string;
  price: number;
  description?: string | null;
  start_date: string;
  end_date: string;
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchDiets();
  }, []);

  const fetchDiets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authenticatedApiCall<{ diets: GeneralDiet[]; total: number; page: number; limit: number }>('/api/general-diets/');
      setDiets(data.diets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas ładowania diet');
      console.error('[GeneralDietsManagement] Error fetching diets:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDietName('');
    setDietPrice(0);
    setDietDescription('');
    setStartDate('');
    setEndDate('');
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
    setStartDate(diet.start_date);
    setEndDate(diet.end_date);
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!dietName.trim()) {
      setError('Nazwa diety jest wymagana');
      return;
    }
    if (!startDate || !endDate) {
      setError('Daty rozpoczęcia i zakończenia są wymagane');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const dietData = {
        name: dietName.trim(),
        price: Number(dietPrice),
        description: dietDescription.trim() || null,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
      };

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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nazwa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cena</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Okres obowiązywania</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {diets.map((diet) => (
              <tr key={diet.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{diet.display_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{diet.price.toFixed(2)} PLN</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(diet.start_date).toLocaleDateString('pl-PL')} - {new Date(diet.end_date).toLocaleDateString('pl-PL')}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">
              {selectedDiet ? 'Edytuj dietę ogólną' : 'Dodaj dietę ogólną'}
            </h2>
            
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
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data rozpoczęcia *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data zakończenia *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                  />
                </div>
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
      )}
    </div>
  );
}

