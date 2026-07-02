import { test, Page } from '@playwright/test';

async function loginAdmin(page: Page) {
  await page.goto('/admin-panel/login');
  await page.locator('input#login').fill('sguzik');
  await page.locator('input#password').fill('Glob@l2026!');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/admin-panel(?!\/login)/, { timeout: 20000 });
}

test('MEASURE admin — co jest pod paskiem', async ({ page }) => {
  await loginAdmin(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin-panel/rezerwacja/REZ-2026-1992');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);

  const banner = await page.locator('text=Wersja developerska — dane testowe').first().boundingBox();
  const logo = await page.locator('img[src*="logo"]').first().boundingBox().catch(() => null);
  const sidebar = await page.locator('div.fixed.left-0.bg-slate-800').first().boundingBox().catch(() => null);
  const header = await page.locator('text=Szczegóły rezerwacji').first().boundingBox().catch(() => null);
  const bell = await page.locator('button[title="Powiadomienia"]').first().boundingBox().catch(() => null);
  console.log('ADMIN MEASURE:');
  console.log('  banner:', JSON.stringify(banner));
  console.log('  sidebar(fixed) y=', sidebar?.y, 'h=', sidebar?.height);
  console.log('  logo y=', logo?.y);
  console.log('  header y=', header?.y);
  console.log('  bell y=', bell?.y);
  // czy sidebar/logo pod paskiem?
  const bh = banner?.height ?? 0;
  console.log('  >>> sidebar pod paskiem?', (sidebar?.y ?? 99) < bh - 0.5);
  console.log('  >>> logo pod paskiem?', (logo?.y ?? 99) < bh - 0.5);
});

test('MEASURE public — co jest pod paskiem', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  const banner = await page.locator('text=Wersja developerska — dane testowe').first().boundingBox();
  // nav/header publiczny
  const nav = await page.locator('header, nav').first().boundingBox().catch(() => null);
  const logo = await page.locator('img[src*="logo"]').first().boundingBox().catch(() => null);
  console.log('PUBLIC MEASURE:');
  console.log('  banner:', JSON.stringify(banner));
  console.log('  pierwszy header/nav y=', nav?.y, 'h=', nav?.height);
  console.log('  logo y=', logo?.y);
  const bh = banner?.height ?? 0;
  console.log('  >>> nav pod paskiem?', (nav?.y ?? 99) < bh - 0.5);
});
