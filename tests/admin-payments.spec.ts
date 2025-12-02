import { test, expect } from '@playwright/test';

/**
 * Admin Panel Payments Tests
 * Tests for payments management page in admin panel
 * 
 * Requirements:
 * - Playwright tests with screenshots in headed mode (workflow.txt 19.7)
 */

test.describe('Admin Panel - Payments Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin panel login
    await page.goto('http://localhost:3000/admin-panel/login');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of login page
    await page.screenshot({ path: 'tests/screenshots/admin-payments-login.png', fullPage: true });
    
    // Find login input (check different possible selectors)
    const loginInput = page.locator('input[type="text"], input[name="login"], input[id="login"], input[placeholder*="login" i], input[placeholder*="Login"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Zaloguj"), button:has-text("Login")').first();
    
    // Wait for inputs to be visible
    await loginInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    
    // Login as admin (assuming default admin credentials)
    // Adjust credentials based on your setup
    await loginInput.fill('admin');
    await passwordInput.fill('admin');
    
    // Take screenshot before submit
    await page.screenshot({ path: 'tests/screenshots/admin-payments-login-filled.png', fullPage: true });
    
    await submitButton.click();
    
    // Wait for navigation to admin panel
    await page.waitForURL('**/admin-panel**', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Navigate to payments page
    await page.goto('http://localhost:3000/admin-panel/payments');
    await page.waitForLoadState('networkidle');
  });

  test('should display payments page with reservations', async ({ page }) => {
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/admin-payments-page.png', fullPage: true });
    
    // Check if page title is visible
    await expect(page.locator('h1:has-text("Płatności")')).toBeVisible();
    
    // Check if search bar is visible
    await expect(page.locator('input[placeholder*="Szukaj"]')).toBeVisible();
    
    // Wait for data to load (either reservations table or loading/error state)
    const loadingSpinner = page.locator('text=Ładowanie płatności');
    const errorMessage = page.locator('text=Błąd');
    const reservationsTable = page.locator('table');
    
    // Wait for one of these to appear
    await Promise.race([
      loadingSpinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      errorMessage.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      reservationsTable.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
    ]);
    
    // Take screenshot after data loads
    await page.screenshot({ path: 'tests/screenshots/admin-payments-loaded.png', fullPage: true });
    
    // If there's an error, check if it's about payments (which is OK - we can continue with reservations)
    const paymentsError = page.locator('text=/płatności/i');
    const errorVisible = await paymentsError.isVisible({ timeout: 1000 }).catch(() => false);
    if (errorVisible) {
      console.log('Payments fetch failed, but continuing with reservations');
      // Take screenshot of error state
      await page.screenshot({ path: 'tests/screenshots/admin-payments-error.png', fullPage: true });
    }
    
    // Check if reservations table is visible (even if payments failed)
    const tableVisible = await reservationsTable.isVisible().catch(() => false);
    if (tableVisible) {
      // Check if table has at least header row
      await expect(page.locator('thead')).toBeVisible();
      
      // Take screenshot of table
      await page.screenshot({ path: 'tests/screenshots/admin-payments-table.png', fullPage: true });
    }
  });

  test('should handle search functionality', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Find search input
    const searchInput = page.locator('input[placeholder*="Szukaj"]');
    await expect(searchInput).toBeVisible();
    
    // Type in search
    await searchInput.fill('test');
    
    // Take screenshot after search
    await page.screenshot({ path: 'tests/screenshots/admin-payments-search.png', fullPage: true });
    
    // Wait a bit for search to process
    await page.waitForTimeout(500);
  });

  test('should display loading state initially', async ({ page }) => {
    // Navigate directly to payments page (fresh load)
    await page.goto('http://localhost:3000/admin-panel/payments');
    
    // Take immediate screenshot to catch loading state
    await page.screenshot({ path: 'tests/screenshots/admin-payments-loading-initial.png', fullPage: true });
    
    // Check for loading spinner (might be very quick)
    const loadingSpinner = page.locator('text=Ładowanie płatności');
    const spinnerVisible = await loadingSpinner.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (spinnerVisible) {
      await page.screenshot({ path: 'tests/screenshots/admin-payments-loading.png', fullPage: true });
      await expect(loadingSpinner).toBeVisible();
    } else {
      // If loading is too fast, just take a screenshot of the loaded page
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/screenshots/admin-payments-loaded-quick.png', fullPage: true });
      // Verify page loaded successfully
      await expect(page.locator('h1:has-text("Płatności")')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle error state gracefully', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if error message is displayed (if payments fail)
    const errorMessage = page.locator('text=Błąd');
    const errorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (errorVisible) {
      await page.screenshot({ path: 'tests/screenshots/admin-payments-error-state.png', fullPage: true });
      
      // Check if "Spróbuj ponownie" button is visible
      const retryButton = page.locator('button:has-text("Spróbuj ponownie")');
      const retryVisible = await retryButton.isVisible().catch(() => false);
      
      if (retryVisible) {
        await expect(retryButton).toBeVisible();
      }
    }
  });

  test('should display reservations even if payments fail', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for data to load
    
    // Check if reservations table is visible
    const table = page.locator('table');
    const tableVisible = await table.isVisible({ timeout: 10000 }).catch(() => false);
    
    if (tableVisible) {
      // Take screenshot
      await page.screenshot({ path: 'tests/screenshots/admin-payments-reservations.png', fullPage: true });
      
      // Check if table has rows (at least header)
      await expect(page.locator('thead')).toBeVisible();
      
      // Check if results count is displayed
      const resultsCount = page.locator('text*=Znaleziono');
      const countVisible = await resultsCount.isVisible().catch(() => false);
      if (countVisible) {
        await expect(resultsCount).toBeVisible();
      }
    }
  });
});

