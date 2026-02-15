import path from 'path';
import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const REZ = 'REZ-2026-442';
const screensDir = path.join(process.cwd(), '..', 'screens_pg');

test.describe('Drukuj – walidacja pól obowiązkowych (zrzuty do analizy)', () => {
  test.use({
    httpCredentials: { username: 'synlogia', password: '#RAdsVs2@26!' },
  });

  test('karta kwalifikacyjna: Drukuj bez wypełnienia pól – czerwone pola i komunikaty', async ({ page }) => {
    await page.goto(`${BASE}/profil/aktualne-rezerwacje/${REZ}/karta-kwalifikacyjna`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const btn = page.getByRole('button', { name: /Drukuj/i });
    await expect(btn).toBeVisible();
    await btn.click();
    await page.waitForTimeout(800);

    const redBorders = page.locator('.border-red-500, .border-2.border-red-500, [class*="border-red"]');
    const redMessages = page.locator('p.text-red-600, .error-message').filter({ hasText: /To pole jest obowiązkowe|obowiązkowe/i });
    const hasErrorMsg = await redMessages.first().isVisible().catch(() => false);
    const countBorders = await redBorders.count();

    await page.screenshot({
      path: path.join(screensDir, 'qualification_drukuj_validation_errors.png'),
      fullPage: true,
    });

    expect(countBorders).toBeGreaterThan(0);
    expect(hasErrorMsg).toBe(true);
  });

  test('umowa: Drukuj – ewentualne błędy (dane REZ-2026-442 zwykle kompletne)', async ({ page }) => {
    await page.goto(`${BASE}/profil/aktualne-rezerwacje/${REZ}/umowa`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const btn = page.getByRole('button', { name: /Drukuj/i });
    await expect(btn).toBeVisible();
    await btn.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(screensDir, 'contract_drukuj_after_click.png'),
      fullPage: true,
    });
  });
});
