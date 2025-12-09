'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import Link from 'next/link';

export default function ProtectionsPage() {
  return (
    <SectionGuard section="protections">
      <AdminLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Zarządzanie ochronami</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/admin-panel/protections/general"
              className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">Stwórz ochronę ogólną</h2>
              <p className="text-gray-600">
                Zarządzaj ochronami ogólnymi dostępnymi dla wszystkich obozów
              </p>
            </Link>
            
            <Link
              href="/admin-panel/protections/center"
              className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">Stwórz ochronę dla ośrodka</h2>
              <p className="text-gray-600">
                Zarządzaj ochronami specyficznymi dla konkretnych ośrodków/turnusów
              </p>
            </Link>
          </div>
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}

