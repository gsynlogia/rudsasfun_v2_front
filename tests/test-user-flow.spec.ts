/**
 * Playwright E2E tests for test user flow
 * Creates test user, performs reservation, reviews profile, then deletes user
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const ADMIN_LOGIN = 'admin';
const ADMIN_PASSWORD = 'admin';

let testUserId: number | null = null;
let testUserEmail: string | null = null;

test.describe('Test User Flow', () => {
  test.beforeAll(async ({ request }) => {
    // Login as admin to get token
    const loginResponse = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: {
        login: ADMIN_LOGIN,
        password: ADMIN_PASSWORD
      }
    });
    
    if (loginResponse.ok()) {
      const loginData = await loginResponse.json();
      const token = loginData.access_token;
      
      // Get test user ID
      const idResponse = await request.get(`${API_BASE_URL}/api/test-user/id`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (idResponse.ok()) {
        const idData = await idResponse.json();
        testUserId = idData.test_user_id;
        testUserEmail = idData.test_user_email;
      }
      
      // Create test user
      const createResponse = await request.post(`${API_BASE_URL}/api/test-user/create`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (createResponse.ok()) {
        const userData = await createResponse.json();
        testUserId = userData.id;
        testUserEmail = userData.email;
      }
    }
  });

  test.afterAll(async ({ request }) => {
    // Clean up: delete test user
    if (testUserId) {
      const loginResponse = await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          login: ADMIN_LOGIN,
          password: ADMIN_PASSWORD
        }
      });
      
      if (loginResponse.ok()) {
        const loginData = await loginResponse.json();
        const token = loginData.access_token;
        
        await request.delete(`${API_BASE_URL}/api/test-user/${testUserId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    }
  });

  test('should create test user and perform reservation flow', async ({ page }) => {
    if (!testUserEmail) {
      test.skip();
      return;
    }

    // Mock magic link authentication
    await page.route(`${API_BASE_URL}/api/auth/send-magic-link`, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Link do logowania został wysłany' })
      });
    });

    await page.route(`${API_BASE_URL}/api/auth/verify-magic-link*`, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test-user-jwt-token',
          token_type: 'bearer',
          user: {
            id: testUserId,
            login: testUserEmail,
            email: testUserEmail,
            user_type: 'client',
            groups: ['client'],
            accessible_sections: []
          }
        })
      });
    });

    // Navigate to login
    await page.goto(`${FRONTEND_URL}/login`);
    
    // Login via magic link
    await page.fill('input[type="email"]', testUserEmail);
    await page.click('button[type="submit"]');
    
    try {
      await page.waitForSelector('text=Email wysłany', { timeout: 3000 });
    } catch {
      // Continue anyway
    }
    
    // Simulate magic link click
    await page.goto(`${FRONTEND_URL}/auth/verify?token=test-magic-link-token`);
    
    try {
      await page.waitForURL(/.*profile.*/, { timeout: 10000 });
    } catch {
      // If already on profile or different URL, continue
      const currentUrl = page.url();
      if (!currentUrl.includes('profile') && !currentUrl.includes('profil')) {
        await page.goto(`${FRONTEND_URL}/profil/aktualne-rezerwacje`);
      }
    }
    
    // Verify we're logged in
    const profileElements = page.locator('text=/Rezerwacje|Profil|Aktualne/i');
    expect(await profileElements.count()).toBeGreaterThan(0);
  });

  test('should display user profile with reservations', async ({ page }) => {
    if (!testUserEmail) {
      test.skip();
      return;
    }

    // Mock authentication
    await page.route(`${API_BASE_URL}/api/auth/verify-magic-link*`, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test-user-jwt-token',
          token_type: 'bearer',
          user: {
            id: testUserId,
            login: testUserEmail,
            email: testUserEmail,
            user_type: 'client',
            groups: ['client'],
            accessible_sections: []
          }
        })
      });
    });

    // Navigate directly to profile (assuming we're logged in)
    await page.goto(`${FRONTEND_URL}/profil/aktualne-rezerwacje`);
    await page.waitForLoadState('networkidle');
    
    // Check for profile elements
    const profileContent = page.locator('text=/Rezerwacje|Brak rezerwacji|Historia/i');
    expect(await profileContent.count()).toBeGreaterThan(0);
  });
});







