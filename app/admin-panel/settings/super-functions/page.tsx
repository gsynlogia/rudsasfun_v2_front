'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import { authService } from '@/lib/services/AuthService';

/**
 * Admin Panel - Super Functions Page
 * Route: /admin-panel/settings/super-functions
 *
 * Super functions page - only accessible for user ID 0
 * Completely separate from the system
 */
export default function SuperFunctionsPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        router.push('/admin-panel/login');
        return;
      }

      // Verify token and get user info
      const user = await authService.verifyToken();
      if (!user) {
        router.push('/admin-panel/login');
        return;
      }

      // Only user ID 0 can access
      if (user.id !== 0) {
        router.push('/admin-panel/settings');
        return;
      }

      setIsAuthorized(true);
      setLoading(false);
    };

    checkAccess();
  }, [router]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="w-full flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
            <p className="mt-4 text-sm text-gray-600">Sprawdzanie autoryzacji...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="w-full">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Link
            href="/admin-panel/settings"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
            style={{ cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Powrót do ustawień</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Super funkcje</h1>
        </div>

        {/* Super Functions Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Dostępne super funkcje</h2>

          <div className="space-y-4">
            {/* Globalna edycja obozów i turnusów */}
            <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-[#03adf0] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Globalna edycja obozów i turnusów
                  </h3>
                </div>
                <Link
                  href="/admin-panel/settings/super-functions/global-edit"
                  className="px-6 py-2 bg-[#03adf0] text-white font-medium rounded-lg hover:bg-[#0288c7] transition-colors inline-block"
                >
                  Uruchom
                </Link>
              </div>
            </div>

            {/* Inteligentna analiza rezerwacji - WYŁĄCZONA */}
            {/*
            <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-[#03adf0] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Inteligentna analiza rezerwacji
                  </h3>
                  <p className="text-sm text-gray-600">
                    Analiza zgodności przypisań z nazwami obozów
                  </p>
                </div>
                <Link
                  href="/admin-panel/settings/super-functions/intelligent-analysis"
                  className="px-6 py-2 bg-[#03adf0] text-white font-medium rounded-lg hover:bg-[#0288c7] transition-colors inline-block"
                >
                  Uruchom
                </Link>
              </div>
            </div>
            */}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

