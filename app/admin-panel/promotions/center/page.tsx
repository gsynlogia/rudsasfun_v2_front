'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import CenterPromotionsManagement from '@/components/admin/CenterPromotionsManagement';
import SectionGuard from '@/components/admin/SectionGuard';

export default function CenterPromotionsPage() {
  return (
    <SectionGuard section="promotions">
      <AdminLayout>
        <CenterPromotionsManagement />
      </AdminLayout>
    </SectionGuard>
  );
}