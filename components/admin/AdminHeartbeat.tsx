'use client';

import { useEffect } from 'react';

import { authService } from '@/lib/services/AuthService';
import { API_BASE_URL } from '@/utils/api-config';

/**
 * Heartbeat „Pracownicy online" — odpowiednik ClientHeartbeat, ale dla PRACOWNIKÓW (panel admina).
 * Renderowany RAZ w app/admin-panel/layout.tsx → bije na WSZYSTKICH stronach panelu (App Router layout
 * persystuje przy nawigacji, timer się nie resetuje). Woła ten sam endpoint POST /api/auth/heartbeat;
 * backend ROZRÓŻNIA: token pracownika (AdminUser) → admin_users.last_seen_at (a nie users).
 * Interwał z /api/system-settings/client-heartbeat (wspólny, domyślnie 60 s). Nic nie renderuje (null).
 */
export default function AdminHeartbeat() {
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const ping = () => {
      const token = authService.getToken();
      if (!token) return;
      fetch(`${API_BASE_URL}/api/auth/heartbeat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => { /* offline/błąd sieci — kolejny ping spróbuje ponownie */ });
    };

    const start = (intervalSeconds: number) => {
      if (stopped) return;
      ping(); // od razu po wejściu do panelu
      timer = setInterval(ping, Math.max(15, intervalSeconds) * 1000);
    };

    fetch(`${API_BASE_URL}/api/system-settings/client-heartbeat`)
      .then((r) => r.json())
      .then((cfg) => start(cfg?.interval_seconds || 60))
      .catch(() => start(60));

    const onVisible = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}
