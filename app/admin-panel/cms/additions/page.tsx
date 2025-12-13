'use client';

import AddonDescriptionManagement from '@/components/admin/AddonDescriptionManagement';
import AddonsManagement from '@/components/admin/AddonsManagement';
import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';

export default function AdditionsManagementPage() {
  return (
    <SectionGuard section="cms">
      <AdminLayout>
        <div className="space-y-8">
          <AddonDescriptionManagement />
          <div className="border-t border-gray-200 pt-8">
            <AddonsManagement />
          </div>
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}

