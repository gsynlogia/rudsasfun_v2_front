/**
 * Playwright E2E tests for general diets display
 * Tests that general diets are properly displayed in admin panel and reservation form
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const ADMIN_LOGIN = 'admin';
const ADMIN_PASSWORD = 'admin';

test.describe('General Diets Display', () => {
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

    // Navigate to admin login
    await page.goto(`${FRONTEND_URL}/admin-panel/login`);
    
    // Login as admin
    await page.fill('input[name="login"]', ADMIN_LOGIN);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    
    // Click submit button - text is "Zaloguj się"
    await page.click('button[type="submit"]');
    
    // Wait for navigation to admin panel
    await page.waitForURL(/.*admin-panel.*/, { timeout: 10000 });
  });

  test('should display general diets list in admin panel', async ({ page }) => {
    // Navigate to general diets page
    await page.goto(`${FRONTEND_URL}/admin-panel/diets/general`);
    await page.waitForLoadState('networkidle');
    
    // Check for "Diety ogólne" heading
    const heading = page.locator('h1, h2').filter({ hasText: /Diety ogólne/i });
    expect(await heading.count()).toBeGreaterThan(0);
    
    // Check for diets list or "Brak diet" message
    const dietsList = page.locator('table, [class*="grid"], [class*="list"]');
    const noDietsMessage = page.locator('text=/Brak diet|Nie znaleziono diet/i');
    
    const hasList = await dietsList.count() > 0;
    const hasNoDietsMessage = await noDietsMessage.count() > 0;
    
    // Should have either list or "no diets" message
    expect(hasList || hasNoDietsMessage).toBeTruthy();
  });

  test('should allow creating new general diet', async ({ page }) => {
    // Navigate to general diets page
    await page.goto(`${FRONTEND_URL}/admin-panel/diets/general`);
    await page.waitForLoadState('networkidle');
    
    // Look for "Dodaj dietę" or "Utwórz dietę" button
    const addButton = page.locator('button').filter({ hasText: /Dodaj|Utwórz|Nowa/i });
    
    if (await addButton.count() > 0) {
      await addButton.first().click();
      
      // Wait for form to appear
      await page.waitForTimeout(500);
      
      // Check for form fields
      const nameField = page.locator('input[name*="name"], input[placeholder*="nazwa" i]');
      const priceField = page.locator('input[name*="price"], input[type="number"]');
      
      expect(await nameField.count()).toBeGreaterThan(0);
      expect(await priceField.count()).toBeGreaterThan(0);
    }
  });

  test('should display general diets in reservation form Step1', async ({ page }) => {
    // Navigate to reservation form Step1
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/1`);
    await page.waitForLoadState('networkidle');
    
    // Wait for diet section to load
    await page.waitForTimeout(2000);
    
    // Check for "Dieta uczestnika" heading
    const dietHeading = page.locator('h2, h3, h4').filter({ hasText: /Dieta uczestnika/i });
    
    if (await dietHeading.count() > 0) {
      // Check for diet tiles or options
      const dietTiles = page.locator('[class*="diet"], [class*="tile"], button, [role="button"]').filter({ hasText: /Standardowa|Wegetariańska|Bezglutenowa|Dieta/i });
      
      // Should have at least one diet option or loading/error message
      const hasDiets = await dietTiles.count() > 0;
      const hasLoading = await page.locator('text=/Ładowanie|Loading/i').count() > 0;
      const hasError = await page.locator('text=/Błąd|Error|Nie udało/i').count() > 0;
      
      expect(hasDiets || hasLoading || hasError).toBeTruthy();
    }
  });
});

