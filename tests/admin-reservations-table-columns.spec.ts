import path from 'path';
import fs from 'fs';
import { test, expect } from '@playwright/test';

/**
 * Weryfikacja tabeli rezerwacji: nagłówki kolumn muszą odpowiadać danym w komórkach.
 * Logowanie: admin + hasło z env PLAYWRIGHT_ADMIN_PASSWORD (np. Radsas2008!) lub fallback dla CI.
 * Uruchomienie: npx playwright test admin-reservations-table-columns --headed --project=chromium
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.PLAYWRIGHT_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ADMIN_LOGIN = process.env.PLAYWRIGHT_ADMIN_LOGIN || 'admin';
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD || 'Radsas2008!';

test.describe('Tabela rezerwacji - zgodność kolumn z danymi', () => {
  test('logowanie admin, tabela rezerwacji: kolumny E-mail, Data rezerwacji, Kwota całkowita mają poprawne typy danych', async ({
    page,
  }) => {
    // 1) Token przez API (read-only)
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

    // 2) Wejście na panel z tokenem w localStorage
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

    // 3) Przejście do listy rezerwacji
    await page.goto(BASE_URL + '/admin-panel/reservations');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table thead th', { timeout: 15000 });

    // 4) Pobierz teksty nagłówków (kolejność = kolejność kolumn)
    const headers = await page.locator('table thead th').allTextContents();
    const headerTexts = headers.map((t) => t.replace(/\s+/g, ' ').trim());

    // 5) Pierwszy wiersz danych (komórki)
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    const cells = await firstRow.locator('td').allTextContents();
    const cellTexts = cells.map((t) => t.replace(/\s+/g, ' ').trim());

    // 6) Mapowanie: indeks nagłówka -> wartość komórki
    const getCellByHeader = (headerSubstring: string): string => {
      const i = headerTexts.findIndex((h) => h.includes(headerSubstring));
      if (i === -1) return '';
      return cellTexts[i] ?? '';
    };

    // 7) Asercje (polskie nazwy z COLUMN_DEFINITIONS)
    const emailCell = getCellByHeader('E-mail') || getCellByHeader('EMAIL');
    const dataRezCell = getCellByHeader('Data rezerwacji');
    const kwotaCell = getCellByHeader('Kwota całkowita');
    const nazwaObozuCell = getCellByHeader('Nazwa obozu');
    const promocjaCell = getCellByHeader('Promocja');
    const statusWplatyCell = getCellByHeader('Status wpłaty');

    // E-mail: powinien być adres e-mail (z @) lub "-" / pusty – NIE nazwa obozu
    const looksLikeEmail = (s: string) => s.includes('@') || s === '-' || s === '' || s.length === 0;
    const looksLikeCampName = (s: string) => /^[A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ\s\-]+$/.test(s) && s.length > 1 && !s.includes('@');
    if (emailCell && !looksLikeEmail(emailCell) && looksLikeCampName(emailCell)) {
      throw new Error(
        `Kolumna E-mail zawiera nazwę obozu zamiast e-maila: "${emailCell}". Nagłówki: ${JSON.stringify(headerTexts.slice(0, 12))}`
      );
    }

    // Data rezerwacji: format daty (np. DD.MM.YYYY) lub pusty – NIE kwota w PLN
    const looksLikeDate = (s: string) => /^\d{1,2}\.\d{1,2}\.\d{2,4}/.test(s) || s === '-' || s === '';
    const looksLikePln = (s: string) => /[\d\s,]+\s*PLN/.test(s) || /^\d+[,.]?\d*\s*PLN/.test(s);
    if (dataRezCell && looksLikePln(dataRezCell)) {
      throw new Error(
        `Kolumna Data rezerwacji zawiera kwotę zamiast daty: "${dataRezCell}". Nagłówki: ${JSON.stringify(headerTexts.slice(0, 12))}`
      );
    }

    // Kwota całkowita: kwota w PLN lub pusty – NIE data
    if (kwotaCell && looksLikeDate(kwotaCell) && !looksLikePln(kwotaCell)) {
      throw new Error(
        `Kolumna Kwota całkowita zawiera datę zamiast kwoty: "${kwotaCell}". Nagłówki: ${JSON.stringify(headerTexts.slice(0, 12))}`
      );
    }

    // Nazwa obozu: tekst (nazwa), nie status płatności "Nieopłacone"
    if (nazwaObozuCell && nazwaObozuCell === 'Nieopłacone') {
      throw new Error(
        `Kolumna Nazwa obozu zawiera status płatności zamiast nazwy obozu: "${nazwaObozuCell}"`
      );
    }

    // Status wpłaty: tekst typu Nieopłacone / Opłacone, nie kwota w PLN
    if (statusWplatyCell && looksLikePln(statusWplatyCell) && !statusWplatyCell.includes('Nieopłacone') && !statusWplatyCell.includes('Opłacone')) {
      throw new Error(
        `Kolumna Status wpłaty zawiera kwotę zamiast statusu: "${statusWplatyCell}"`
      );
    }

    // Screenshot do weryfikacji wizualnej
    const screensDir = path.join(process.cwd(), '..', 'screens_pg');
    if (!fs.existsSync(screensDir)) fs.mkdirSync(screensDir, { recursive: true });
    await page.screenshot({
      path: path.join(screensDir, 'admin_reservations_table_columns_ok.png'),
      fullPage: false,
    });
  });
});
