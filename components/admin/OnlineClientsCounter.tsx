'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { authService } from '@/lib/services/AuthService';
import { authenticatedFetch } from '@/lib/utils/api';

/**
 * Licznik „Online" pod logo w lewym pasku panelu admina (na każdej stronie), ROZDZIELONY:
 * klienci (niebieski) i pracownicy (zielony). JEDEN rząd (border-b) — wysokość bez zmian, żeby
 * nawigacja się nie obniżyła i „Wyloguj" pozostał widoczny (regresja z fixu 6e4bf2d).
 * WIDOCZNY TYLKO dla administratora / superadministratora (grupa admin / user_type admin / id 0).
 * Konto read-only „Kierownik" NIE jest adminem → komponent się nie renderuje i NIE bije API.
 * Klik → strona „Online". W trybie zwiniętego menu pokazuje skrót „N·M".
 */
export default function OnlineClientsCounter({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const router = useRouter();
  const [clientsCount, setClientsCount] = useState<number | null>(null);
  const [staffCount, setStaffCount] = useState<number | null>(null);
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
        const res = await authenticatedFetch('/api/admin/online-summary');
        if (!res.ok) return;
        const data = await res.json();
        if (!stopped) {
          setClientsCount(data.clients_count ?? 0);
          setStaffCount(data.staff_count ?? 0);
        }
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

  if (!isAdmin || clientsCount === null || staffCount === null) return null;

  return (
    <button
      onClick={() => router.push('/admin-panel/online-klienci')}
      title={`Online — Klienci: ${clientsCount}, Pracownicy: ${staffCount}`}
      data-acl-keep
      className="w-full flex items-center justify-center gap-2 px-2 py-2 text-xs text-white/90 hover:bg-slate-700 transition-colors cursor-pointer border-b border-slate-700"
    >
      {isCollapsed ? (
        <span className="font-medium whitespace-nowrap inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          {clientsCount}
          <span className="text-white/40">·</span>
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          {staffCount}
        </span>
      ) : (
        <span className="font-medium whitespace-nowrap inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block flex-shrink-0" />
          Klienci: {clientsCount}
          <span className="text-white/30 mx-0.5">·</span>
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block flex-shrink-0" />
          Prac.: {staffCount}
        </span>
      )}
    </button>
  );
}
