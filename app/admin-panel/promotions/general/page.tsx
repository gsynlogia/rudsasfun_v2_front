'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import GeneralPromotionsManagement from '@/components/admin/GeneralPromotionsManagement';
import SectionGuard from '@/components/admin/SectionGuard';

export default function GeneralPromotionsPage() {
  return (
    <SectionGuard section="promotions">
      <AdminLayout>
        <GeneralPromotionsManagement />
      </AdminLayout>
    </SectionGuard>
  );
}