import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';

const SHOTS = '/Volumes/Backup_TM/projects/radsasfun_v2/cypress/screenshots-proof';
const TS = new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(SHOTS, { recursive: true });

async function loginAdmin(page: Page) {
  await page.goto('/admin-panel/login');
  await page.locator('input#login').fill('sguzik');
  await page.locator('input#password').fill('Glob@l2026!');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/admin-panel(?!\/login)/, { timeout: 20000 });
}

const BANNER = 'text=Wersja developerska — dane testowe';

test('Pasek na górze: strona publiczna + sticky po przewinięciu', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  const banner = page.locator(BANNER).first();
  await expect(banner).toBeVisible();
  // Pasek przy samej górze (top ~ 0)
  let box = await banner.boundingBox();
  console.log('PUBLIC top przed scroll:', box?.y);
  expect(box && box.y < 5).toBeTruthy();
  await page.screenshot({ path: `${SHOTS}/banner-public-top_${TS}.png`, clip: { x: 0, y: 0, width: 1440, height: 120 } });

  // Przewiń stronę mocno w dół — pasek MA zostać na górze (sticky)
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(600);
  box = await banner.boundingBox();
  console.log('PUBLIC top po scroll 1500:', box?.y);
  await expect(banner).toBeVisible();
  expect(box && box.y < 5).toBeTruthy();
  await page.screenshot({ path: `${SHOTS}/banner-public-scrolled_${TS}.png`, clip: { x: 0, y: 0, width: 1440, height: 120 } });
});

test('Pasek na górze: widok admina (rezerwacja) — pełna szerokość', async ({ page }) => {
  await loginAdmin(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin-panel/rezerwacja/REZ-2026-1992');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);

  const banner = page.locator(BANNER).first();
  await expect(banner).toBeVisible();
  const box = await banner.boundingBox();
  console.log('ADMIN banner box:', JSON.stringify(box));
  expect(box && box.y < 5).toBeTruthy();
  expect(box && box.width > 1400).toBeTruthy(); // pełna szerokość
  await page.screenshot({ path: `${SHOTS}/banner-admin-top_${TS}.png`, clip: { x: 0, y: 0, width: 1440, height: 130 } });
});

test('Pasek na górze: ekran logowania admina', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/admin-panel/login');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
  const banner = page.locator(BANNER).first();
  await expect(banner).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/banner-login-top_${TS}.png`, clip: { x: 0, y: 0, width: 1440, height: 120 } });
});
