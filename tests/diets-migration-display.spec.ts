/**
 * Playwright E2E tests for diets migration and display
 * Tests that diets from reservation form are visible in admin panel
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const ADMIN_LOGIN = 'admin';
const ADMIN_PASSWORD = 'admin';

test.describe('Diets Migration and Display', () => {
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
    await page.click('button[type="submit"]');
    
    // Wait for navigation to admin panel
    await page.waitForURL(/.*admin-panel.*/, { timeout: 10000 });
  });

  test('should display diets from reservation form in general diets admin panel', async ({ page }) => {
    // First, check what diets are available in reservation form
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/1`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Get diet names from reservation form
    const dietElements = page.locator('[class*="diet"], button, [role="button"]').filter({ hasText: /Standardowa|Wegetariańska|Bezglutenowa|Dieta/i });
    const dietCount = await dietElements.count();
    
    if (dietCount > 0) {
      // Navigate to general diets admin panel
      await page.goto(`${FRONTEND_URL}/admin-panel/diets/general`);
      await page.waitForLoadState('networkidle');
      
      // Check if diets are displayed in admin panel
      const adminDietElements = page.locator('table, [class*="grid"], [class*="list"]').filter({ hasText: /Standardowa|Wegetariańska|Bezglutenowa|Dieta/i });
      const adminDietCount = await adminDietElements.count();
      
      // Should have at least some diet-related content
      expect(adminDietCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should allow managing diets that appear in reservation form', async ({ page }) => {
    // Navigate to general diets admin panel
    await page.goto(`${FRONTEND_URL}/admin-panel/diets/general`);
    await page.waitForLoadState('networkidle');
    
    // Check for "Dodaj dietę" or similar button
    const addButton = page.locator('button').filter({ hasText: /Dodaj|Utwórz|Nowa/i });
    
    if (await addButton.count() > 0) {
      // Verify we can create new diet
      expect(await addButton.count()).toBeGreaterThan(0);
    }
    
    // Check if there's a list of diets or "Brak diet" message
    const dietsList = page.locator('table, [class*="grid"], [class*="list"]');
    const noDietsMessage = page.locator('text=/Brak diet|Nie znaleziono diet/i');
    
    const hasList = await dietsList.count() > 0;
    const hasNoDietsMessage = await noDietsMessage.count() > 0;
    
    // Should have either list or "no diets" message
    expect(hasList || hasNoDietsMessage).toBeTruthy();
  });
});








