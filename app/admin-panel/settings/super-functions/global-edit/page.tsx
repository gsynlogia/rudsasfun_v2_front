'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import { authService } from '@/lib/services/AuthService';

/**
 * Admin Panel - Global Edit Page
 * Route: /admin-panel/settings/super-functions/global-edit
 *
 * Global edit functionality - only accessible for authorized users
 */
export default function GlobalEditPage() {
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

      // Check authorization (add your authorization logic here)
      setIsAuthorized(true);
      setLoading(false);
    };

    checkAccess();
  }, [router]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <p>Ładowanie...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!isAuthorized) {
    return (
      <AdminLayout>
        <div className="p-6">
          <p>Brak dostępu</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/admin-panel/settings/super-functions"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Powrót</span>
          </Link>
        </div>
        <h1 className="mb-6 text-2xl font-bold">Globalna edycja</h1>
        <p>Funkcjonalność w przygotowaniu...</p>
      </div>
    </AdminLayout>
  );
}
