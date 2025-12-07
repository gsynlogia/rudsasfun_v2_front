'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { authenticatedApiCall } from '@/utils/api-auth';

interface CenterDiet {
  id: number;
  property_id: number;
  general_diet_id?: number | null;
  name?: string | null;
  price: number;
  description?: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  display_name: string;
  general_diet_name?: string | null;
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
  const [properties, setProperties] = useState<CampProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDiet, setSelectedDiet] = useState<CenterDiet | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [propertyId, setPropertyId] = useState<number | ''>('');
  const [selectedGeneralDietIds, setSelectedGeneralDietIds] = useState<number[]>([]);
  const [dietName, setDietName] = useState('');
  const [dietPrice, setDietPrice] = useState<number | ''>(0);
  const [dietDescription, setDietDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCustomDiet, setIsCustomDiet] = useState(false);

  useEffect(() => {
    fetchDiets();
    fetchGeneralDiets();
    fetchProperties();
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

  const fetchProperties = async () => {
    try {
      const campsData = await authenticatedApiCall<{ camps: Array<{ properties: CampProperty[] }> }>('/api/camps/');
      const allProperties: CampProperty[] = [];
      campsData.camps?.forEach(camp => {
        if (camp.properties) {
          allProperties.push(...camp.properties);
        }
      });
      setProperties(allProperties);
    } catch (err) {
      console.error('[CenterDietsManagement] Error fetching properties:', err);
    }
  };

  const resetForm = () => {
    setPropertyId('');
    setSelectedGeneralDietIds([]);
    setDietName('');
    setDietPrice(0);
    setDietDescription('');
    setStartDate('');
    setEndDate('');
    setIsCustomDiet(false);
    setSelectedDiet(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEdit = (diet: CenterDiet) => {
    setSelectedDiet(diet);
    setPropertyId(diet.property_id);
    if (diet.general_diet_id) {
      setSelectedGeneralDietIds([diet.general_diet_id]);
      setIsCustomDiet(false);
    } else {
      setIsCustomDiet(true);
      setDietName(diet.name || '');
    }
    setDietPrice(diet.price);
    setDietDescription(diet.description || '');
    setStartDate(diet.start_date);
    setEndDate(diet.end_date);
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!propertyId) {
      setError('Wybierz turnus obozu');
      return;
    }
    if (!isCustomDiet && selectedGeneralDietIds.length === 0) {
      setError('Wybierz dietę ogólną lub utwórz nową dietę');
      return;
    }
    if (isCustomDiet && !dietName.trim()) {
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

      // For now, create one center diet per selected general diet or one custom diet
      const dietsToCreate = isCustomDiet
        ? [{ name: dietName.trim(), price: Number(dietPrice), general_diet_id: null }]
        : selectedGeneralDietIds.map(generalDietId => {
            const generalDiet = generalDiets.find(gd => gd.id === generalDietId);
            return {
              general_diet_id: generalDietId,
              price: Number(dietPrice), // Override price
              name: null
            };
          });

      for (const dietData of dietsToCreate) {
        const payload = {
          property_id: Number(propertyId),
          ...dietData,
          description: dietDescription.trim() || null,
          start_date: startDate,
          end_date: endDate,
          is_active: true,
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ośrodek</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cena</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Okres obowiązywania</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {diets.map((diet) => (
              <tr key={diet.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{diet.display_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{diet.property_city} ({diet.property_period})</td>
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
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {selectedDiet ? 'Edytuj dietę dla ośrodka' : 'Dodaj dietę dla ośrodka'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Turnus obozu *
                </label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                >
                  <option value="">Wybierz turnus</option>
                  {properties.map((prop) => (
                    <option key={prop.id} value={prop.id}>
                      {prop.city} ({prop.period}) - {new Date(prop.start_date).toLocaleDateString('pl-PL')} - {new Date(prop.end_date).toLocaleDateString('pl-PL')}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <input
                    type="checkbox"
                    checked={isCustomDiet}
                    onChange={(e) => {
                      setIsCustomDiet(e.target.checked);
                      if (e.target.checked) {
                        setSelectedGeneralDietIds([]);
                      }
                    }}
                    className="mr-2"
                  />
                  Utwórz nową dietę (nie opartą na diecie ogólnej)
                </label>
              </div>
              
              {!isCustomDiet ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wybierz z diet ogólnych *
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {generalDiets.map((gd) => (
                      <label key={gd.id} className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          checked={selectedGeneralDietIds.includes(gd.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGeneralDietIds([...selectedGeneralDietIds, gd.id]);
                            } else {
                              setSelectedGeneralDietIds(selectedGeneralDietIds.filter(id => id !== gd.id));
                            }
                          }}
                          className="mr-2"
                        />
                        <span>{gd.display_name} - {gd.price.toFixed(2)} PLN</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nazwa diety *
                  </label>
                  <input
                    type="text"
                    value={dietName}
                    onChange={(e) => setDietName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                    placeholder="np. Specjalna dieta"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cena dla tego ośrodka (PLN) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={dietPrice}
                  onChange={(e) => setDietPrice(e.target.value ? parseFloat(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                />
                {!isCustomDiet && selectedGeneralDietIds.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    To nie zmienia ceny ogólnej diety, tylko ceny dla tego ośrodka
                  </p>
                )}
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

