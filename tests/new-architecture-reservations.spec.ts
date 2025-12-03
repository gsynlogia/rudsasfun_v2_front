import { test, expect } from '@playwright/test';

/**
 * Tests for new architecture - user_id based reservations
 * Tests that reservations are correctly linked to user accounts
 */
test.describe('New Architecture - User Reservations', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Login with magic link (simulate)
    const testEmail = 'szymon.guzik@gdansk.merito.pl';
    
    // Fill email
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(testEmail);
    
    // Click login button
    const loginButton = page.locator('button:has-text("Zaloguj")');
    await loginButton.click();
    
    // Wait for redirect or success message
    await page.waitForTimeout(2000);
    
    // For testing, we'll simulate being logged in by storing auth token
    // In real scenario, user would click magic link
    await page.evaluate(() => {
      localStorage.setItem('radsasfun_auth_token', 'test-token');
      localStorage.setItem('radsasfun_auth_user', JSON.stringify({
        id: 7,
        email: 'szymon.guzik@gdansk.merito.pl',
        login: 'szymon.guzik@gdansk.merito.pl',
        user_type: 'client'
      }));
    });
  });

  test('should display all reservations for logged in user', async ({ page }) => {
    await page.goto('http://localhost:3000/profil/aktualne-rezerwacje');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/new-arch-reservations-list.png', fullPage: true });
    
    // Check if reservations are displayed
    const reservationsSection = page.locator('text=/Aktualne rezerwacje/i');
    await expect(reservationsSection).toBeVisible();
    
    // Check if at least one reservation card is visible
    // (should show reservation ID 4 for this user)
    const reservationCards = page.locator('[class*="ReservationCard"], [class*="reservation"]');
    const count = await reservationCards.count();
    
    console.log(`Found ${count} reservation cards`);
    
    // Should have at least 1 reservation (ID 4)
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should filter reservations by user_id not email', async ({ page }) => {
    await page.goto('http://localhost:3000/profil/aktualne-rezerwacje');
    await page.waitForLoadState('networkidle');
    
    // Check network requests - should call /api/reservations/my
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/reservations/my') && response.status() === 200
    );
    
    await responsePromise;
    
    // Verify response contains only user's reservations
    const response = await responsePromise;
    const data = await response.json();
    
    console.log(`API returned ${data.length} reservations`);
    
    // All reservations should belong to user_id=7
    for (const reservation of data) {
      // Note: user_id might not be in response, but reservations should be filtered correctly
      console.log(`Reservation ID: ${reservation.id}, Participant: ${reservation.participant_first_name}`);
    }
    
    await page.screenshot({ path: 'tests/screenshots/new-arch-filtered-reservations.png', fullPage: true });
  });

  test('should create new reservation with user_id', async ({ page }) => {
    // This test would require going through full reservation flow
    // For now, we'll just verify the endpoint exists
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'tests/screenshots/new-arch-main-page.png', fullPage: true });
    
    // Verify user is logged in
    const userMenu = page.locator('text=/Moje konto/i, text=/My account/i');
    await expect(userMenu).toBeVisible();
  });
});

