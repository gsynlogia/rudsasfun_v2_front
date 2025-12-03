'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { authenticatedApiCall } from '@/utils/api-auth';

interface AddonDescription {
  id: number;
  description: string | null;
  info_header: string | null;
  created_at: string;
  updated_at: string;
}

export default function AddonDescriptionManagement() {
  const [description, setDescription] = useState<string>('');
  const [infoHeader, setInfoHeader] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchDescription = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authenticatedApiCall<AddonDescription>('/api/addon-description/');
      setDescription(data.description || '');
      setInfoHeader(data.info_header || '');
    } catch (err) {
      console.error('[AddonDescriptionManagement] Error fetching description:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas ładowania opisu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDescription();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      await authenticatedApiCall<AddonDescription>('/api/addon-description/', {
        method: 'PUT',
        body: JSON.stringify({ 
          description: description.trim() || null,
          info_header: infoHeader.trim() || null
        }),
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zapisywania opisu');
      console.error('[AddonDescriptionManagement] Error saving description:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#03adf0]"></div>
          <p className="ml-4 text-gray-600">Ładowanie opisu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Zarządzanie opisem dodatków</h1>

      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 rounded">
          <p className="text-sm text-green-700">Opis został zapisany pomyślnie!</p>
        </div>
      )}

      {/* Description Editor (First textarea) */}
      <div className="mb-6">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Opis dodatków (wyświetlany na górze sekcji w Step 2)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={10}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent transition-all resize-none"
          placeholder="Wpisz opis dodatków, który będzie wyświetlany na górze sekcji dodatków w formularzu rezerwacji (Step 2)..."
          disabled={saving}
        />
        <p className="mt-2 text-xs text-gray-500">
          Ten tekst będzie wyświetlany na górze sekcji "Dodatki" w formularzu rezerwacji (Step 2).
        </p>
      </div>

      {/* Info Header Editor (Second textarea) */}
      <div className="mb-6">
        <label htmlFor="info-header" className="block text-sm font-medium text-gray-700 mb-2">
          Nagłówek bloku informacyjnego (wyświetlany w bloku informacyjnym poniżej dodatków)
        </label>
        <textarea
          id="info-header"
          value={infoHeader}
          onChange={(e) => setInfoHeader(e.target.value)}
          rows={3}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent transition-all resize-none"
          placeholder="np. Przykładowy nagłówek wpisany przez Admina"
          disabled={saving}
        />
        <p className="mt-2 text-xs text-gray-500">
          Ten nagłówek będzie wyświetlany w bloku informacyjnym poniżej kafelków dodatków w Step 2.
        </p>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#03adf0] rounded-lg hover:bg-[#0288c7] transition-colors disabled:opacity-50 shadow-sm"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Zapisywanie...' : 'Zapisz opis'}
        </button>
      </div>
    </div>
  );
}

