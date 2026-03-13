/**
 * Testy Playwright dla rezerwacji REZ-2026-1223 – zachowanie jako użytkownik (klient).
 *
 * Scenariusz:
 * 1. Logowanie jako admin (sguzik z backend/scripts/seed_admin_users.py).
 * 2. Wejście na rezerwację REZ-2026-1223 w panelu admina.
 * 3. Klik niebieskiego przycisku „Zaloguj się bezpośrednio na konto klienta” → generowanie magic linku.
 * 4. Otwarcie magic linku → zalogowanie jako klient.
 * 5. Nawigacja do karty kwalifikacyjnej i zrzuty ekranu do screens_pg.
 *
 * Uruchomienie (headed, zrzuty):
 *   npx playwright test rezerwacja-REZ-2026-1223-client --headed --project=chromium
 *
 * Headless:
 *   npx playwright test rezerwacja-REZ-2026-1223-client --project=chromium
 *
 * Wymagania: Backend (8000), Frontend (3000). Admin sguzik (hasło: Glob@l2026!) z seed_admin_users.py.
 * Zrzuty: screens_pg/ (katalog nad frontend/).
 * Przeglądarka: npx playwright install chromium
 */

import path from 'path';
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.PLAYWRIGHT_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const RESERVATION_NUMBER = 'REZ-2026-1223';

const ADMIN_LOGIN = 'sguzik';
const ADMIN_PASSWORD = 'Glob@l2026!';

const screensDir = path.join(process.cwd(), '..', 'screens_pg');

test.describe('REZ-2026-1223 – admin → magic link → klient (karta kwalifikacyjna)', () => {
  test.beforeAll(async () => {
    const fs = await import('fs');
    if (!fs.existsSync(screensDir)) {
      fs.mkdirSync(screensDir, { recursive: true });
    }
  });

  test('logowanie jako admin (sguzik), wejście na rezerwację, zrzut nagłówka', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin-panel/login`);
    await page.getByLabel(/Login/i).fill(ADMIN_LOGIN);
    await page.getByLabel(/Hasło/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /Zaloguj się/i }).click();
    await expect(page).toHaveURL(/\/(admin-panel)(\/)?(\?|$)/, { timeout: 15000 });

    await page.goto(`${BASE_URL}/admin-panel/rezerwacja/${RESERVATION_NUMBER}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(RESERVATION_NUMBER, { exact: false })).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: path.join(screensDir, 'rez-1223_admin_reservation_header.png'),
      fullPage: false,
    });
  });

  test('admin → magic link → klient → karta kwalifikacyjna (pełny flow + zrzuty)', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(`${BASE_URL}/admin-panel/login`);
    await page.getByLabel(/Login/i).fill(ADMIN_LOGIN);
    await page.getByLabel(/Hasło/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /Zaloguj się/i }).click();
    await expect(page).toHaveURL(/\/(admin-panel)(\/)?(\?|$)/, { timeout: 15000 });

    await page.goto(`${BASE_URL}/admin-panel/rezerwacja/${RESERVATION_NUMBER}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(RESERVATION_NUMBER, { exact: false })).toBeVisible({ timeout: 10000 });

    const magicLinkPromise = page.waitForResponse(
      (res) => {
        const url = res.url();
        return url.includes('generate-magic-link') && res.request().method() === 'POST' && res.status() === 200;
      },
      { timeout: 15000 }
    );

    await page.getByRole('button', { name: /Zaloguj się bezpośrednio na konto klienta/i }).click();
    const response = await magicLinkPromise;
    const body = (await response.json()) as {
      link_local: string;
      link_production: string;
      user_email: string;
      reservation_number: string;
    };
    const magicLink = body.link_local || body.link_production;
    expect(magicLink).toBeTruthy();
    expect(magicLink).toContain('token=');

    await page.screenshot({
      path: path.join(screensDir, 'rez-1223_admin_after_magic_link_modal.png'),
      fullPage: false,
    });

    await page.goto(magicLink);
    await expect(
      page.getByText(/Logowanie zakończone sukcesem|Przekierowywanie|Zalogowano/i)
    ).toBeVisible({ timeout: 15000 });
    await page.waitForURL((url) => !url.pathname.includes('/auth/verify'), { timeout: 15000 });

    await page.goto(`${BASE_URL}/profil/aktualne-rezerwacje/${RESERVATION_NUMBER}/karta-kwalifikacyjna`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(screensDir, 'rez-1223_client_karta_kwalifikacyjna.png'),
      fullPage: true,
    });

    const saveBtn = page.getByRole('button', { name: /Zapisz zmiany/i });
    const signBtn = page.getByRole('button', { name: /Podpisz dokument/i });
    await expect(saveBtn.or(signBtn).first()).toBeVisible({ timeout: 5000 });
  });

  test('klient: karta kwalifikacyjna – przycisk Drukuj widoczny (wymaga zapisanego stanu klienta)', async ({
    browser,
  }) => {
    const fs = await import('fs');
    const authFile = path.join(process.cwd(), 'playwright', '.auth', 'user.json');
    if (!fs.existsSync(authFile)) {
      test.skip();
      return;
    }
    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/profil/aktualne-rezerwacje/${RESERVATION_NUMBER}/karta-kwalifikacyjna`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    const drukuj = page.getByRole('button', { name: /Drukuj/i });
    await expect(drukuj).toBeVisible({ timeout: 10000 });
    await page.screenshot({
      path: path.join(screensDir, 'rez-1223_client_karta_drukuj_visible.png'),
      fullPage: false,
    });
    await context.close();
  });
});
