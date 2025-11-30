import { test, expect } from '@playwright/test';

/**
 * Test: Camp Edition Edit Page
 * Tests the creation and navigation to camp edition edit page
 */
test.describe('Camp Edition Edit Page', () => {
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

  test('should navigate to edition edit page when clicking edit icon on an edition', async ({ page }) => {
    // Find first camp row and expand it
    const firstCampRow = page.locator('tbody tr').first();
    await firstCampRow.click();
    
    // Wait for expanded content
    await page.waitForSelector('.bg-blue-50', { timeout: 5000 });
    
    // Find first edition edit button
    const editButton = page.locator('button[title="Edytuj edycję"]').first();
    await expect(editButton).toBeVisible();
    
    // Click edit button
    await editButton.click();
    
    // Wait for navigation to edit page
    await page.waitForURL(/\/admin-panel\/camps\/\d+\/editions\/\d+\/edit/, { timeout: 10000 });
    
    // Verify we're on the edit page
    await expect(page.locator('h1')).toContainText('Edytuj edycję');
    
    // Verify form fields are present
    await expect(page.locator('label:has-text("Okres")')).toBeVisible();
    await expect(page.locator('label:has-text("Miejscowość")')).toBeVisible();
    await expect(page.locator('label:has-text("Data rozpoczęcia")')).toBeVisible();
    await expect(page.locator('label:has-text("Data zakończenia")')).toBeVisible();
    
    // Verify camp info is displayed
    await expect(page.locator('text=Obóz')).toBeVisible();
    
    console.log('[TEST] ✅ Navigation to edition edit page successful');
  });

  test('should display campId and editionId in URL', async ({ page }) => {
    // Find first camp row and expand it
    const firstCampRow = page.locator('tbody tr').first();
    await firstCampRow.click();
    
    // Wait for expanded content
    await page.waitForSelector('.bg-blue-50', { timeout: 5000 });
    
    // Find first edition edit button
    const editButton = page.locator('button[title="Edytuj edycję"]').first();
    await expect(editButton).toBeVisible();
    
    // Click edit button
    await editButton.click();
    
    // Wait for navigation
    await page.waitForURL(/\/admin-panel\/camps\/\d+\/editions\/\d+\/edit/, { timeout: 10000 });
    
    // Verify URL contains campId and editionId
    const url = page.url();
    expect(url).toMatch(/\/admin-panel\/camps\/\d+\/editions\/\d+\/edit/);
    
    // Extract IDs from URL
    const match = url.match(/\/camps\/(\d+)\/editions\/(\d+)\/edit/);
    expect(match).not.toBeNull();
    expect(match![1]).toBeTruthy(); // campId
    expect(match![2]).toBeTruthy(); // editionId
    
    console.log('[TEST] ✅ URL contains campId and editionId:', { campId: match![1], editionId: match![2] });
  });
});

