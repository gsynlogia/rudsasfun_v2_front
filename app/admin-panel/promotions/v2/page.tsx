'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import PromotionsV2Dashboard from '@/components/admin/PromotionsV2Dashboard';

export default function PromotionsV2Page() {
  return (
    <SectionGuard section="promotions">
      <AdminLayout>
        <PromotionsV2Dashboard />
      </AdminLayout>
    </SectionGuard>
  );
}
