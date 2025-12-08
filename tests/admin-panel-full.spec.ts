/**
 * Admin Panel Full Tests
 * Tests admin panel login and all functionalities
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const ADMIN_LOGIN = 'admin';
const ADMIN_PASSWORD = 'admin';

test.describe('Admin Panel Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock admin login API
    await page.route(`${API_BASE_URL}/api/auth/login`, async (route: any) => {
      const request = route.request();
      const postData = await request.postDataJSON();
      
      if (postData.login === ADMIN_LOGIN && postData.password === ADMIN_PASSWORD) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'admin-jwt-token-12345',
            token_type: 'bearer',
            user: {
              id: 0,
              login: ADMIN_LOGIN,
              email: 'admin@radsasfun.pl',
              user_type: 'admin',
              groups: ['admin'],
              accessible_sections: ['camps', 'reservations', 'payments', 'diets', 'transports', 'users']
            }
          })
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Invalid login or password' })
        });
      }
    });
  });

  test('Admin login with correct credentials', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin-panel/login`);

    // Fill login form
    await page.fill('input[name="login"]', ADMIN_LOGIN);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);

    // Submit
    await page.click('button:has-text("Zaloguj")');

    // Wait for redirect to admin panel
    await page.waitForURL(/.*admin-panel.*/, { timeout: 10000 });
    
    // Verify we're in admin panel
    expect(page.url()).toContain('admin-panel');
  });

  test('Admin login with incorrect credentials', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin-panel/login`);

    // Fill login form with wrong password
    await page.fill('input[name="login"]', ADMIN_LOGIN);
    await page.fill('input[name="password"]', 'wrongpassword');

    // Submit
    await page.click('button:has-text("Zaloguj")');

    // Wait for error message
    await page.waitForSelector('text=Invalid login or password', { timeout: 5000 });
    
    // Verify we're still on login page
    expect(page.url()).toContain('login');
  });

  test('Admin panel - navigate to camps', async ({ page }) => {
    // Login first
    await page.goto(`${FRONTEND_URL}/admin-panel/login`);
    await page.fill('input[name="login"]', ADMIN_LOGIN);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Zaloguj")');
    await page.waitForURL(/.*admin-panel.*/, { timeout: 10000 });

    // Navigate to camps
    await page.click('a:has-text("Obozy")');
    await page.waitForURL(/.*camps.*/, { timeout: 5000 });
    
    // Verify camps page loaded
    await expect(page.locator('h1, h2').filter({ hasText: /Oboz|Camp/i })).toBeVisible();
  });

  test('Admin panel - navigate to reservations', async ({ page }) => {
    // Login first
    await page.goto(`${FRONTEND_URL}/admin-panel/login`);
    await page.fill('input[name="login"]', ADMIN_LOGIN);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Zaloguj")');
    await page.waitForURL(/.*admin-panel.*/, { timeout: 10000 });

    // Navigate to reservations
    await page.click('a:has-text("Rezerwacje")');
    await page.waitForURL(/.*reservations.*/, { timeout: 5000 });
    
    // Verify reservations page loaded
    await expect(page.locator('h1, h2').filter({ hasText: /Rezerwac|Reservation/i })).toBeVisible();
  });

  test('Admin panel - navigate to payments', async ({ page }) => {
    // Login first
    await page.goto(`${FRONTEND_URL}/admin-panel/login`);
    await page.fill('input[name="login"]', ADMIN_LOGIN);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Zaloguj")');
    await page.waitForURL(/.*admin-panel.*/, { timeout: 10000 });

    // Navigate to payments
    await page.click('a:has-text("Płatności")');
    await page.waitForURL(/.*payments.*/, { timeout: 5000 });
    
    // Verify payments page loaded
    await expect(page.locator('h1, h2').filter({ hasText: /Płatnoś|Payment/i })).toBeVisible();
  });

  test('Admin panel - navigate to diets', async ({ page }) => {
    // Login first
    await page.goto(`${FRONTEND_URL}/admin-panel/login`);
    await page.fill('input[name="login"]', ADMIN_LOGIN);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Zaloguj")');
    await page.waitForURL(/.*admin-panel.*/, { timeout: 10000 });

    // Navigate to diets
    await page.click('a:has-text("Diety")');
    await page.waitForURL(/.*diets.*/, { timeout: 5000 });
    
    // Verify diets page loaded
    await expect(page.locator('h1, h2').filter({ hasText: /Diet|Zarządzanie dietami/i })).toBeVisible();
  });

  test('Admin panel - access denied for non-admin', async ({ page }) => {
    // Try to access admin panel without login
    await page.goto(`${FRONTEND_URL}/admin-panel/camps`);

    // Should redirect to login
    await page.waitForURL(/.*login.*/, { timeout: 5000 });
    expect(page.url()).toContain('login');
  });
});



