'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import { authenticatedApiCall } from '@/utils/api-auth';
import { Save, Phone } from 'lucide-react';

interface BlinkConfig {
  id: number;
  phone_number: string;
  created_at: string;
  updated_at: string;
}

export default function BlinkConfigurationPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load existing configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        const config = await authenticatedApiCall<BlinkConfig | null>('/api/blink-config/');
        if (config) {
          setPhoneNumber(config.phone_number);
        }
      } catch (err) {
        console.error('Error loading Blink configuration:', err);
        // 404 is expected if config doesn't exist yet
        if (err instanceof Error && !err.message.includes('404')) {
          setError('Błąd podczas ładowania konfiguracji');
        }
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      setError('Numer telefonu jest wymagany');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      await authenticatedApiCall<BlinkConfig>('/api/blink-config/', {
        method: 'PUT',
        body: JSON.stringify({ phone_number: phoneNumber.trim() }),
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving Blink configuration:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas zapisywania konfiguracji');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionGuard section="cms">
      <AdminLayout>
        <div className="container mx-auto p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Konfiguracja Blink</h1>
          
          <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label htmlFor="phone-number" className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>Numer telefonu</span>
                  </div>
                </label>
                <input
                  id="phone-number"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="np. +48123456789"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                  disabled={loading || saving}
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  Numer telefonu, na który mają być przekazywane pliki
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4">
                  <p className="text-sm text-green-700">Konfiguracja została zapisana pomyślnie!</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || saving}
                  className="px-6 py-2 bg-[#03adf0] text-white font-medium rounded-lg hover:bg-[#0288c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Zapisywanie...' : 'Zapisz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}

