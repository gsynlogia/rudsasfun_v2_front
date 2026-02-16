/**
 * Testy formularza edycji umowy i archiwum wersji – wyłącznie rezerwacja REZ-2026-442.
 * Weryfikacja: sekcja #dokumenty, przycisk „Edytuj umowę”, panel z formularzem, lista „Wersje umowy”.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.PLAYWRIGHT_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ADMIN_LOGIN = process.env.PLAYWRIGHT_ADMIN_LOGIN || 'admin';
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD || 'Radsas2008!';

const RESERVATION_NUMBER = 'REZ-2026-442';

test.describe('Edycja umowy i archiwum wersji (tylko REZ-2026-442)', () => {
  test('REZ-2026-442: #dokumenty – Edytuj umowę otwiera panel z formularzem, sekcja Wersje umowy', async ({
    page,
  }) => {
    const loginRes = await page.request.post(`${API_URL}/api/auth/login`, {
      data: { login: ADMIN_LOGIN, password: ADMIN_PASSWORD },
      headers: { 'Content-Type': 'application/json' },
    });
    if (!loginRes.ok()) {
      const body = await loginRes.text();
      throw new Error(`Login failed (${loginRes.status}): ${body}`);
    }
    const loginData = (await loginRes.json()) as { access_token?: string };
    const token = loginData.access_token;
    if (!token) throw new Error('No access_token in login response');

    await page.goto(BASE_URL + '/admin-panel/login');
    await page.evaluate(
      ({ t, user }) => {
        localStorage.setItem('radsasfun_auth_token', t);
        localStorage.setItem(
          'radsasfun_auth_user',
          JSON.stringify({
            id: 0,
            login: user.login,
            email: 'admin@local',
            user_type: 'admin',
            groups: ['admin'],
            is_superadmin: true,
            is_admin_user: true,
          })
        );
      },
      { t: token, user: { login: ADMIN_LOGIN } }
    );

    await page.goto(`${BASE_URL}/admin-panel/rezerwacja/${RESERVATION_NUMBER}#dokumenty`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: /Dokumenty/i }).or(page.locator('a[href*="#dokumenty"]'))).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Podgląd umowy').or(page.getByText('Podgląd umowy'))).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Edytuj umowę/i }).click();
    await expect(page.getByText('Edycja umowy')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Krok 1')).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('button', { name: /Zapisz/i })).toBeVisible({ timeout: 3000 });

    await expect(page.getByText(/Wersje umowy/i)).toBeVisible({ timeout: 3000 });
  });
});
