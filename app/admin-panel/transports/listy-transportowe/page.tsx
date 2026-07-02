'use client';

import TransportShell from '@/components/admin/TransportShell';
import TransportListsManagement from '@/components/admin/TransportListsManagement';

/** Zakładka „Listy transportowe" — własna ścieżka URL /admin-panel/transports/listy-transportowe. */
export default function ListyTransportowePage() {
  return (
    <TransportShell active="lists">
      <TransportListsManagement />
    </TransportShell>
  );
}
