/**
 * Bug #266 (Trello YCJXoLXt) — E2E weryfikacja naprawy.
 *
 * Problem: panel "Edycja promocji i kodu rabatowego" (AdminPromotionV2EditPanel) używał
 * surowego fetch z ręcznym Authorization z propa authToken. Gdy token admina wygasł →
 * dropdown promocji pusty + czerwony komunikat "Promocje: 401".
 *
 * Naprawa: wszystkie wywołania HTTP przeniesione na authenticatedFetch z @/lib/utils/api
 * (świeży token z AuthService + przy 401 logout/redirect zamiast surowego "Promocje: 401").
 *
 * Ten test:
 *  A) PO naprawie z WAŻNYM tokenem — dropdown promocji ładuje listę, brak "Promocje: 401".
 *  B) (kontrast) z ZEPSUTYM tokenem — panel NIE pokazuje surowego "Promocje: 401"
 *     (authenticatedFetch przekierowuje na login).
 *
 * Zrzuty do cypress/screenshots-proof/ (format bug-266-<NN>_<timestamp>.png).
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';

const REZ = process.env.BUG266_REZ || 'REZ-2026-2909';
const SHOTS = path.resolve(__dirname, '../../cypress/screenshots-proof');
const ADMIN_LOGIN = 'sguzik';
const ADMIN_PASS = 'Glob@l2026!';
const AUTH_TOKEN_KEY = 'radsasfun_auth_token';

function ts(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto('/admin-panel/login');
  await page.locator('input#login').fill(ADMIN_LOGIN);
  await page.locator('input#password').fill(ADMIN_PASS);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/admin-panel(?!\/login)/, { timeout: 20000 });
}

async function openPromocjeTransport(page: import('@playwright/test').Page) {
  await page.goto(`/admin-panel/rezerwacja/${REZ}`);
  await page.waitForLoadState('domcontentloaded');
  // Tab "Promocje i transport"
  await page.locator('#tab-promocje-transport').click({ timeout: 20000 });
  // Czekaj aż nagłówek panelu się pojawi
  await expect(page.getByText('Edycja promocji i kodu rabatowego')).toBeVisible({ timeout: 20000 });
}

test('Bug #266 — PO naprawie: dropdown promocji ładuje listę (brak "Promocje: 401")', async ({ page }) => {
  await loginAdmin(page);
  await openPromocjeTransport(page);

  // Panel kończy ładowanie — loader znika.
  await expect(page.getByText(/Ładowanie listy promocji/i)).toHaveCount(0, { timeout: 20000 });

  const promoSelect = page.getByRole('combobox', { name: /^Promocja$/i });
  await expect(promoSelect).toBeVisible({ timeout: 20000 });

  // KLUCZOWA asercja buga: NIE ma surowego "Promocje: 401".
  await expect(page.getByText(/Promocje:\s*401/i)).toHaveCount(0);

  // Dropdown ma więcej niż samo "— brak —" (czyli lista promocji się załadowała).
  const optionCount = await promoSelect.locator('option').count();
  // co najmniej "— brak —" + >=1 realna promocja
  expect(optionCount).toBeGreaterThan(1);

  await page.screenshot({ path: path.join(SHOTS, `bug-266-02-po-naprawie-dropdown-ok_${ts()}.png`), fullPage: true });
  // Zrzut samego panelu (bliższy)
  const panel = page.locator('text=Edycja promocji i kodu rabatowego').locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
  await panel.screenshot({ path: path.join(SHOTS, `bug-266-03-po-naprawie-panel-zoom_${ts()}.png`) }).catch(() => {});
});

test('Bug #266 — kontrast: zepsuty token NIE pokazuje surowego "Promocje: 401"', async ({ page }) => {
  await loginAdmin(page);
  // Zepsuj token w localStorage (symulacja wygaśnięcia) — authenticatedFetch dostanie 401
  // i powinno przekierować na /admin-panel/login zamiast renderować "Promocje: 401".
  await page.evaluate((key) => {
    localStorage.setItem(key, 'expired.invalid.token');
  }, AUTH_TOKEN_KEY);

  await page.goto(`/admin-panel/rezerwacja/${REZ}`);
  await page.waitForLoadState('domcontentloaded');
  // Spróbuj wejść w tab; jeśli strona zdąży przekierować na login — to też dowód obsługi 401.
  await page.locator('#tab-promocje-transport').click({ timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(4000);

  await page.screenshot({ path: path.join(SHOTS, `bug-266-01-zepsuty-token-stan_${ts()}.png`), fullPage: true });

  // Asercja: surowy "Promocje: 401" NIGDZIE się nie pojawia (albo redirect na login, albo brak komunikatu).
  await expect(page.getByText(/Promocje:\s*401/i)).toHaveCount(0);
});
