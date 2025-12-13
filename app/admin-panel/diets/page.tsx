'use client';

import Link from 'next/link';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';

export default function DietsPage() {
  return (
    <SectionGuard section="diets">
      <AdminLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Zarządzanie dietami</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/admin-panel/diets/general"
              className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">Stwórz dietę ogólną</h2>
              <p className="text-gray-600">
                Zarządzaj dietami ogólnymi dostępnymi dla wszystkich obozów
              </p>
            </Link>

            <Link
              href="/admin-panel/diets/center"
              className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">Stwórz dietę dla ośrodka</h2>
              <p className="text-gray-600">
                Zarządzaj dietami specyficznymi dla konkretnych ośrodków/turnusów
              </p>
            </Link>
          </div>
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}

