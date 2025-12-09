/**
 * Full Reservation Flow Tests
 * Tests complete reservation process with all steps, validations, payments, and invoices
 */
import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

// Mock data for testing
const TEST_EMAIL = 'test@example.com';
const TEST_MAGIC_LINK_TOKEN = 'test-magic-link-token-12345';

// Helper function to mock magic link
async function mockMagicLink(page: any) {
  // Intercept magic link request
  await page.route(`${API_BASE_URL}/api/auth/magic-link/request`, async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Link do logowania został wysłany na podany adres email',
        success: true
      })
    });
  });

  // Intercept magic link verification
  await page.route(`${API_BASE_URL}/api/auth/magic-link/verify*`, async (route: any) => {
    const url = new URL(route.request().url());
    const token = url.searchParams.get('token');
    
    if (token === TEST_MAGIC_LINK_TOKEN) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-jwt-token-12345',
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
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid or expired magic link' })
      });
    }
  });
}

test.describe('Full Reservation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock magic link
    await mockMagicLink(page);
    
    // Navigate to login
    await page.goto(`${FRONTEND_URL}/login`);
  });

  test('Complete reservation flow - full payment with invoice (individual)', async ({ page }) => {
    // Step 1: Login
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.click('button:has-text("Wyślij link")');
    await page.waitForSelector('text=Link do logowania został wysłany', { timeout: 5000 });
    
    // Simulate magic link click
    await page.goto(`${FRONTEND_URL}/auth/verify?token=${TEST_MAGIC_LINK_TOKEN}`);
    await page.waitForURL(/.*profile.*/, { timeout: 10000 });

    // Navigate to camp selection (assuming camp ID 1, edition ID 1)
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/1`);

    // Step 1: Fill parent/guardian data
    // First guardian (all fields required)
    await page.fill('input[name="parent-firstName-1"]', 'Jan');
    await page.fill('input[name="parent-lastName-1"]', 'Kowalski');
    await page.fill('input[name="parent-email-1"]', 'jan.kowalski@example.com');
    await page.fill('input[name="parent-phoneNumber-1"]', '123456789');
    await page.fill('input[name="parent-street-1"]', 'ul. Testowa 1');
    await page.fill('input[name="parent-postalCode-1"]', '00-000');
    await page.fill('input[name="parent-city-1"]', 'Warszawa');

    // Participant data
    await page.fill('input[name="participant-firstName"]', 'Anna');
    await page.fill('input[name="participant-lastName"]', 'Kowalska');
    await page.selectOption('select[name="participant-age"]', '2010'); // Birth year
    await page.selectOption('select[name="participant-gender"]', 'Dziewczynka');
    await page.fill('input[name="participant-city"]', 'Warszawa');

    // Select diet
    await page.selectOption('select[name="selectedDietId"]', { index: 1 });

    // Proceed to Step 2
    await page.click('button:has-text("Przejdź dalej")');
    await page.waitForURL(/.*step\/2/, { timeout: 10000 });

    // Step 2: Transport
    await page.selectOption('select[name="departureType"]', 'zbiorowy');
    await page.waitForSelector('select[name="departureCity"]', { timeout: 5000 });
    await page.selectOption('select[name="departureCity"]', { index: 1 });
    
    await page.selectOption('select[name="returnType"]', 'zbiorowy');
    await page.waitForSelector('select[name="returnCity"]', { timeout: 5000 });
    await page.selectOption('select[name="returnCity"]', { index: 1 });

    // Source
    await page.selectOption('select[name="selectedSource"]', { index: 1 });

    // Proceed to Step 3
    await page.click('button:has-text("Przejdź dalej")');
    await page.waitForURL(/.*step\/3/, { timeout: 10000 });

    // Step 3: Addons
    // Select some addons if available
    const addonCheckboxes = await page.locator('input[type="checkbox"][name^="addon-"]').all();
    if (addonCheckboxes.length > 0) {
      await addonCheckboxes[0].check();
    }

    // Proceed to Step 4
    await page.click('button:has-text("Przejdź dalej")');
    await page.waitForURL(/.*step\/4/, { timeout: 10000 });

    // Step 4: Invoice (individual)
    await page.selectOption('select[name="invoiceType"]', 'individual');
    await page.fill('input[name="invoice-firstName"]', 'Jan');
    await page.fill('input[name="invoice-lastName"]', 'Kowalski');
    await page.fill('input[name="invoice-email"]', 'jan.kowalski@example.com');
    await page.fill('input[name="invoice-phone"]', '+48');
    await page.fill('input[name="invoice-phoneNumber"]', '123456789');
    await page.fill('input[name="invoice-street"]', 'ul. Testowa 1');
    await page.fill('input[name="invoice-postalCode"]', '00-000');
    await page.fill('input[name="invoice-city"]', 'Warszawa');

    // Proceed to Step 5
    await page.click('button:has-text("Przejdź dalej")');
    await page.waitForURL(/.*step\/5/, { timeout: 10000 });

    // Step 5: Payment and consents
    // Check all consents
    await page.check('input[name="consent1"]');
    await page.check('input[name="consent2"]');
    await page.check('input[name="consent3"]');
    await page.check('input[name="consent4"]');

    // Select full payment
    await page.selectOption('select[name="paymentType"]', 'full');

    // Submit reservation
    await page.click('button:has-text("Złóż rezerwację")');
    
    // Wait for success message or redirect
    await page.waitForTimeout(3000);
    
    // Verify reservation was created (check for success message or redirect to profile)
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/profile|success|reservation/);
  });

  test('Reservation flow - partial payment', async ({ page }) => {
    // Login (same as above)
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.click('button:has-text("Wyślij link")');
    await page.goto(`${FRONTEND_URL}/auth/verify?token=${TEST_MAGIC_LINK_TOKEN}`);
    await page.waitForURL(/.*profile.*/, { timeout: 10000 });

    // Navigate to reservation
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/1`);

    // Fill minimal required data
    await page.fill('input[name="parent-firstName-1"]', 'Jan');
    await page.fill('input[name="parent-lastName-1"]', 'Kowalski');
    await page.fill('input[name="parent-email-1"]', 'jan.kowalski@example.com');
    await page.fill('input[name="parent-phoneNumber-1"]', '123456789');
    await page.fill('input[name="parent-street-1"]', 'ul. Testowa 1');
    await page.fill('input[name="parent-postalCode-1"]', '00-000');
    await page.fill('input[name="parent-city-1"]', 'Warszawa');
    await page.fill('input[name="participant-firstName"]', 'Anna');
    await page.fill('input[name="participant-lastName"]', 'Kowalska');
    await page.selectOption('select[name="participant-age"]', '2010');
    await page.selectOption('select[name="participant-gender"]', 'Dziewczynka');
    await page.fill('input[name="participant-city"]', 'Warszawa');

    // Navigate through steps quickly
    await page.click('button:has-text("Przejdź dalej")');
    await page.waitForURL(/.*step\/2/, { timeout: 10000 });
    
    await page.selectOption('select[name="departureType"]', 'wlasny');
    await page.selectOption('select[name="returnType"]', 'wlasny');
    await page.selectOption('select[name="selectedSource"]', { index: 1 });
    
    await page.click('button:has-text("Przejdź dalej")');
    await page.waitForURL(/.*step\/3/, { timeout: 10000 });
    
    await page.click('button:has-text("Przejdź dalej")');
    await page.waitForURL(/.*step\/4/, { timeout: 10000 });
    
    await page.selectOption('select[name="invoiceType"]', 'none');
    
    await page.click('button:has-text("Przejdź dalej")');
    await page.waitForURL(/.*step\/5/, { timeout: 10000 });

    // Select partial payment
    await page.selectOption('select[name="paymentType"]', 'partial');
    await page.fill('input[name="partialPaymentAmount"]', '500');

    // Check consents
    await page.check('input[name="consent1"]');
    await page.check('input[name="consent2"]');
    await page.check('input[name="consent3"]');
    await page.check('input[name="consent4"]');

    // Submit
    await page.click('button:has-text("Złóż rezerwację")');
    await page.waitForTimeout(3000);
  });

  test('Validation - Step 1 required fields', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/1`);

    // Try to proceed without filling required fields
    await page.click('button:has-text("Przejdź dalej")');

    // Check for validation errors
    await expect(page.locator('text=Pole obowiązkowe').first()).toBeVisible();
  });

  test('Validation - Step 1 second guardian optional fields', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/1`);

    // Fill first guardian
    await page.fill('input[name="parent-firstName-1"]', 'Jan');
    await page.fill('input[name="parent-lastName-1"]', 'Kowalski');
    await page.fill('input[name="parent-email-1"]', 'jan.kowalski@example.com');
    await page.fill('input[name="parent-phoneNumber-1"]', '123456789');
    await page.fill('input[name="parent-street-1"]', 'ul. Testowa 1');
    await page.fill('input[name="parent-postalCode-1"]', '00-000');
    await page.fill('input[name="parent-city-1"]', 'Warszawa');

    // Add second guardian
    await page.click('button:has-text("Dodaj opiekuna")');
    
    // Fill only required fields for second guardian
    await page.fill('input[name="parent-firstName-2"]', 'Anna');
    await page.fill('input[name="parent-lastName-2"]', 'Kowalska');
    await page.fill('input[name="parent-phoneNumber-2"]', '987654321');
    // Leave email, street, postalCode, city empty (should be optional)

    // Fill participant
    await page.fill('input[name="participant-firstName"]', 'Anna');
    await page.fill('input[name="participant-lastName"]', 'Kowalska');
    await page.selectOption('select[name="participant-age"]', '2010');
    await page.selectOption('select[name="participant-gender"]', 'Dziewczynka');
    await page.fill('input[name="participant-city"]', 'Warszawa');

    // Should be able to proceed
    await page.click('button:has-text("Przejdź dalej")');
    await page.waitForURL(/.*step\/2/, { timeout: 10000 });
  });

  test('Validation - Step 2 transport required', async ({ page }) => {
    // Navigate to Step 2 (assuming we can skip Step 1 validation for this test)
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/2`);

    // Try to proceed without selecting transport
    await page.click('button:has-text("Przejdź dalej")');

    // Check for validation errors
    await expect(page.locator('text=Pole obowiązkowe').first()).toBeVisible();
  });

  test('Validation - Step 5 consents required', async ({ page }) => {
    // Navigate to Step 5
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/5`);

    // Try to submit without consents
    await page.click('button:has-text("Złóż rezerwację")');

    // Check for validation errors
    await expect(page.locator('text=Pole obowiązkowe').first()).toBeVisible();
  });
});







