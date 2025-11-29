'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import CampList from './CampList';
import CampForm from './CampForm';
import CampPropertyForm from './CampPropertyForm';
import type { Camp, CampProperty } from '@/types/reservation';

interface CampWithProperties extends Camp {
  properties: CampProperty[];
}

/**
 * Camps Management Component
 * Main component for managing camps and their editions
 * Camp-first approach: select camp, then manage its editions
 */
export default function CampsManagement() {
  const [camps, setCamps] = useState<CampWithProperties[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCampForm, setShowCampForm] = useState(false);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingCamp, setEditingCamp] = useState<Camp | null>(null);
  const [editingProperty, setEditingProperty] = useState<{ campId: number; property: CampProperty } | null>(null);
  const [selectedCampId, setSelectedCampId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'camp-detail'>('list');
  const [selectedCamp, setSelectedCamp] = useState<CampWithProperties | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Load camps on mount
  useEffect(() => {
    loadCamps();
  }, []);

  const loadCamps = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/camps/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCamps(data.camps || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load camps');
      console.error('Error loading camps:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCamp = () => {
    setEditingCamp(null);
    setShowCampForm(true);
    setShowPropertyForm(false);
    setViewMode('list');
  };

  const handleEditCamp = (camp: Camp) => {
    setEditingCamp(camp);
    setShowCampForm(true);
    setShowPropertyForm(false);
    setViewMode('list');
  };

  const handleDeleteCamp = async (campId: number) => {
    if (!confirm('Czy na pewno chcesz usunąć ten obóz? Wszystkie jego edycje również zostaną usunięte.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/camps/${campId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await loadCamps();
      if (selectedCamp?.id === campId) {
        setSelectedCamp(null);
        setViewMode('list');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete camp');
      console.error('Error deleting camp:', err);
    }
  };

  const handleSelectCamp = (camp: CampWithProperties) => {
    setSelectedCamp(camp);
    setSelectedCampId(camp.id);
    setViewMode('camp-detail');
    setShowCampForm(false);
    setShowPropertyForm(false);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedCamp(null);
    setSelectedCampId(null);
    setShowCampForm(false);
    setShowPropertyForm(false);
  };

  const handleCreateProperty = () => {
    if (!selectedCampId) return;
    setEditingProperty(null);
    setShowPropertyForm(true);
    setShowCampForm(false);
  };

  const handleEditProperty = (campId: number, property: CampProperty) => {
    setSelectedCampId(campId);
    setEditingProperty({ campId, property });
    setShowPropertyForm(true);
    setShowCampForm(false);
  };

  const handleDeleteProperty = async (campId: number, propertyId: number) => {
    if (!confirm('Czy na pewno chcesz usunąć tę edycję obozu?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/camps/${campId}/properties/${propertyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await loadCamps();
      // Refresh selected camp
      if (selectedCamp?.id === campId) {
        const updatedCamp = camps.find(c => c.id === campId);
        if (updatedCamp) {
          setSelectedCamp(updatedCamp);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete property');
      console.error('Error deleting property:', err);
    }
  };

  const handleFormClose = () => {
    setShowCampForm(false);
    setShowPropertyForm(false);
    setEditingCamp(null);
    setEditingProperty(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    loadCamps().then(() => {
      // If we're viewing a camp detail and it was edited, refresh it
      if (selectedCampId && editingCamp?.id === selectedCampId) {
        const updatedCamp = camps.find(c => c.id === selectedCampId);
        if (updatedCamp) {
          setSelectedCamp(updatedCamp);
        }
      }
    });
  };

  // Update selectedCamp when camps change
  useEffect(() => {
    if (selectedCampId && camps.length > 0) {
      const updatedCamp = camps.find(c => c.id === selectedCampId);
      if (updatedCamp) {
        setSelectedCamp(updatedCamp);
      }
    }
  }, [camps, selectedCampId]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-2">
        {viewMode === 'list' ? (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Zarządzanie obozami</h1>
            </div>
            <button
              onClick={handleCreateCamp}
              className="flex items-center gap-2 px-4 py-2 bg-[#03adf0] text-white rounded-lg hover:bg-[#0288c7] transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Dodaj obóz
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={handleBackToList}
                className="text-sm text-gray-600 hover:text-[#03adf0] mb-2 transition-colors"
              >
                ← Wróć do listy obozów
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {selectedCamp?.name || 'Obóz'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEditCamp(selectedCamp!)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edytuj obóz
              </button>
              <button
                onClick={handleCreateProperty}
                className="flex items-center gap-2 px-4 py-2 bg-[#03adf0] text-white rounded-lg hover:bg-[#0288c7] transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Dodaj edycję
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-2 bg-red-50 border-l-4 border-red-400 p-2 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
          <p className="mt-4 text-sm text-gray-600">Ładowanie obozów...</p>
        </div>
      ) : (
        <>
          {/* Camp Form */}
          {showCampForm && (
            <CampForm
              camp={editingCamp}
              onSuccess={handleFormSuccess}
              onCancel={handleFormClose}
            />
          )}

          {/* Property Form */}
          {showPropertyForm && selectedCampId && (
            <CampPropertyForm
              campId={selectedCampId}
              property={editingProperty?.property || null}
              onSuccess={handleFormSuccess}
              onCancel={handleFormClose}
            />
          )}

          {/* Camp List View */}
          {!showCampForm && !showPropertyForm && viewMode === 'list' && (
            <CampList
              camps={camps}
              onSelectCamp={handleSelectCamp}
              onEditCamp={handleEditCamp}
              onDeleteCamp={handleDeleteCamp}
            />
          )}

          {/* Camp Detail View */}
          {!showCampForm && !showPropertyForm && viewMode === 'camp-detail' && selectedCamp && (
            <div className="bg-white rounded-lg shadow overflow-hidden flex-1 flex flex-col min-h-0">
              {/* Camp Info Header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#03adf0] rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xl">{selectedCamp.id}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{selectedCamp.name}</h3>
                      <p className="text-sm text-gray-500">
                        {selectedCamp.properties?.length || 0} {selectedCamp.properties?.length === 1 ? 'edycja' : 'edycji'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Properties List */}
              {selectedCamp.properties && selectedCamp.properties.length > 0 ? (
                <div className="overflow-auto flex-1 min-h-0">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Okres
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Miejscowość
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data rozpoczęcia
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data zakończenia
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Liczba dni
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Akcje
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedCamp.properties.map((property) => (
                        <tr key={property.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {property.period === 'lato' ? 'Lato' : 'Zima'}
                            </span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {property.city}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {new Date(property.start_date).toLocaleDateString('pl-PL')}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {new Date(property.end_date).toLocaleDateString('pl-PL')}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {property.days_count} {property.days_count === 1 ? 'dzień' : 'dni'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditProperty(selectedCamp.id, property)}
                                className="text-[#03adf0] hover:text-[#0288c7] transition-colors"
                                title="Edytuj edycję"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProperty(selectedCamp.id, property.id)}
                                className="text-red-600 hover:text-red-700 transition-colors"
                                title="Usuń edycję"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  <p className="mb-4">Brak edycji dla tego obozu.</p>
                  <button
                    onClick={handleCreateProperty}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#03adf0] text-white rounded-lg hover:bg-[#0288c7] transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Dodaj pierwszą edycję
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

