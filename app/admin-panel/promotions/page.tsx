'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import Link from 'next/link';

export default function PromotionsPage() {
  return (
    <SectionGuard section="promotions">
      <AdminLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Zarządzanie promocjami</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/admin-panel/promotions/general"
              className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">Stwórz promocję ogólną</h2>
              <p className="text-gray-600">
                Zarządzaj promocjami ogólnymi dostępnymi dla wszystkich obozów
              </p>
            </Link>
            
            <Link
              href="/admin-panel/promotions/center"
              className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">Stwórz promocję dla ośrodka</h2>
              <p className="text-gray-600">
                Zarządzaj promocjami specyficznymi dla konkretnych ośrodków/turnusów
              </p>
            </Link>
          </div>
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}

