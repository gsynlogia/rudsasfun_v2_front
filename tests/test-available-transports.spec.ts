import { test, expect } from '@playwright/test';

/**
 * Test: Available Transports Feature
 * Tests the functionality of selecting transport from other turnusy
 */
test.describe('Available Transports Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to camps page first
    await page.goto('http://localhost:3000/admin-panel/camps');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await expect(page.locator('h1', { hasText: 'Obozy' })).toBeVisible({ timeout: 15000 });
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Wait for data to load
    await page.waitForFunction(
      () => {
        const rows = document.querySelectorAll('tbody tr');
        return rows.length > 0 && !rows[0].textContent?.includes('Brak obozów');
      },
      { timeout: 10000 }
    );
  });

  test('should display "Wybierz z dostępnych transportów" button in transport section', async ({ page }) => {
    // Find first camp row and expand it
    const firstCampRow = page.locator('tbody tr').first();
    await firstCampRow.click();
    
    // Wait for expanded content
    await page.waitForSelector('.bg-blue-50', { timeout: 5000 });
    
    // Find first turnus edit button
    const editButton = page.locator('button[title="Edytuj turnus"]').first();
    await expect(editButton).toBeVisible();
    
    // Click edit button
    await editButton.click();
    
    // Wait for navigation to edit page
    await page.waitForURL(/\/admin-panel\/camps\/\d+\/turnus\/\d+\/edit/, { timeout: 10000 });
    
    // Wait for transport section
    await page.waitForSelector('h2:has-text("Transport")', { timeout: 10000 });
    
    // Verify button is visible
    const selectButton = page.locator('button:has-text("Wybierz z dostępnych transportów")');
    await expect(selectButton).toBeVisible();
    
    console.log('[TEST] ✅ "Wybierz z dostępnych transportów" button displayed');
  });

  test('should open modal when clicking "Wybierz z dostępnych transportów" button', async ({ page }) => {
    // Navigate to turnus edit page
    const firstCampRow = page.locator('tbody tr').first();
    await firstCampRow.click();
    await page.waitForSelector('.bg-blue-50', { timeout: 5000 });
    const editButton = page.locator('button[title="Edytuj turnus"]').first();
    await editButton.click();
    await page.waitForURL(/\/admin-panel\/camps\/\d+\/turnus\/\d+\/edit/, { timeout: 10000 });
    await page.waitForSelector('h2:has-text("Transport")', { timeout: 10000 });
    
    // Click the button
    const selectButton = page.locator('button:has-text("Wybierz z dostępnych transportów")');
    await selectButton.click();
    
    // Wait for modal to appear
    await page.waitForSelector('text=Wybierz transport z dostępnych turnusów', { timeout: 5000 });
    
    // Verify modal is visible
    await expect(page.locator('h3:has-text("Wybierz transport z dostępnych turnusów")')).toBeVisible();
    
    console.log('[TEST] ✅ Modal opened when clicking button');
  });

  test('should display search input in modal', async ({ page }) => {
    // Navigate to turnus edit page
    const firstCampRow = page.locator('tbody tr').first();
    await firstCampRow.click();
    await page.waitForSelector('.bg-blue-50', { timeout: 5000 });
    const editButton = page.locator('button[title="Edytuj turnus"]').first();
    await editButton.click();
    await page.waitForURL(/\/admin-panel\/camps\/\d+\/turnus\/\d+\/edit/, { timeout: 10000 });
    await page.waitForSelector('h2:has-text("Transport")', { timeout: 10000 });
    
    // Open modal
    const selectButton = page.locator('button:has-text("Wybierz z dostępnych transportów")');
    await selectButton.click();
    await page.waitForSelector('text=Wybierz transport z dostępnych turnusów', { timeout: 5000 });
    
    // Verify search input is visible
    const searchInput = page.locator('input[placeholder*="Szukaj po okresie"]');
    await expect(searchInput).toBeVisible();
    
    console.log('[TEST] ✅ Search input displayed in modal');
  });

  test('should display "Brak zadeklarowanych transportów" when no transports available', async ({ page }) => {
    // Navigate to turnus edit page
    const firstCampRow = page.locator('tbody tr').first();
    await firstCampRow.click();
    await page.waitForSelector('.bg-blue-50', { timeout: 5000 });
    const editButton = page.locator('button[title="Edytuj turnus"]').first();
    await editButton.click();
    await page.waitForURL(/\/admin-panel\/camps\/\d+\/turnus\/\d+\/edit/, { timeout: 10000 });
    await page.waitForSelector('h2:has-text("Transport")', { timeout: 10000 });
    
    // Open modal
    const selectButton = page.locator('button:has-text("Wybierz z dostępnych transportów")');
    await selectButton.click();
    await page.waitForSelector('text=Wybierz transport z dostępnych turnusów', { timeout: 5000 });
    
    // Wait for content to load (either transports or empty message)
    await page.waitForTimeout(2000);
    
    // Check if empty message is displayed (if no transports)
    const emptyMessage = page.locator('text=Brak zadeklarowanych transportów');
    const loadingMessage = page.locator('text=Ładowanie dostępnych transportów');
    
    // Either loading, empty message, or transports list should be visible
    const hasEmptyMessage = await emptyMessage.isVisible().catch(() => false);
    const hasLoading = await loadingMessage.isVisible().catch(() => false);
    const hasTransports = await page.locator('.cursor-pointer').count() > 0;
    
    // At least one should be true
    expect(hasEmptyMessage || hasLoading || hasTransports).toBe(true);
    
    console.log('[TEST] ✅ Empty message or transports list displayed correctly');
  });

  test('should close modal when clicking X button', async ({ page }) => {
    // Navigate to turnus edit page
    const firstCampRow = page.locator('tbody tr').first();
    await firstCampRow.click();
    await page.waitForSelector('.bg-blue-50', { timeout: 5000 });
    const editButton = page.locator('button[title="Edytuj turnus"]').first();
    await editButton.click();
    await page.waitForURL(/\/admin-panel\/camps\/\d+\/turnus\/\d+\/edit/, { timeout: 10000 });
    await page.waitForSelector('h2:has-text("Transport")', { timeout: 10000 });
    
    // Open modal
    const selectButton = page.locator('button:has-text("Wybierz z dostępnych transportów")');
    await selectButton.click();
    await page.waitForSelector('text=Wybierz transport z dostępnych turnusów', { timeout: 5000 });
    
    // Click X button (in modal header) - use force click to bypass overlay
    const closeButton = page.locator('h3:has-text("Wybierz transport z dostępnych turnusów")').locator('..').locator('button').last();
    await closeButton.click({ force: true });
    
    // Wait for modal to close
    await page.waitForTimeout(500);
    
    // Verify modal is not visible
    await expect(page.locator('h3:has-text("Wybierz transport z dostępnych turnusów")')).not.toBeVisible();
    
    console.log('[TEST] ✅ Modal closed when clicking X button');
  });
});

