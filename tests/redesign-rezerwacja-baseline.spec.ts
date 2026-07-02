import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';

// Zrzuty dowodowe (CLAUDE.md): absolutna ścieżka — omija GOTCHA cypress/cypress/.
const SHOTS = '/Volumes/Backup_TM/projects/radsasfun_v2/cypress/screenshots-proof';
const REZ = 'REZ-2026-1992';
const TS = new Date().toISOString().replace(/[:.]/g, '-');

fs.mkdirSync(SHOTS, { recursive: true });

async function loginAdmin(page: Page) {
  await page.goto('/admin-panel/login');
  await page.locator('input#login').fill('sguzik');
  await page.locator('input#password').fill('Glob@l2026!');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/admin-panel(?!\/login)/, { timeout: 20000 });
}

test('BASELINE rezerwacja — zrzuty obecnego stanu (szeroki + wąski)', async ({ page }) => {
  await loginAdmin(page);

  // Szeroki viewport
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`/admin-panel/rezerwacja/${REZ}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/baseline-01-rezerwacja-1920_${TS}.png`, fullPage: false });

  // Wąski viewport (Pan: „przy zwężaniu okna układ się rozjeżdża/chowa")
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}/baseline-02-rezerwacja-1280_${TS}.png`, fullPage: false });

  // Jeszcze węższy — desktop mocno zwężony
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}/baseline-03-rezerwacja-1100_${TS}.png`, fullPage: false });
});

test('ZASTOSUJ bug — kalendarz statystyk: klik Zastosuj BEZ zmiany zakresu reloaduje?', async ({ page }) => {
  await loginAdmin(page);
  await page.setViewportSize({ width: 1680, height: 1000 });

  const statReqs: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/admin/reservation-statistics/statistics')) statReqs.push(req.url());
  });

  await page.goto('/admin-panel/statystyka/statystyka-rezerwacji');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  const afterLoad = statReqs.length;
  console.log('DIAG: requests po pierwszym ładowaniu =', afterLoad);

  // Otwórz kalendarz (button z ikoną Calendar)
  const calBtn = page.locator('button:has(svg.lucide-calendar)').first();
  await calBtn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/zastosuj-01-kalendarz-otwarty_${TS}.png`, fullPage: false });

  const applyBtn = page.getByRole('button', { name: 'Zastosuj' });
  const applyVisible = await applyBtn.isVisible().catch(() => false);
  console.log('DIAG: Zastosuj widoczny =', applyVisible);

  const before = statReqs.length;
  // Klik Zastosuj BEZ zmiany zakresu — łap overlay podczas
  await applyBtn.click();
  // overlay "Przeładowywanie…" powinien się pojawić (StatsReloadOverlay, MIN_RELOAD_MS=400)
  let overlaySeen = false;
  try {
    await expect(page.getByText('Przeładowywanie…')).toBeVisible({ timeout: 1000 });
    overlaySeen = true;
  } catch { /* overlay nieuchwycony */ }
  await page.screenshot({ path: `${SHOTS}/zastosuj-02-po-kliku_${TS}.png`, fullPage: false });
  await page.waitForTimeout(1200);
  const after = statReqs.length;

  console.log('DIAG WYNIK: before=', before, 'after=', after, 'delta=', after - before, 'overlaySeen=', overlaySeen);
  await page.screenshot({ path: `${SHOTS}/zastosuj-03-koncowy_${TS}.png`, fullPage: false });

  // Asercja: klik Zastosuj BEZ zmiany MUSI wywołać nowy fetch (reload)
  expect(after).toBeGreaterThan(before);
});
