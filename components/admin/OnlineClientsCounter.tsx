'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { authService } from '@/lib/services/AuthService';
import { authenticatedFetch } from '@/lib/utils/api';

/**
 * Licznik „Klienci online" pod logo w lewym pasku panelu admina (na każdej stronie).
 * WIDOCZNY TYLKO dla administratora / superadministratora (grupa admin / user_type admin / id 0).
 * Konto read-only „Kierownik" NIE jest adminem → komponent się nie renderuje i NIE bije API.
 * Klik → strona „Klienci online". W trybie zwiniętego menu pokazuje samą liczbę.
 */
export default function OnlineClientsCounter({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const u = authService.getCurrentUser() as { id?: number; user_type?: string; groups?: string[] } | null;
    const admin = !!u && (
      u.id === 0 ||
      u.user_type === 'admin' ||
      (Array.isArray(u.groups) && u.groups.includes('admin'))
    );
    setIsAdmin(admin);
    if (!admin) return;

    let stopped = false;
    const load = async () => {
      try {
        const res = await authenticatedFetch('/api/admin/online-clients');
        if (!res.ok) return;
        const data = await res.json();
        if (!stopped) setCount(data.count ?? 0);
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, []);

  if (!isAdmin || count === null) return null;

  return (
    <button
      onClick={() => router.push('/admin-panel/online-klienci')}
      title={`Klienci online: ${count}`}
      data-acl-keep
      className="w-full flex items-center justify-center gap-2 px-2 py-2 text-sm text-white/90 hover:bg-slate-700 transition-colors cursor-pointer border-b border-slate-700"
    >
      <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block flex-shrink-0" />
      <span className="font-medium whitespace-nowrap">{isCollapsed ? count : `Online: ${count}`}</span>
    </button>
  );
}
