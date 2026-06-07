import path from 'path';
import fs from 'fs';
import { test, expect } from '@playwright/test';

/**
 * Skrypt: tworzy magiczny link (testowe API) i używa go do zalogowania w Playwright.
 * Zapisuje stan sesji do playwright/.auth/user.json.
 *
 * Wymagania:
 * - Backend uruchomiony z ENVIRONMENT=test (np. ENVIRONMENT=test uvicorn app.main:app)
 * - Frontend na PLAYWRIGHT_BASE_URL (domyślnie http://localhost:3000)
 *
 * Uruchomienie: npx playwright test save-logged-in-state --headed --project=chromium
 *
 * Następnie uruchamiaj testy z projektem chromium-logged-in.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.PLAYWRIGHT_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const LOGIN_EMAIL = process.env.PLAYWRIGHT_LOGIN_EMAIL || 'szymon.guzik@gmail.com';
const AUTH_DIR = path.join(process.cwd(), 'playwright', '.auth');
const AUTH_FILE = path.join(AUTH_DIR, 'user.json');

test.describe('Zapis stanu zalogowanej przeglądarki (magic link z API)', () => {
  test.use({
    httpCredentials: { username: 'synlogia', password: '#RAdsVs2@26!' },
  });

  test('pobierz magic link z testowego API, zaloguj się, zapisz stan', async ({
    page,
    context,
  }) => {
    const res = await fetch(`${API_URL}/api/test/auth/magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: LOGIN_EMAIL }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Magic link API failed (${res.status}). Upewnij się, że backend działa z ENVIRONMENT=test. Body: ${text}`
      );
    }

    const data = (await res.json()) as { token: string; login_url: string };
    const verifyUrl = `${BASE_URL}/auth/verify?token=${encodeURIComponent(data.token)}`;

    await page.goto(verifyUrl);
    await expect(page.getByText(/Logowanie zakończone sukcesem|Przekierowywanie/i)).toBeVisible({
      timeout: 15000,
    });
    await page.waitForURL((url) => !url.pathname.includes('/auth/verify'), { timeout: 15000 });

    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
    await context.storageState({ path: AUTH_FILE });
  });
});
