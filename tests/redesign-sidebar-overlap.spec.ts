import { test, Page } from '@playwright/test';
import * as fs from 'fs';

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

test('Sidebar overlap — zbliżenie lewej krawędzi paska zakładek (ikona Płatności w pełni widoczna)', async ({ page }) => {
  await loginAdmin(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`/admin-panel/rezerwacja/${REZ}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);

  // Zbliżenie obszaru: lewa krawędź menu (ok. 256px) + pierwsze zakładki
  await page.screenshot({
    path: `${SHOTS}/sidebar-overlap-zoom-platnosci_${TS}.png`,
    clip: { x: 230, y: 50, width: 620, height: 130 },
  });

  // Pełny zrzut kontrolny
  await page.screenshot({ path: `${SHOTS}/sidebar-overlap-full-1920_${TS}.png`, fullPage: false });
});
