import { test, expect, Page } from '@playwright/test';
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

const VIEWPORTS = [
  { w: 1920, h: 1080, name: '1920' },
  { w: 1440, h: 900, name: '1440' },
  { w: 1280, h: 800, name: '1280' },
  { w: 820, h: 1100, name: '820-tablet' },
  { w: 414, h: 896, name: '414-mobile' },
];

test('AFTER redesign — zrzuty RWD na 5 rozdzielczościach', async ({ page }) => {
  await loginAdmin(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`/admin-panel/rezerwacja/${REZ}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${SHOTS}/after-rwd-${vp.name}_${TS}.png`, fullPage: false });
  }
});

test('REGRESJA — zakładki klikalne, hash w URL, panel widoczny na każdej zakładce', async ({ page }) => {
  await loginAdmin(page);
  await page.setViewportSize({ width: 1680, height: 1000 });
  await page.goto(`/admin-panel/rezerwacja/${REZ}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);

  // Panel Notatki/Zdarzenia (aside role=complementary) widoczny
  const panel = page.getByRole('complementary', { name: /Notatki, zdarzenia/i });
  await expect(panel).toBeVisible();

  // Klik „Dokumenty" → hash #dokumenty, panel nadal widoczny
  await page.getByRole('tab', { name: /^Dokumenty$/ }).click();
  await page.waitForTimeout(800);
  expect(page.url()).toContain('#dokumenty');
  await expect(panel).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/after-regresja-01-dokumenty_${TS}.png`, fullPage: false });

  // Klik „Upoważnienia" (ostatnia, była ucinana) → osiągalna, hash, panel widoczny
  const upowTab = page.getByRole('tab', { name: /Upoważnienia/ });
  await upowTab.scrollIntoViewIfNeeded();
  await upowTab.click();
  await page.waitForTimeout(800);
  expect(page.url()).toContain('#upowaznienia');
  await expect(panel).toBeVisible();

  // Klik „Zdrowie" → hash, panel widoczny
  await page.getByRole('tab', { name: /^Zdrowie$/ }).click();
  await page.waitForTimeout(800);
  expect(page.url()).toContain('#zdrowie');
  await expect(panel).toBeVisible();

  // Przełącznik Notatki/Zdarzenia w panelu — klik „Zdarzenia" działa
  const eventsTabBtn = panel.getByRole('button', { name: /Zdarzenia/i }).first();
  await eventsTabBtn.click();
  await page.waitForTimeout(500);
  await expect(panel.getByText('Zdarzenia klienta')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/after-regresja-02-zdrowie-panel_${TS}.png`, fullPage: false });

  console.log('REGRESJA OK: zakładki klikalne, hash działa, panel widoczny na każdej zakładce');
});
