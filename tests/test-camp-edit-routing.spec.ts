import { test, expect } from '@playwright/test';

/**
 * Test: Camp Edit Page Routing
 * Tests navigation to camp edit page after changing [id] to [campId]
 */
test.describe('Camp Edit Page Routing', () => {
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

  test('should navigate to camp edit page with [campId] in URL', async ({ page }) => {
    // Find first camp row
    const firstCampRow = page.locator('tbody tr').first();
    await expect(firstCampRow).toBeVisible();
    
    // Find edit button in the row (title="Edytuj")
    const editButton = firstCampRow.locator('button[title="Edytuj"]').first();
    await expect(editButton).toBeVisible();
    
    // Click edit button
    await editButton.click();
    
    // Wait for navigation
    await page.waitForURL(/\/admin-panel\/camps\/\d+\/edit/, { timeout: 10000 });
    
    // Verify URL contains campId (not id)
    const url = page.url();
    expect(url).toMatch(/\/admin-panel\/camps\/\d+\/edit/);
    
    // Verify we're on the edit page
    await expect(page.locator('h1')).toContainText('Edytuj obóz');
    
    // Check for form fields
    await expect(page.locator('label:has-text("Nazwa obozu")')).toBeVisible();
    
    console.log('[TEST] ✅ Navigation to camp edit page successful');
  });
});

