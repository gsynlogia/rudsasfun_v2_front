'use client';

import { Truck, ClipboardList } from 'lucide-react';
import { useEffect, useState } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import TransportListsManagement from '@/components/admin/TransportListsManagement';
import TransportsManagement from '@/components/admin/TransportsManagement';
import { authService } from '@/lib/services/AuthService';

type TransportTab = 'lists' | 'management';

export default function TransportsPage() {
  // Domyślnie „Listy transportowe" (nowy moduł). „Zarządzanie transportem" pozostaje pod drugą zakładką.
  const [tab, setTab] = useState<TransportTab>('lists');
  // Nr 38: „Zarządzanie transportem" tylko dla pełnego admina — blokada dla Ani (operator z dostępem do list).
  const [canManage, setCanManage] = useState(false);

  useEffect(() => { setCanManage(authService.isAdmin()); }, []);

  return (
    <SectionGuard section="transports">
      <AdminLayout>
        <div className="mb-4 flex gap-1 border-b border-gray-200">
          <TabButton active={tab === 'lists'} onClick={() => setTab('lists')}
            icon={<ClipboardList className="h-4 w-4" />} label="Listy transportowe" />
          {canManage && (
            <TabButton active={tab === 'management'} onClick={() => setTab('management')}
              icon={<Truck className="h-4 w-4" />} label="Zarządzanie transportem" />
          )}
        </div>
        {tab === 'management' && canManage ? <TransportsManagement /> : <TransportListsManagement />}
      </AdminLayout>
    </SectionGuard>
  );
}

function TabButton(
  { active, onClick, icon, label }:
  { active: boolean; onClick: () => void; icon: React.ReactNode; label: string },
) {
  return (
    <button type="button" onClick={onClick} data-testid={`tab-${label}`}
      className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border-sky-600 text-sky-700'
          : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
      {icon} {label}
    </button>
  );
}
