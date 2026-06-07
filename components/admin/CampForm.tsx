'use client';

import { X, Save } from 'lucide-react';
import { useState, useEffect } from 'react';

import type { Camp } from '@/types/reservation';
import { authenticatedApiCall } from '@/utils/api-auth';

interface CampFormProps {
  camp: Camp | null; // null for create, Camp object for edit
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Camp Form Component
 * Form for creating or editing a camp
 */
export default function CampForm({ camp, onSuccess, onCancel }: CampFormProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.rezerwacja.radsas-fun.pl';
  const isEditMode = camp !== null;

  useEffect(() => {
    if (camp) {
      setName(camp.name);
    }
  }, [camp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = isEditMode
        ? `${API_BASE_URL}/api/camps/${camp.id}`
        : `${API_BASE_URL}/api/camps/`;

      const method = isEditMode ? 'PUT' : 'POST';
      const body = JSON.stringify({ name: name.trim() });

      // Use authenticated API call for POST/PUT operations
      await authenticatedApiCall(url, {
        method,
        body,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save camp');
      console.error('Error saving camp:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          {isEditMode ? 'Edytuj obóz' : 'Dodaj nowy obóz'}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Anuluj"
          style={{ cursor: 'pointer' }}
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
          <label htmlFor="camp-name" className="block text-sm font-medium text-gray-700 mb-2">
            Nazwa obozu <span className="text-red-500">*</span>
          </label>
          <input
            id="camp-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
            placeholder="np. Laserowy Paintball"
            disabled={loading}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            Anuluj
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#03adf0] rounded-lg hover:bg-[#0288c7] transition-colors disabled:opacity-50"
            style={{ cursor: (loading || !name.trim()) ? 'not-allowed' : 'pointer' }}
          >
            <Save className="w-4 h-4" />
            {loading ? 'Zapisywanie...' : isEditMode ? 'Zapisz zmiany' : 'Dodaj obóz'}
          </button>
        </div>
      </form>
    </div>
  );
}