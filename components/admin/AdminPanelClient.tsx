'use client';

import { Plus } from 'lucide-react';
import { useState, useEffect } from 'react';

import type { Camp, CampProperty } from '@/types/reservation';

import CampForm from './CampForm';
import CampList from './CampList';
import CampPropertyForm from './CampPropertyForm';


interface CampWithProperties extends Camp {
  properties: CampProperty[];
}

/**
 * Admin Panel Client Component
 * Main admin dashboard for managing camps and their properties
 * Future: Will include role-based access control
 */
export default function AdminPanelClient() {
  const [camps, setCamps] = useState<CampWithProperties[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCampForm, setShowCampForm] = useState(false);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingCamp, setEditingCamp] = useState<Camp | null>(null);
  const [editingProperty, setEditingProperty] = useState<{ campId: number; property: CampProperty } | null>(null);
  const [selectedCampId, setSelectedCampId] = useState<number | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.rezerwacja.radsas-fun.pl';

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
  };

  const handleEditCamp = (camp: Camp) => {
    setEditingCamp(camp);
    setShowCampForm(true);
    setShowPropertyForm(false);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete camp');
      console.error('Error deleting camp:', err);
    }
  };

  const handleCreateProperty = (campId: number) => {
    setSelectedCampId(campId);
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
    setSelectedCampId(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    loadCamps();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Panel Administratora</h1>
              <p className="mt-2 text-sm text-gray-600">
                Zarządzaj obozami i ich edycjami
              </p>
            </div>
            <button
              onClick={handleCreateCamp}
              className="flex items-center gap-2 px-4 py-2 bg-[#03adf0] text-white rounded-lg hover:bg-[#0288c7] transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Dodaj obóz
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded">
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
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
            <p className="mt-4 text-sm text-gray-600">Ładowanie obozów...</p>
          </div>
        ) : (
          <>
            {/* Camp List */}
            {!showCampForm && !showPropertyForm && (
              <CampList
                camps={camps}
                onEditCamp={handleEditCamp}
                onDeleteCamp={handleDeleteCamp}
                onCreateProperty={handleCreateProperty}
                onEditProperty={handleEditProperty}
                onDeleteProperty={handleDeleteProperty}
              />
            )}

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
          </>
        )}
      </div>
    </div>
  );
}