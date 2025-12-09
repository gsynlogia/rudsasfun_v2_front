'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import GeneralPromotionsManagement from '@/components/admin/GeneralPromotionsManagement';

export default function GeneralPromotionsPage() {
  return (
    <SectionGuard section="promotions">
      <AdminLayout>
        <GeneralPromotionsManagement />
      </AdminLayout>
    </SectionGuard>
  );
}

