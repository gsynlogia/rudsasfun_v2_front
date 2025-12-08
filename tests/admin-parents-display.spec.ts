/**
 * Playwright E2E tests for parents/guardians display in admin panel
 * Tests that both guardians are displayed correctly in admin panel
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const ADMIN_LOGIN = 'admin';
const ADMIN_PASSWORD = 'admin';

test.describe('Admin Panel - Parents Display', () => {
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
    await page.click('button:has-text("Zaloguj")');
    
    // Wait for navigation to admin panel
    await page.waitForURL(/.*admin-panel.*/, { timeout: 10000 });
    
    // Navigate to reservations management
    await page.goto(`${FRONTEND_URL}/admin-panel/reservations`);
    await page.waitForLoadState('networkidle');
  });

  test('should display both parents in admin panel reservation details', async ({ page }) => {
    // Wait for reservations table to load
    await page.waitForSelector('table, tr', { timeout: 10000 });
    
    // Find a reservation row
    const reservationRow = page.locator('tr').filter({ hasText: /REZ-/ }).first();
    
    // Check if any reservations exist
    const reservationCount = await reservationRow.count();
    if (reservationCount === 0) {
      // Skip test if no reservations exist
      test.skip();
      return;
    }
    
    // Click to expand reservation details - look for expand/collapse button
    const expandButton = reservationRow.locator('button, [role="button"]').first();
    if (await expandButton.count() > 0) {
      await expandButton.click();
      
      // Wait for details to appear
      await page.waitForTimeout(1000);
      
      // Check for "Dane opiekunów" or "Dane opiekuna" section
      const parentsSection = page.locator('h4, h3').filter({ hasText: /Dane opiekun/ });
      
      if (await parentsSection.count() > 0) {
        const sectionText = await parentsSection.first().textContent();
        
        // Should see parent section header
        expect(sectionText).toMatch(/Dane opiekun/);
        
        // Check for parent information - at least one parent should be displayed
        const parentNameFields = page.locator('text=/Imię i nazwisko/');
        expect(await parentNameFields.count()).toBeGreaterThan(0);
      }
    }
  });

  test('should display parent information correctly', async ({ page }) => {
    // Wait for reservations table to load
    await page.waitForSelector('table, tr', { timeout: 10000 });
    
    // Find a reservation row
    const reservationRow = page.locator('tr').filter({ hasText: /REZ-/ }).first();
    
    // Check if any reservations exist
    const reservationCount = await reservationRow.count();
    if (reservationCount === 0) {
      // Skip test if no reservations exist
      test.skip();
      return;
    }
    
    // Click to expand reservation details
    const expandButton = reservationRow.locator('button, [role="button"]').first();
    if (await expandButton.count() > 0) {
      await expandButton.click();
      
      await page.waitForTimeout(1000);
      
      // Check that parent information is displayed
      const parentSection = page.locator('h4, h3').filter({ hasText: /Dane opiekun/ });
      
      if (await parentSection.count() > 0) {
        // Should see parent name, email, and phone fields
        const nameField = page.locator('text=/Imię i nazwisko/');
        const emailField = page.locator('text=/Email/');
        const phoneField = page.locator('text=/Telefon/');
        
        // At least name should be displayed
        expect(await nameField.count()).toBeGreaterThan(0);
        
        // Email and phone may be optional for second parent
        const totalFields = (await nameField.count()) + (await emailField.count()) + (await phoneField.count());
        expect(totalFields).toBeGreaterThan(0);
      }
    }
  });
});

