'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import HealthNoticeManagement from '@/components/admin/HealthNoticeManagement';
import SectionGuard from '@/components/admin/SectionGuard';

export default function HealthNoticePage() {
  return (
    <SectionGuard section="cms">
      <AdminLayout>
        <HealthNoticeManagement />
      </AdminLayout>
    </SectionGuard>
  );
}









