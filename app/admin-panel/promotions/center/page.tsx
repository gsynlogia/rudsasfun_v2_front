'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import CenterPromotionsManagement from '@/components/admin/CenterPromotionsManagement';

export default function CenterPromotionsPage() {
  return (
    <SectionGuard section="promotions">
      <AdminLayout>
        <CenterPromotionsManagement />
      </AdminLayout>
    </SectionGuard>
  );
}

