'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedApiCall } from '@/utils/api-auth';

/**
 * Admin Panel - Add Group Page
 * Route: /admin-panel/settings/groups/new
 * 
 * Separate page for adding new group
 */
export default function AddGroupPage() {
  const router = useRouter();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authenticatedApiCall(
        `${API_BASE_URL}/api/groups`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || null,
          }),
        }
      );

      // Redirect back to groups page
      router.push('/admin-panel/settings/groups');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas dodawania grupy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="w-full">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Link
            href="/admin-panel/settings/groups"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
            style={{ cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Powrót do grup</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Dodaj grupę</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Add Group Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nazwa grupy <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                minLength={1}
                maxLength={50}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                style={{ borderRadius: 0 }}
                placeholder="Wprowadź nazwę grupy"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Opis
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                maxLength={255}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                style={{ borderRadius: 0 }}
                placeholder="Wprowadź opis grupy (opcjonalnie)"
                disabled={loading}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Link
                href="/admin-panel/settings/groups"
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-center"
                style={{ borderRadius: 0, cursor: 'pointer' }}
              >
                Anuluj
              </Link>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: 0, cursor: loading ? 'not-allowed' : 'pointer' }}
                disabled={loading}
              >
                {loading ? 'Dodawanie...' : 'Dodaj grupę'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}








