import { test, expect } from '@playwright/test';

/**
 * Test: Transports Management Page
 * Tests the transports management functionality
 */
test.describe('Transports Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to transports page
    await page.goto('http://localhost:3000/admin-panel/transports');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await expect(page.locator('h1', { hasText: 'Transport' })).toBeVisible({ timeout: 15000 });
  });

  test('should display transports page with header and add button', async ({ page }) => {
    // Verify header
    await expect(page.locator('h1', { hasText: 'Transport' })).toBeVisible();
    
    // Verify add button
    const addButton = page.locator('button:has-text("Dodaj transport")');
    await expect(addButton).toBeVisible();
    
    console.log('[TEST] ✅ Transports page displayed correctly');
  });

  test('should display search input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Szukaj po nazwie obozu"]');
    await expect(searchInput).toBeVisible();
    
    console.log('[TEST] ✅ Search input displayed');
  });

  test('should open create transport modal when clicking add button', async ({ page }) => {
    const addButton = page.locator('button:has-text("Dodaj transport")');
    await addButton.click();
    
    // Wait for modal
    await page.waitForSelector('h3:has-text("Dodaj nowy transport")', { timeout: 5000 });
    await expect(page.locator('h3:has-text("Dodaj nowy transport")')).toBeVisible();
    
    console.log('[TEST] ✅ Create transport modal opened');
  });

  test('should display transport name input in create modal', async ({ page }) => {
    // Open modal
    const addButton = page.locator('button:has-text("Dodaj transport")');
    await addButton.click();
    await page.waitForSelector('h3:has-text("Dodaj nowy transport")', { timeout: 5000 });
    
    // Verify transport name input (optional)
    const nameInput = page.locator('input#transport-name');
    await expect(nameInput).toBeVisible();
    
    // Verify transport form is visible (departure and return sections)
    await expect(page.locator('text=Wyjazd do obozu')).toBeVisible();
    await expect(page.locator('text=Powrót z obozu')).toBeVisible();
    
    console.log('[TEST] ✅ Transport name input and form displayed');
  });

  test('should display transport form with departure and return sections', async ({ page }) => {
    // Open modal
    const addButton = page.locator('button:has-text("Dodaj transport")');
    await addButton.click();
    await page.waitForSelector('h3:has-text("Dodaj nowy transport")', { timeout: 5000 });
    
    // Verify transport form sections are visible immediately (no camp/turnus selection needed)
    await expect(page.locator('text=Wyjazd do obozu')).toBeVisible();
    await expect(page.locator('text=Powrót z obozu')).toBeVisible();
    
    // Verify transport type selects
    const departureTypeSelect = page.locator('select#departure-type');
    await expect(departureTypeSelect).toBeVisible();
    
    const returnTypeSelect = page.locator('select#return-type');
    await expect(returnTypeSelect).toBeVisible();
    
    console.log('[TEST] ✅ Transport form displayed with departure and return sections');
  });

  test('should close modal when clicking cancel', async ({ page }) => {
    // Open modal
    const addButton = page.locator('button:has-text("Dodaj transport")');
    await addButton.click();
    await page.waitForSelector('h3:has-text("Dodaj nowy transport")', { timeout: 5000 });
    
    // Click cancel button
    const cancelButton = page.locator('button:has-text("Anuluj")');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    } else {
      // Try closing via X button
      const closeButton = page.locator('h3:has-text("Dodaj nowy transport")').locator('..').locator('button').last();
      await closeButton.click({ force: true });
    }
    
    await page.waitForTimeout(500);
    
    // Verify modal is closed
    await expect(page.locator('h3:has-text("Dodaj nowy transport")')).not.toBeVisible();
    
    console.log('[TEST] ✅ Modal closed when clicking cancel');
  });
});

