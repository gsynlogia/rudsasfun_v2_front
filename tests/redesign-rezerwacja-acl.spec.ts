import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';

const SHOTS = '/Volumes/Backup_TM/projects/radsasfun_v2/cypress/screenshots-proof';
const REZ = 'REZ-2026-1992';
const TS = new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(SHOTS, { recursive: true });

async function login(page: Page, loginName: string, pass: string) {
  await page.goto('/admin-panel/login');
  await page.locator('input#login').fill(loginName);
  await page.locator('input#password').fill(pass);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/admin-panel(?!\/login)/, { timeout: 20000 });
}

test('ACL read-only (kierownik_radsas) — panel widoczny, zakładka „Notatki" UKRYTA', async ({ page }) => {
  await login(page, 'kierownik_radsas', 'radsas26!');
  await page.setViewportSize({ width: 1680, height: 1000 });
  await page.goto(`/admin-panel/rezerwacja/${REZ}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2800);

  const panel = page.getByRole('complementary', { name: /Notatki, zdarzenia/i });
  await expect(panel).toBeVisible();

  // Read-only: zakładka „Notatki" UKRYTA (hideNotes), „Zdarzenia" widoczna
  const notesTab = panel.getByRole('button', { name: /^Notatki$/ });
  const eventsTab = panel.getByRole('button', { name: /^Zdarzenia$/ });
  await expect(notesTab).toHaveCount(0);
  await expect(eventsTab).toBeVisible();
  await expect(panel.getByText('Zdarzenia klienta')).toBeVisible();

  await page.screenshot({ path: `${SHOTS}/acl-readonly-notatki-ukryte_${TS}.png`, fullPage: false });
  console.log('ACL OK: read-only — Notatki ukryte (count=0), Zdarzenia widoczne, panel renderuje się');
});

test('ADMIN (sguzik) — kontrast: zakładka „Notatki" WIDOCZNA', async ({ page }) => {
  await login(page, 'sguzik', 'Glob@l2026!');
  await page.setViewportSize({ width: 1680, height: 1000 });
  await page.goto(`/admin-panel/rezerwacja/${REZ}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2800);

  const panel = page.getByRole('complementary', { name: /Notatki, zdarzenia/i });
  await expect(panel).toBeVisible();
  // Admin: obie zakładki widoczne
  await expect(panel.getByRole('button', { name: /^Notatki$/ })).toBeVisible();
  await expect(panel.getByRole('button', { name: /^Zdarzenia$/ })).toBeVisible();
  console.log('ADMIN OK: Notatki + Zdarzenia widoczne dla superadmina');
});
