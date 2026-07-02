'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import TransportShell from '@/components/admin/TransportShell';
import TransportsManagement from '@/components/admin/TransportsManagement';
import { authService } from '@/lib/services/AuthService';

/**
 * Zakładka „Zarządzanie transportem" — własna ścieżka /admin-panel/transports/zarzadzanie-transportami.
 * Tylko pełny admin (Nr 38). Operator bez uprawnień → przekierowanie na „Listy transportowe".
 */
export default function ZarzadzanieTransportamiPage() {
  const router = useRouter();
  const [canManage, setCanManage] = useState<boolean | null>(null);

  useEffect(() => {
    const ok = authService.isAdmin();
    setCanManage(ok);
    if (!ok) router.replace('/admin-panel/transports/listy-transportowe');
  }, [router]);

  return (
    <TransportShell active="management">
      {canManage ? <TransportsManagement /> : null}
    </TransportShell>
  );
}
