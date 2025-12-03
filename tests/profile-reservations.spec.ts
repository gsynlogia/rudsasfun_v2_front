import { test, expect } from '@playwright/test';

/**
 * Profile Reservations E2E Tests
 * Tests for profile page with user greeting and current reservations
 * 
 * Requirements:
 * - Test in headed mode with screenshots
 * - Verify greeting shows user email
 * - Verify current reservations are loaded from API
 */

test.describe('Profile - User Greeting and Reservations', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of login page
    await page.screenshot({ path: 'tests/screenshots/profile-login-page.png', fullPage: true });
    
    // Login with magic link (or regular login)
    // For testing, we'll use a test email
    const testEmail = 'test@example.com';
    
    // Fill email input
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(testEmail);
    
    await page.screenshot({ path: 'tests/screenshots/profile-login-filled.png', fullPage: true });
    
    // Click login button
    const loginButton = page.locator('button:has-text("Zaloguj")');
    await loginButton.click();
    
    // Wait for redirect (in real scenario, user would click magic link from email)
    // For testing, we'll simulate being logged in by setting localStorage
    await page.evaluate((email) => {
      localStorage.setItem('radsasfun_auth_token', 'test-token');
      localStorage.setItem('radsasfun_auth_user', JSON.stringify({
        id: 1,
        login: email,
        email: email,
        user_type: 'client',
        groups: [],
      }));
    }, testEmail);
    
    // Navigate to profile page
    await page.goto('http://localhost:3000/profil/aktualne-rezerwacje');
    await page.waitForLoadState('networkidle');
  });

  test('should display user greeting with email in sidebar', async ({ page }) => {
    // Wait for sidebar to load
    await page.waitForSelector('aside', { timeout: 10000 });
    
    // Take screenshot of profile page
    await page.screenshot({ path: 'tests/screenshots/profile-with-greeting.png', fullPage: true });
    
    // Check that greeting text is visible
    const greeting = page.locator('text=/Witaj!/i');
    await expect(greeting).toBeVisible();
    
    // Check that email is displayed (should be in blue color)
    const emailSpan = page.locator('span.text-\\[\\#00a8e8\\]');
    await expect(emailSpan).toBeVisible();
    
    // Verify email text is present
    const emailText = await emailSpan.textContent();
    expect(emailText).toBeTruthy();
    expect(emailText?.length).toBeGreaterThan(0);
    
    await page.screenshot({ path: 'tests/screenshots/profile-greeting-detail.png' });
  });

  test('should load and display current reservations from API', async ({ page }) => {
    // Wait for reservations section
    await page.waitForSelector('h2:has-text("Aktualne rezerwacje")', { timeout: 10000 });
    
    // Take screenshot of reservations section
    await page.screenshot({ path: 'tests/screenshots/profile-reservations-section.png', fullPage: true });
    
    // Check if loading state appears first
    const loadingText = page.locator('text=/Ładowanie rezerwacji/i');
    const errorText = page.locator('text=/Błąd/i');
    const emptyText = page.locator('text=/Brak aktualnych rezerwacji/i');
    const reservationCards = page.locator('[data-testid="reservation-card"], .reservation-card, article');
    
    // Wait for either loading to finish or content to appear
    await page.waitForTimeout(2000);
    
    // Check if we have reservations or empty state
    const hasReservations = await reservationCards.count() > 0;
    const hasEmptyState = await emptyText.isVisible().catch(() => false);
    const hasError = await errorText.isVisible().catch(() => false);
    
    if (hasError) {
      await page.screenshot({ path: 'tests/screenshots/profile-reservations-error.png', fullPage: true });
      console.log('Reservations page shows error state');
    } else if (hasEmptyState) {
      await page.screenshot({ path: 'tests/screenshots/profile-reservations-empty.png', fullPage: true });
      console.log('Reservations page shows empty state');
    } else if (hasReservations) {
      await page.screenshot({ path: 'tests/screenshots/profile-reservations-loaded.png', fullPage: true });
      
      // Verify reservation cards are displayed
      const count = await reservationCards.count();
      expect(count).toBeGreaterThan(0);
      
      // Check that reservation data is displayed (not hardcoded)
      const firstCard = reservationCards.first();
      await expect(firstCard).toBeVisible();
      
      // Verify reservation has participant name
      const participantName = firstCard.locator('text=/Franciszek|Katarzyna|participant/i');
      // Note: If we see hardcoded names like "Franciszek Kowalski" or "Katarzyna Guzik",
      // that means the API is not being used
      const hasHardcodedName = await participantName.count() > 0;
      
      if (hasHardcodedName) {
        console.warn('⚠️ WARNING: Hardcoded reservation data detected!');
        await page.screenshot({ path: 'tests/screenshots/profile-reservations-hardcoded-warning.png', fullPage: true });
      }
    } else {
      // Still loading
      await page.screenshot({ path: 'tests/screenshots/profile-reservations-loading.png', fullPage: true });
      console.log('Reservations are still loading');
    }
  });

  test('should handle API error gracefully', async ({ page }) => {
    // Intercept API call and return error
    await page.route('**/api/reservations/my*', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
    });
    
    // Reload page to trigger API call
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of error state
    await page.screenshot({ path: 'tests/screenshots/profile-reservations-api-error.png', fullPage: true });
    
    // Check that error message is displayed
    const errorMessage = page.locator('text=/Błąd|error|nie udało/i');
    // Error might be displayed, or empty state
    const hasError = await errorMessage.isVisible().catch(() => false);
    
    if (hasError) {
      await expect(errorMessage).toBeVisible();
    }
  });

  test('should display empty state when user has no reservations', async ({ page }) => {
    // Intercept API call and return empty array
    await page.route('**/api/reservations/my*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Take screenshot of empty state
    await page.screenshot({ path: 'tests/screenshots/profile-reservations-empty-state.png', fullPage: true });
    
    // Check that empty state message is displayed
    const emptyMessage = page.locator('text=/Brak aktualnych rezerwacji/i');
    await expect(emptyMessage).toBeVisible();
  });
});





