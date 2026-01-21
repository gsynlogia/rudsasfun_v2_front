'use client';

import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import DeleteConfirmationModal from '@/components/admin/DeleteConfirmationModal';
import SectionGuard from '@/components/admin/SectionGuard';
import { authenticatedApiCall } from '@/utils/api-auth';

interface HealthNotice {
  id: number;
  notice_text: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Health Notice Edit Page
 * Route: /admin-panel/cms/health-notice/[id]/edit
 */
export default function HealthNoticeEditPage() {
  const router = useRouter();
  const params = useParams();
  const noticeId = params.id as string;

  // State for form data
  const [formData, setFormData] = useState<HealthNotice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch notice data
  useEffect(() => {
    const fetchNotice = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await authenticatedApiCall<HealthNotice>(`/api/health-notice/${noticeId}`);
        setFormData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Błąd podczas ładowania uwagi');
        console.error('Error fetching health notice:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (noticeId) {
      fetchNotice();
    }
  }, [noticeId]);

  const handleSave = async () => {
    if (!formData || !formData.notice_text.trim()) {
      setError('Tekst uwagi jest wymagany');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await authenticatedApiCall(`/api/health-notice/${noticeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notice_text: formData.notice_text,
          is_active: formData.is_active,
        }),
      });

      router.push('/admin-panel/cms/health-notice');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas aktualizacji uwagi');
      console.error('Error updating health notice:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!formData) return;

    try {
      setIsDeleting(true);
      setError(null);

      await authenticatedApiCall(`/api/health-notice/${noticeId}`, {
        method: 'DELETE',
      });

      router.push('/admin-panel/cms/health-notice');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas usuwania uwagi');
      console.error('Error deleting health notice:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin-panel/cms/health-notice');
  };

  if (isLoading) {
    return (
      <SectionGuard section="cms">
        <AdminLayout>
          <div className="container mx-auto p-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Ładowanie...</div>
            </div>
          </div>
        </AdminLayout>
      </SectionGuard>
    );
  }

  if (!formData) {
    return (
      <SectionGuard section="cms">
        <AdminLayout>
          <div className="container mx-auto p-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-red-600">Nie znaleziono uwagi</div>
            </div>
          </div>
        </AdminLayout>
      </SectionGuard>
    );
  }

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
            <h1 className="text-3xl font-bold text-gray-800">Edytuj uwagę dotyczącą stanu zdrowia</h1>
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
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  Usuń
                </button>
                <div className="flex items-center gap-4">
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
                    {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          itemType="other"
          itemName="uwagę"
          itemId={formData?.id || 0}
          additionalInfo="Ta operacja ustawi uwagę jako nieaktywną."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isLoading={isDeleting}
        />
      </AdminLayout>
    </SectionGuard>
  );
}