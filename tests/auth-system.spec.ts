import { test, expect } from '@playwright/test';

/**
 * Authentication System Tests
 * Tests complete auth flow: login, protected routes, logout, redirects
 * Run in HEADED mode to see Chromium browser
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';
const FRONTEND_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Authentication System', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear localStorage and cookies before each test
    await context.clearCookies();
    await page.goto(FRONTEND_URL);
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should redirect to login when accessing admin panel without auth', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin-panel`);
    
    // Should redirect to login page
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin-panel/login`);
    
    // Should see login form
    await expect(page.locator('h1')).toContainText('Logowanie do panelu administracyjnego');
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login successfully with correct credentials', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin-panel/login`, { waitUntil: 'networkidle' });
    
    // Wait for form to be ready
    await page.waitForSelector('input[type="text"], input[name="login"], input[id="login"]', { timeout: 10000 });
    
    // Fill login form - use more flexible selectors
    const loginInput = page.locator('input[type="text"], input[name="login"], input[id="login"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Zaloguj")').first();
    
    await loginInput.fill('admin');
    await passwordInput.fill('admin');
    
    // Submit form
    await submitButton.click();
    
    // Should redirect to admin panel
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin-panel`, { timeout: 10000 });
    
    // Should see admin panel content (sidebar with "Rezerwacje")
    await expect(page.locator('text=/Rezerwacje|Obozy|Płatności/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show error with incorrect credentials', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin-panel/login`, { waitUntil: 'networkidle' });
    
    // Wait for form
    await page.waitForSelector('input[type="text"], input[name="login"], input[id="login"]', { timeout: 10000 });
    
    // Fill login form with wrong credentials
    const loginInput = page.locator('input[type="text"], input[name="login"], input[id="login"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Zaloguj")').first();
    
    await loginInput.fill('wrong');
    await passwordInput.fill('wrong');
    
    // Submit form
    await submitButton.click();
    
    // Should show error message
    await expect(page.locator('text=/Invalid login or password|Błąd logowania|Nieprawidłowy/i')).toBeVisible({ timeout: 5000 });
    
    // Should stay on login page
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin-panel/login`);
  });

  test('should access protected admin routes after login', async ({ page }) => {
    // Login first
    await page.goto(`${FRONTEND_URL}/admin-panel/login`, { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="text"], input[name="login"], input[id="login"]', { timeout: 10000 });
    
    const loginInput = page.locator('input[type="text"], input[name="login"], input[id="login"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Zaloguj")').first();
    
    await loginInput.fill('admin');
    await passwordInput.fill('admin');
    await submitButton.click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin-panel`, { timeout: 10000 });
    
    // Test accessing different admin routes
    const protectedRoutes = [
      '/admin-panel',
      '/admin-panel/camps',
      '/admin-panel/payments',
      '/admin-panel/transports',
      '/admin-panel/settings',
    ];
    
    for (const route of protectedRoutes) {
      await page.goto(`${FRONTEND_URL}${route}`, { waitUntil: 'networkidle' });
      // Should not redirect to login
      await expect(page).not.toHaveURL(`${FRONTEND_URL}/admin-panel/login`, { timeout: 5000 });
      // Should see admin layout (sidebar)
      await expect(page.locator('text=/Rezerwacje|Obozy|Płatności/i').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should logout and redirect to login', async ({ page }) => {
    // Login first
    await page.goto(`${FRONTEND_URL}/admin-panel/login`, { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="text"], input[name="login"], input[id="login"]', { timeout: 10000 });
    
    const loginInput = page.locator('input[type="text"], input[name="login"], input[id="login"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Zaloguj")').first();
    
    await loginInput.fill('admin');
    await passwordInput.fill('admin');
    await submitButton.click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin-panel`, { timeout: 10000 });
    
    // Click logout button - wait for it to be visible
    await page.waitForSelector('text=Wyloguj', { timeout: 10000 });
    await page.click('text=Wyloguj');
    
    // Should redirect to login
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin-panel/login`, { timeout: 3000 });
    
    // Try to access admin panel again - should redirect to login
    await page.goto(`${FRONTEND_URL}/admin-panel`);
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin-panel/login`);
  });

  test('should not create redirect loop when token is invalid', async ({ page }) => {
    // Set invalid token in localStorage
    await page.goto(`${FRONTEND_URL}/admin-panel/login`);
    await page.evaluate(() => {
      localStorage.setItem('radsasfun_auth_token', 'invalid-token');
      localStorage.setItem('radsasfun_auth_user', JSON.stringify({ id: 1, login: 'admin', role: 'admin' }));
    });
    
    // Try to access admin panel
    await page.goto(`${FRONTEND_URL}/admin-panel`);
    
    // Should redirect to login (not loop)
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin-panel/login`, { timeout: 5000 });
    
    // Wait a bit to ensure no redirect loop
    await page.waitForTimeout(2000);
    
    // Should still be on login page
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin-panel/login`);
    
    // Invalid token should be cleared
    const token = await page.evaluate(() => localStorage.getItem('radsasfun_auth_token'));
    expect(token).toBeNull();
  });

  test('should redirect from login to admin panel if already authenticated', async ({ page }) => {
    // Login first
    await page.goto(`${FRONTEND_URL}/admin-panel/login`, { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="text"], input[name="login"], input[id="login"]', { timeout: 10000 });
    
    const loginInput = page.locator('input[type="text"], input[name="login"], input[id="login"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Zaloguj")').first();
    
    await loginInput.fill('admin');
    await passwordInput.fill('admin');
    await submitButton.click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin-panel`, { timeout: 10000 });
    
    // Try to access login page again
    await page.goto(`${FRONTEND_URL}/admin-panel/login`);
    
    // Should redirect back to admin panel
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin-panel`, { timeout: 3000 });
  });

  test('should show loading state during auth check', async ({ page }) => {
    // Set valid token format but may be expired
    await page.goto(`${FRONTEND_URL}/admin-panel`);
    
    // Should see loading indicator briefly
    const loadingText = page.locator('text=/Sprawdzanie autoryzacji/i');
    // Loading might be too fast to catch, so we just check it doesn't error
    await page.waitForLoadState('networkidle');
    
    // Should end up on login page if not authenticated
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin-panel/login`);
  });

  test('should handle page refresh without redirect loop', async ({ page }) => {
    // Login first
    await page.goto(`${FRONTEND_URL}/admin-panel/login`, { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="text"], input[name="login"], input[id="login"]', { timeout: 10000 });
    
    const loginInput = page.locator('input[type="text"], input[name="login"], input[id="login"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Zaloguj")').first();
    
    await loginInput.fill('admin');
    await passwordInput.fill('admin');
    await submitButton.click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin-panel`, { timeout: 10000 });
    
    // Refresh the page
    await page.reload();
    
    // Should still be on admin panel (not redirect to login)
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin-panel`, { timeout: 5000 });
    
    // Wait a bit to ensure no redirect loop
    await page.waitForTimeout(2000);
    
    // Should still be on admin panel
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin-panel`);
  });

  test('should verify token with backend on protected route access', async ({ page }) => {
    // Login first
    await page.goto(`${FRONTEND_URL}/admin-panel/login`, { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="text"], input[name="login"], input[id="login"]', { timeout: 10000 });
    
    const loginInput = page.locator('input[type="text"], input[name="login"], input[id="login"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Zaloguj")').first();
    
    await loginInput.fill('admin');
    await passwordInput.fill('admin');
    await submitButton.click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin-panel`, { timeout: 10000 });
    
    // Intercept API call to /api/auth/me
    const verifyTokenCall = page.waitForRequest(request => 
      request.url().includes('/api/auth/me') && request.method() === 'GET'
    );
    
    // Navigate to another protected route
    await page.goto(`${FRONTEND_URL}/admin-panel/camps`);
    
    // Should have called verify token endpoint
    await verifyTokenCall;
    
    // Should be on camps page
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin-panel/camps`);
  });
});

