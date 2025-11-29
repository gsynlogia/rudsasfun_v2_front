'use client';

import { useState, useEffect } from 'react';
import { X, Save, Calendar, MapPin } from 'lucide-react';
import type { CampProperty } from '@/types/reservation';

interface CampPropertyFormProps {
  campId: number;
  property: CampProperty | null; // null for create, CampProperty object for edit
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Camp Property Form Component
 * Form for creating or editing a camp property/edition
 */
export default function CampPropertyForm({
  campId,
  property,
  onSuccess,
  onCancel,
}: CampPropertyFormProps) {
  const [period, setPeriod] = useState<'lato' | 'zima'>('lato');
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const isEditMode = property !== null;

  useEffect(() => {
    if (property) {
      setPeriod(property.period as 'lato' | 'zima');
      setCity(property.city);
      // Convert ISO date to YYYY-MM-DD format for input
      setStartDate(property.start_date.split('T')[0]);
      setEndDate(property.end_date.split('T')[0]);
    }
  }, [property]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        throw new Error('Data rozpoczęcia musi być wcześniejsza niż data zakończenia');
      }

      const url = isEditMode
        ? `${API_BASE_URL}/api/camps/${campId}/properties/${property.id}`
        : `${API_BASE_URL}/api/camps/${campId}/properties`;

      const method = isEditMode ? 'PUT' : 'POST';
      const body = isEditMode
        ? JSON.stringify({
            period,
            city: city.trim(),
            start_date: startDate,
            end_date: endDate,
          })
        : JSON.stringify({
            camp_id: campId,
            period,
            city: city.trim(),
            start_date: startDate,
            end_date: endDate,
          });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save camp property');
      console.error('Error saving camp property:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          {isEditMode ? 'Edytuj edycję obozu' : 'Dodaj nową edycję obozu'}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Anuluj"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-2">
            Okres <span className="text-red-500">*</span>
          </label>
          <select
            id="period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'lato' | 'zima')}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
            disabled={loading}
          >
            <option value="lato">Lato</option>
            <option value="zima">Zima</option>
          </select>
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Miejscowość <span className="text-red-500">*</span>
          </label>
          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
            placeholder="np. Wiele"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Data rozpoczęcia <span className="text-red-500">*</span>
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Data zakończenia <span className="text-red-500">*</span>
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              min={startDate}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
              disabled={loading}
            />
          </div>
        </div>

        {startDate && endDate && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <p className="text-sm text-blue-700">
              <strong>Liczba dni:</strong>{' '}
              {(() => {
                const start = new Date(startDate);
                const end = new Date(endDate);
                const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                return `${days} ${days === 1 ? 'dzień' : 'dni'}`;
              })()}
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anuluj
          </button>
          <button
            type="submit"
            disabled={loading || !city.trim() || !startDate || !endDate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#03adf0] rounded-lg hover:bg-[#0288c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Zapisywanie...' : isEditMode ? 'Zapisz zmiany' : 'Dodaj edycję'}
          </button>
        </div>
      </form>
    </div>
  );
}

