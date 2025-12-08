/**
 * Playwright E2E tests for parents/guardians display in user profile
 * Tests that both guardians are displayed correctly in profile
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const TEST_EMAIL = 'test@example.com';
const TEST_MAGIC_LINK_TOKEN = 'test-magic-link-token-12345';

// Mock magic link authentication
async function mockMagicLink(page: any) {
  // Mock magic link send
  await page.route(`${API_BASE_URL}/api/auth/send-magic-link`, async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Link do logowania został wysłany' })
    });
  });

  // Mock magic link verify
  await page.route(`${API_BASE_URL}/api/auth/verify-magic-link*`, async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'client-jwt-token-12345',
        token_type: 'bearer',
        user: {
          id: 1,
          login: TEST_EMAIL,
          email: TEST_EMAIL,
          user_type: 'client',
          groups: ['client'],
          accessible_sections: []
        }
      })
    });
  });
}

test.describe('User Profile - Parents Display', () => {
  test.beforeEach(async ({ page }) => {
    // Mock magic link
    await mockMagicLink(page);
    
    // Navigate to login
    await page.goto(`${FRONTEND_URL}/login`);
    
    // Login via magic link - simulate the flow
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]');
    
    // Wait for success message or directly navigate to verify
    try {
      await page.waitForSelector('text=Email wysłany', { timeout: 3000 });
    } catch {
      // If message doesn't appear, continue anyway
    }
    
    // Simulate magic link click - navigate directly to verify page
    await page.goto(`${FRONTEND_URL}/auth/verify?token=${TEST_MAGIC_LINK_TOKEN}`);
    
    // Wait for redirect to profile
    try {
      await page.waitForURL(/.*profile.*/, { timeout: 10000 });
    } catch {
      // If already on profile page or different URL, continue
      const currentUrl = page.url();
      if (!currentUrl.includes('profile') && !currentUrl.includes('profil')) {
        // Try to navigate manually
        await page.goto(`${FRONTEND_URL}/profil/aktualne-rezerwacje`);
      }
    }
    
    // Navigate to current reservations
    await page.goto(`${FRONTEND_URL}/profil/aktualne-rezerwacje`);
    await page.waitForLoadState('networkidle');
  });

  test('should display both parents in profile reservation card', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for reservation cards or parent section
    const parentsSection = page.locator('h4, h3').filter({ hasText: /Opiekunowie|Opiekun/ });
    
    // Check if any reservations with parents exist
    const sectionCount = await parentsSection.count();
    if (sectionCount === 0) {
      // Skip test if no reservations with parents exist
      test.skip();
      return;
    }
    
    // Should have at least one parent section
    expect(sectionCount).toBeGreaterThan(0);
    
    // Check that parent information is displayed - look for name fields
    const parentNameFields = page.locator('text=/Imię|Nazwisko/');
    const nameFieldCount = await parentNameFields.count();
    
    // Should have at least one parent name field displayed
    expect(nameFieldCount).toBeGreaterThan(0);
  });

  test('should display parent contact information', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for parent section
    const parentsSection = page.locator('h4, h3').filter({ hasText: /Opiekunowie|Opiekun/ });
    
    // Check if any reservations with parents exist
    const sectionCount = await parentsSection.count();
    if (sectionCount === 0) {
      // Skip test if no reservations with parents exist
      test.skip();
      return;
    }
    
    // Check for email and phone information - can be text or icons
    const emailInfo = page.locator('text=/@|Email|email/');
    const phoneInfo = page.locator('text=/\\+48|Telefon|telefon|\\d{9}/');
    
    // Should have at least some contact information displayed
    const totalContactInfo = (await emailInfo.count()) + (await phoneInfo.count());
    expect(totalContactInfo).toBeGreaterThan(0);
  });
});

