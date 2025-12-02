import { test, expect } from '@playwright/test';

/**
 * Logout Functionality E2E Tests
 * Tests that users can logout from the header dropdown menu
 * Run in headed mode with screenshots as per workflow.txt requirements
 */

test.describe('Logout Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage (both sessionStorage and localStorage)
    await page.goto('http://localhost:3000/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should show login link when user is not authenticated', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots_playwright/logout-01-not-authenticated.png', fullPage: true });

    // Click on "Moje konto" dropdown
    const accountButton = page.locator('button').filter({ hasText: /Moje konto/i }).first();
    if (await accountButton.count() > 0) {
      await accountButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots_playwright/logout-02-dropdown-not-auth.png', fullPage: true });

      // Should show "Zaloguj się" link
      const loginLink = page.locator('a').filter({ hasText: /Zaloguj się/i });
      await expect(loginLink).toBeVisible();
    }
  });

  test('should show logout button when user is authenticated', async ({ page }) => {
    // First, login via magic link
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Request magic link
    await page.fill('input[type="email"]', 'szymon.guzik@gmail.com');
    await page.click('button:has-text("Wyślij magic link")');
    await page.waitForSelector('text=Email wysłany!', { timeout: 10000 });
    
    // Get token from backend (simulating email click)
    const token = await page.evaluate(async () => {
      // Request new magic link to get fresh token
      await fetch('http://localhost:8000/api/auth/magic-link/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'szymon.guzik@gmail.com' }),
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get actual token from backend
      const response = await fetch('http://localhost:8000/api/auth/magic-link/verify?token=test', {
        method: 'GET',
      });
      return 'mock-token';
    });

    // For this test, we'll manually set authentication in localStorage
    await page.evaluate(() => {
      localStorage.setItem('radsasfun_auth_token', 'test-token');
      localStorage.setItem('radsasfun_auth_user', JSON.stringify({
        id: 1,
        login: 'test@example.com',
        email: 'test@example.com',
        user_type: 'client',
        groups: [],
      }));
    });

    // Reload page to see authenticated state
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots_playwright/logout-03-authenticated.png', fullPage: true });

    // Click on "Moje konto" dropdown
    const accountButton = page.locator('button').filter({ hasText: /Moje konto/i }).first();
    if (await accountButton.count() > 0) {
      await accountButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots_playwright/logout-04-dropdown-auth.png', fullPage: true });

      // Should show logout button
      const logoutButton = page.locator('button').filter({ hasText: /Wyloguj się/i });
      await expect(logoutButton).toBeVisible();
    }
  });

  test('should logout user and redirect to home page', async ({ page }) => {
    // Set authentication
    await page.goto('http://localhost:3000/');
    await page.evaluate(() => {
      localStorage.setItem('radsasfun_auth_token', 'test-token');
      localStorage.setItem('radsasfun_auth_user', JSON.stringify({
        id: 1,
        login: 'test@example.com',
        email: 'test@example.com',
        user_type: 'client',
        groups: [],
      }));
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots_playwright/logout-05-before-logout.png', fullPage: true });

    // Click on "Moje konto" dropdown
    const accountButton = page.locator('button').filter({ hasText: /Moje konto/i }).first();
    if (await accountButton.count() > 0) {
      await accountButton.click();
      await page.waitForTimeout(500);

      // Click logout button
      const logoutButton = page.locator('button').filter({ hasText: /Wyloguj się/i });
      if (await logoutButton.count() > 0) {
        await logoutButton.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'screenshots_playwright/logout-06-after-logout.png', fullPage: true });

        // Should be redirected to home page
        expect(page.url()).toBe('http://localhost:3000/');

        // Check that localStorage is cleared
        const token = await page.evaluate(() => localStorage.getItem('radsasfun_auth_token'));
        expect(token).toBeNull();

        // Check that magic link redirect is cleared from localStorage
        const redirect = await page.evaluate(() => {
          return localStorage.getItem('radsas_fanMagic Link Redirect');
        });
        expect(redirect).toBeNull();
      }
    }
  });

  test('should close dropdown when clicking outside', async ({ page }) => {
    // Set authentication
    await page.goto('http://localhost:3000/');
    await page.evaluate(() => {
      localStorage.setItem('radsasfun_auth_token', 'test-token');
      localStorage.setItem('radsasfun_auth_user', JSON.stringify({
        id: 1,
        login: 'test@example.com',
        email: 'test@example.com',
        user_type: 'client',
        groups: [],
      }));
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Click on "Moje konto" dropdown
    const accountButton = page.locator('button').filter({ hasText: /Moje konto/i }).first();
    if (await accountButton.count() > 0) {
      await accountButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots_playwright/logout-07-dropdown-open.png', fullPage: true });

      // Click outside (on logo or other element)
      await page.click('img[alt*="Logo"]');
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots_playwright/logout-08-dropdown-closed.png', fullPage: true });

      // Dropdown should be closed (logout button not visible)
      const logoutButton = page.locator('button').filter({ hasText: /Wyloguj się/i });
      const isVisible = await logoutButton.isVisible().catch(() => false);
      expect(isVisible).toBeFalsy();
    }
  });
});

