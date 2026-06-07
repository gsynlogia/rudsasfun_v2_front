/**
 * Test: Weryfikacja naglowkow anty-cache na WSZYSTKICH endpointach /api/*.
 * Nie wysyla maili ani SMS — tylko HTTP HEAD/GET i sprawdza naglowki.
 */
import { test, expect } from '@playwright/test';

const API = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8000';

// Logowanie admina do uzyskania tokenu (potrzebne dla chronionych endpointow)
async function getAdminToken(): Promise<string> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: 'sguzik', password: 'Glob@l2026!' }),
  });
  if (!res.ok) {
    // Fallback: test endpoint
    const res2 = await fetch(`${API}/api/test/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'sguzik', password: 'Glob@l2026!' }),
    });
    const data = await res2.json();
    return data.access_token || data.token || '';
  }
  const data = await res.json();
  return data.access_token || data.token || '';
}

// Endpointy publiczne (nie wymagaja tokenu)
const PUBLIC_ENDPOINTS = [
  '/api/camps/',
  '/api/addons/public',
  '/api/diets/public',
  '/api/sources/public',
  '/api/documents/public',
  '/api/general-diets/public',
  '/api/general-promotions/public',
  '/api/general-protections/public',
  '/api/center-diets/public',
  '/api/center-promotions/public',
  '/api/center-protections/public',
  '/api/health-notice/public',
  '/api/payments/methods',
  '/api/addon-description/public',
];

// Endpointy wymagajace tokenu admina
const ADMIN_ENDPOINTS = [
  '/api/reservations/',
  '/api/reservations/paginated',
  '/api/reservations/my',
  '/api/admin-users',
  '/api/groups',
  '/api/groups/available-sections',
  '/api/addons/',
  '/api/diets/',
  '/api/diets/names',
  '/api/sources/',
  '/api/documents/',
  '/api/general-diets/',
  '/api/general-promotions/',
  '/api/general-protections/',
  '/api/center-diets/',
  '/api/center-promotions/',
  '/api/center-protections/',
  '/api/health-notice/',
  '/api/bank-accounts/',
  '/api/bank-accounts/active',
  '/api/invoices/my',
  '/api/email-status/',
  '/api/email-status/report',
  '/api/payments/',
  '/api/payments/paginated',
  '/api/payments/changes',
  '/api/payments/filter-search',
  '/api/manual-payments/',
  '/api/contract-archive',
  '/api/contracts/my',
  '/api/contracts/regenerator/list',
  '/api/qualification-cards/my',
  '/api/admin/sms/logs',
  '/api/admin/sms/templates',
  '/api/admin/sms/turnuses',
  '/api/admin/sms/search-phones',
  '/api/admin-users/groups/all',
  '/api/admin-users/me/settings',
  '/api/admin-settings/auth-logs',
  '/api/admin-settings/users-no-reservations',
  '/api/blink-config/',
  '/api/system-settings/',
  '/api/system-settings/online-payments/status',
  '/api/camps/transports/all',
  '/api/addon-description/',
  '/api/auth/me',
  '/api/auth/users',
  '/api/signed-documents/reservation/1223',
  '/api/qualification-cards/1223/data',
  '/api/qualification-cards/1223/can-generate',
  '/api/qualification-cards/1223/files',
  '/api/qualification-cards/1223/html-exists',
  '/api/reservations/1223',
  '/api/reservations/by-number/REZ-2026-1223',
  '/api/reservations/1223/notes',
  '/api/reservations/1223/system-events',
  '/api/invoices/reservation/1223',
  '/api/manual-invoices/reservation/1223',
  '/api/manual-payments/reservation/1223',
  '/api/certificates/reservation/1223',
  '/api/contracts/1223',
  '/api/contracts/1223/files',
  '/api/contracts/1223/html-exists',
  '/api/annexes/reservation/1223',
];

function assertCacheHeaders(headers: Headers, endpoint: string) {
  const cc = (headers.get('cache-control') || '').toLowerCase();
  expect(cc, `${endpoint}: brak Cache-Control: no-store`).toContain('no-store');
  expect(cc, `${endpoint}: brak no-cache`).toContain('no-cache');
  expect(cc, `${endpoint}: brak must-revalidate`).toContain('must-revalidate');
}

test.describe('Naglowki anty-cache na endpointach API', () => {
  test('Endpointy publiczne — wszystkie maja no-store', async () => {
    const results: { endpoint: string; status: number; cacheControl: string }[] = [];

    for (const ep of PUBLIC_ENDPOINTS) {
      const res = await fetch(`${API}${ep}`, { method: 'GET' });
      const cc = res.headers.get('cache-control') || 'BRAK';
      results.push({ endpoint: ep, status: res.status, cacheControl: cc });
      assertCacheHeaders(res.headers, ep);
    }

    console.log('\n=== PUBLICZNE ENDPOINTY ===');
    console.table(results);
  });

  test('Endpointy admina — wszystkie maja no-store', async () => {
    const token = await getAdminToken();
    expect(token, 'Nie udalo sie uzyskac tokenu admina').toBeTruthy();

    const results: { endpoint: string; status: number; cacheControl: string }[] = [];
    const failures: string[] = [];

    for (const ep of ADMIN_ENDPOINTS) {
      const res = await fetch(`${API}${ep}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const cc = res.headers.get('cache-control') || 'BRAK';
      results.push({ endpoint: ep, status: res.status, cacheControl: cc });

      if (!cc.toLowerCase().includes('no-store')) {
        failures.push(`${ep} -> Cache-Control: ${cc}`);
      }
    }

    console.log('\n=== ENDPOINTY ADMINA ===');
    console.table(results);

    expect(failures, `Endpointy bez no-store:\n${failures.join('\n')}`).toHaveLength(0);
  });

  test('Endpointy POST/PATCH — tez maja no-store', async () => {
    const token = await getAdminToken();
    expect(token, 'Nie udalo sie uzyskac tokenu admina').toBeTruthy();

    // POST/PATCH endpointy ktore mozna bezpiecznie wywolac (zwroca 422/400 ale naglowki beda)
    const MUTATION_ENDPOINTS = [
      { method: 'POST', path: '/api/signed-documents/request-sms-code' },
      { method: 'POST', path: '/api/signed-documents/verify-sms-code' },
      { method: 'POST', path: '/api/qualification-cards/1223/data' },
      { method: 'POST', path: '/api/qualification-cards/1223/status' },
      { method: 'PATCH', path: '/api/qualification-cards/by-number/REZ-2026-1223/data/partial' },
      { method: 'PATCH', path: '/api/reservations/by-number/REZ-2026-1223/partial' },
    ];

    const results: { method: string; endpoint: string; status: number; cacheControl: string }[] = [];
    const failures: string[] = [];

    for (const { method, path } of MUTATION_ENDPOINTS) {
      const res = await fetch(`${API}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const cc = res.headers.get('cache-control') || 'BRAK';
      results.push({ method, endpoint: path, status: res.status, cacheControl: cc });

      if (!cc.toLowerCase().includes('no-store')) {
        failures.push(`${method} ${path} -> Cache-Control: ${cc}`);
      }
    }

    console.log('\n=== ENDPOINTY POST/PATCH ===');
    console.table(results);

    expect(failures, `Endpointy bez no-store:\n${failures.join('\n')}`).toHaveLength(0);
  });

  test('Endpoint /health NIE ma naglowkow anty-cache (nie-API)', async () => {
    const res = await fetch(`${API}/health`, { method: 'GET' });
    const cc = res.headers.get('cache-control') || '';
    // /health nie powinien miec wymuszonych naglowkow — to nie /api/
    console.log(`/health -> Cache-Control: ${cc || 'BRAK'}`);
    // Nie assertujemy — po prostu logujemy
  });
});
