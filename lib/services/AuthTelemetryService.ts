/**
 * Telemetria zdarzeń z formularzy logowania/rejestracji.
 * ZAKAZ: przesyłanie hasła. Logowany tylko fakt wypełnienia pól.
 */
import { API_BASE_URL } from '@/utils/api-config';

const EVENT_CATEGORY_FRONTEND_UI = 'frontend_ui';

export type AuthMethod = 'password' | 'magic_link' | null;

export function sendAuthTelemetry(payload: {
  email?: string | null;
  event_type: string;
  auth_method?: AuthMethod;
  details?: string | null;
}): void {
  const body = {
    email: payload.email || undefined,
    event_category: EVENT_CATEGORY_FRONTEND_UI,
    event_type: payload.event_type,
    auth_method: payload.auth_method ?? undefined,
    details: payload.details ?? undefined,
  };
  fetch(`${API_BASE_URL}/api/auth/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => { /* bezszelestnie */ });
}
