'use client';

import { ArrowLeft, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import { authenticatedApiCall } from '@/utils/api-auth';

/**
 * Health Notice Create Page
 * Route: /admin-panel/cms/health-notice/new
 */
export default function HealthNoticeNewPage() {
  const router = useRouter();

  // State for form data
  const [formData, setFormData] = useState({
    notice_text: '',
    is_active: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!formData.notice_text.trim()) {
      setError('Tekst uwagi jest wymagany');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await authenticatedApiCall('/api/health-notice/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      router.push('/admin-panel/cms/health-notice');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas tworzenia uwagi');
      console.error('Error creating health notice:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin-panel/cms/health-notice');
  };

  return (
    <SectionGuard section="cms">
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Powrót do listy</span>
            </button>
            <h1 className="text-3xl font-bold text-gray-800">Dodaj nową uwagę dotyczącą stanu zdrowia</h1>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-6">
              {/* Notice Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tekst uwagi <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.notice_text}
                  onChange={(e) => setFormData({ ...formData, notice_text: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  placeholder="Wpisz tekst uwagi dotyczącej stanu zdrowia..."
                />
              </div>

              {/* Is Active */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Aktywna</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Tylko aktywna uwaga będzie wyświetlana w formularzu rezerwacji
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !formData.notice_text.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#03adf0] text-white rounded hover:bg-[#0288c7] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  {isSaving ? 'Zapisywanie...' : 'Zapisz'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}









