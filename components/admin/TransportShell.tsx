'use client';

import { Truck, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import SectionGuard from '@/components/admin/SectionGuard';
import { authService } from '@/lib/services/AuthService';

/**
 * Wspólna powłoka sekcji Transport: granatowa belka + zakładki jako PRAWDZIWE ŚCIEŻKI URL
 * (rozkaz Pana: w pasku adresu ma być widać czy jestem na liście transportów czy w zarządzaniu).
 *   /admin-panel/transports/listy-transportowe       → zakładka „Listy transportowe"
 *   /admin-panel/transports/zarzadzanie-transportami  → zakładka „Zarządzanie transportem"
 * „Zarządzanie transportem" tylko dla pełnego admina (Nr 38) — zakładka ukryta dla operatora.
 */
export default function TransportShell({
  active,
  children,
}: {
  active: 'lists' | 'management';
  children: ReactNode;
}) {
  const [canManage, setCanManage] = useState(false);
  useEffect(() => {
    setCanManage(authService.isAdmin());
  }, []);

  return (
    <SectionGuard section="transports">
      <AdminLayout>
        <AdminPageHeader title="Transport" />
        <div className="mb-4 flex gap-1 border-b border-gray-200">
          <TabLink
            href="/admin-panel/transports/listy-transportowe"
            active={active === 'lists'}
            icon={<ClipboardList className="h-4 w-4" />}
            label="Listy transportowe"
          />
          {canManage && (
            <TabLink
              href="/admin-panel/transports/zarzadzanie-transportami"
              active={active === 'management'}
              icon={<Truck className="h-4 w-4" />}
              label="Zarządzanie transportem"
            />
          )}
        </div>
        {children}
      </AdminLayout>
    </SectionGuard>
  );
}

function TabLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      data-testid={`tab-${label}`}
      className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border-sky-600 text-sky-700'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon} {label}
    </Link>
  );
}
