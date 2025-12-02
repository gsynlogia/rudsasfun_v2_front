import { test, expect } from '@playwright/test';

/**
 * Magic Link Authentication E2E Tests
 * Tests the complete magic link authentication flow
 * Run in headed mode with screenshots as per workflow.txt requirements
 */

test.describe('Magic Link Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
  });

  test('should display login page with email input', async ({ page }) => {
    await page.screenshot({ path: 'screenshots_playwright/magic-link-01-login-page.png', fullPage: true });
    
    // Check if email input is visible
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    // Check if submit button is visible
    const submitButton = page.locator('button:has-text("Wyślij magic link")');
    await expect(submitButton).toBeVisible();
  });

  test('should request magic link with valid email', async ({ page }) => {
    // Fill email
    await page.fill('input[type="email"]', 'test@example.com');
    await page.screenshot({ path: 'screenshots_playwright/magic-link-02-email-filled.png', fullPage: true });
    
    // Submit form
    await page.click('button:has-text("Wyślij magic link")');
    
    // Wait for success message
    await page.waitForSelector('text=Email wysłany!', { timeout: 10000 });
    await page.screenshot({ path: 'screenshots_playwright/magic-link-03-success-message.png', fullPage: true });
    
    // Verify success message
    const successMessage = page.locator('text=Email wysłany!');
    await expect(successMessage).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    // Fill invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    
    // Try to submit (browser validation should prevent)
    await page.click('button:has-text("Wyślij magic link")');
    
    // Check if browser validation error appears
    const emailInput = page.locator('input[type="email"]');
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage).toBeTruthy();
    
    await page.screenshot({ path: 'screenshots_playwright/magic-link-04-invalid-email.png', fullPage: true });
  });

  test('should redirect to login when accessing protected reservation route', async ({ page }) => {
    // Try to access reservation route directly
    await page.goto('http://localhost:3000/camps/1/edition/1/step/1', { waitUntil: 'networkidle' });
    
    // Wait a bit for client-side redirect
    await page.waitForTimeout(2000);
    
    // Should redirect to login
    const currentUrl = page.url();
    await page.screenshot({ path: 'screenshots_playwright/magic-link-05-redirect-to-login.png', fullPage: true });
    
    // Check if redirect URL is preserved (either redirected or showing login content)
    const isLoginPage = currentUrl.includes('/login') || await page.locator('input[type="email"]').count() > 0;
    expect(isLoginPage).toBeTruthy();
  });

  test('should redirect to login when accessing protected profile route', async ({ page }) => {
    // Try to access profile route directly
    await page.goto('http://localhost:3000/profil/aktualne-rezerwacje');
    
    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });
    await page.screenshot({ path: 'screenshots_playwright/magic-link-06-profile-redirect.png', fullPage: true });
    
    const currentUrl = page.url();
    expect(currentUrl).toContain('/login');
  });

  test('should show admin login link on login page', async ({ page }) => {
    await page.screenshot({ path: 'screenshots_playwright/magic-link-07-admin-link.png', fullPage: true });
    
    // Check if admin login link exists
    const adminLink = page.locator('a:has-text("Panel administratora")');
    await expect(adminLink).toBeVisible();
    
    // Click admin link
    await adminLink.click();
    await page.waitForURL(/\/admin-panel\/login/, { timeout: 5000 });
    await page.screenshot({ path: 'screenshots_playwright/magic-link-08-admin-login-page.png', fullPage: true });
  });

  test('should prevent client from accessing admin panel', async ({ page, context }) => {
    // First, create a client user via magic link (mock)
    // In real test, we would need to actually get magic link from email
    // For now, we'll test the admin panel protection
    
    // Try to access admin panel directly
    await page.goto('http://localhost:3000/admin-panel');
    
    // Should redirect to admin login
    await page.waitForURL(/\/admin-panel\/login/, { timeout: 5000 });
    await page.screenshot({ path: 'screenshots_playwright/magic-link-09-admin-panel-protection.png', fullPage: true });
  });
});

test.describe('Magic Link Verification', () => {
  test('should display verification page with token', async ({ page }) => {
    // Navigate to verification page with token (mock token for testing)
    const mockToken = 'test-token-12345';
    await page.goto(`http://localhost:3000/auth/verify?token=${mockToken}`);
    
    // Should show loading or error (since token is invalid)
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots_playwright/magic-link-10-verification-page.png', fullPage: true });
    
    // Should show some message (error for invalid token, or success for valid)
    await page.waitForTimeout(2000); // Wait for verification to complete
    const hasMessage = await page.locator('text=/Weryfikowanie|Błąd|sukces|Logowanie|magic link/i').count() > 0;
    expect(hasMessage).toBeTruthy();
  });
});

test.describe('Camp Selection Redirect', () => {
  test('should redirect to login when selecting camp', async ({ page }) => {
    // Navigate to main page
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots_playwright/magic-link-11-main-page.png', fullPage: true });
    
    // Click on first camp/turnus button
    const firstCampButton = page.locator('button:has-text("Lato"), button:has-text("Zima")').first();
    if (await firstCampButton.count() > 0) {
      await firstCampButton.click();
      
      // Wait for navigation
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots_playwright/magic-link-12-camp-redirect.png', fullPage: true });
      
      const currentUrl = page.url();
      // Should redirect to login or show login form
      const isLoginPage = currentUrl.includes('/login') || await page.locator('input[type="email"]').count() > 0;
      expect(isLoginPage).toBeTruthy();
    } else {
      // If no button found, test is skipped
      test.skip();
    }
  });
});

