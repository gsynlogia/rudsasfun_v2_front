'use client';

import { useEffect } from 'react';

import { authService } from '@/lib/services/AuthService';
import { API_BASE_URL } from '@/utils/api-config';

/**
 * Heartbeat „Klienci online" (wariant A). Renderowany RAZ w ProfileLayout → bije na WSZYSTKICH
 * podstronach /profil/* (layout w App Router persystuje przy nawigacji, więc timer się nie resetuje).
 * Interwał pobierany z /api/system-settings/client-heartbeat (konfigurowalny przez admina, domyślnie 60 s).
 * Działa niezależnie od klikania (setInterval). Zamknięcie przeglądarki → ping ustaje → klient znika
 * z „online" po oknie online (~2,5× interwału). Nic nie renderuje (null).
 */
export default function ClientHeartbeat() {
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const ping = () => {
      const token = authService.getToken();
      if (!token) return;
      fetch(`${API_BASE_URL}/api/auth/heartbeat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => { /* offline/błąd sieci — ignorujemy, kolejny ping spróbuje ponownie */ });
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

    // świeższy status po powrocie na kartę
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
