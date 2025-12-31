'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Plus, AlertCircle } from 'lucide-react';
import { authenticatedApiCall } from '@/utils/api-auth';

interface HealthNotice {
  id: number;
  notice_text: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function HealthNoticeManagement() {
  const router = useRouter();
  const [notices, setNotices] = useState<HealthNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all notices
  const fetchNotices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authenticatedApiCall<{ notices: HealthNotice[]; total: number }>(
        '/api/health-notice/'
      );
      setNotices(data.notices || []);
    } catch (err) {
      console.error('[HealthNoticeManagement] Error fetching notices:', err);
      const errorMessage = err instanceof Error ? err.message : 'Błąd podczas ładowania uwag';
      setError(errorMessage);
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // Handle row click - navigate to edit page
  const handleRowClick = (noticeId: number) => {
    router.push(`/admin-panel/cms/health-notice/${noticeId}/edit`);
  };

  // Handle edit click
  const handleEditClick = (notice: HealthNotice, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/admin-panel/cms/health-notice/${notice.id}/edit`);
  };

  // Handle create click
  const handleCreateClick = () => {
    router.push('/admin-panel/cms/health-notice/new');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Ładowanie...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Zarządzanie uwagą dotyczącą stanu zdrowia</h1>
        <button
          onClick={handleCreateClick}
          className="flex items-center gap-2 px-4 py-2 bg-[#03adf0] text-white rounded hover:bg-[#0288c7] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Dodaj nową uwagę
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Błąd</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tekst uwagi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data utworzenia
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data aktualizacji
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Akcje
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {notices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Brak uwag. Kliknij "Dodaj nową uwagę", aby utworzyć pierwszą.
                </td>
              </tr>
            ) : (
              notices.map((notice) => (
                <tr
                  key={notice.id}
                  onClick={() => handleRowClick(notice.id)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {notice.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                    <div className="truncate" title={notice.notice_text}>
                      {notice.notice_text}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        notice.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {notice.is_active ? 'Aktywna' : 'Nieaktywna'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(notice.created_at).toLocaleString('pl-PL')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(notice.updated_at).toLocaleString('pl-PL')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={(e) => handleEditClick(notice, e)}
                      className="text-[#03adf0] hover:text-[#0288c7] transition-colors"
                      title="Edytuj"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}



