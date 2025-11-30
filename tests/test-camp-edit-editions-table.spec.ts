import { test, expect } from '@playwright/test';

/**
 * Test: Camp Edit Page - Turnusy Table
 * Tests the turnusy table on camp edit page and navigation to turnus edit
 */
test.describe('Camp Edit Page - Turnusy Table', () => {
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

  test('should display turnusy table on camp edit page', async ({ page }) => {
    // Find first camp row
    const firstCampRow = page.locator('tbody tr').first();
    await expect(firstCampRow).toBeVisible();
    
    // Find edit button in the row
    const editButton = firstCampRow.locator('button[title="Edytuj"]').first();
    await expect(editButton).toBeVisible();
    
    // Click edit button
    await editButton.click();
    
    // Wait for navigation to camp edit page
    await page.waitForURL(/\/admin-panel\/camps\/\d+\/edit/, { timeout: 10000 });
    
    // Verify we're on the edit page
    await expect(page.locator('h1')).toContainText('Edytuj obóz');
    
    // Wait for turnusy section to appear
    await page.waitForSelector('text=Turnusy obozu', { timeout: 10000 });
    
    // Verify turnusy section is visible
    await expect(page.locator('text=Turnusy obozu')).toBeVisible();
    
    console.log('[TEST] ✅ Turnusy table section displayed on camp edit page');
  });

  test('should navigate to turnus edit page when clicking on a turnus card', async ({ page }) => {
    // Find first camp row
    const firstCampRow = page.locator('tbody tr').first();
    await expect(firstCampRow).toBeVisible();
    
    // Find edit button in the row
    const editButton = firstCampRow.locator('button[title="Edytuj"]').first();
    await expect(editButton).toBeVisible();
    
    // Click edit button
    await editButton.click();
    
    // Wait for navigation to camp edit page
    await page.waitForURL(/\/admin-panel\/camps\/\d+\/edit/, { timeout: 10000 });
    
    // Wait for turnusy section
    await page.waitForSelector('text=Turnusy obozu', { timeout: 10000 });
    
    // Wait for turnus cards to appear (if any exist)
    const turnusCards = page.locator('.bg-white.rounded-lg.p-4.border');
    
    // Check if there are any turnusy
    const count = await turnusCards.count();
    
    if (count > 0) {
      // Click on first turnus card
      const firstTurnusCard = turnusCards.first();
      await expect(firstTurnusCard).toBeVisible();
      
      // Click on the card
      await firstTurnusCard.click();
      
      // Wait for navigation to turnus edit page
      await page.waitForURL(/\/admin-panel\/camps\/\d+\/turnus\/\d+\/edit/, { timeout: 10000 });
      
      // Verify we're on the turnus edit page
      await expect(page.locator('h1')).toContainText('Edytuj turnus');
      
      console.log('[TEST] ✅ Navigation to turnus edit page successful');
    } else {
      console.log('[TEST] ℹ️ No turnusy found for this camp - skipping navigation test');
    }
  });

  test('should navigate to turnus edit page when clicking edit icon on turnus card', async ({ page }) => {
    // Find first camp row
    const firstCampRow = page.locator('tbody tr').first();
    await expect(firstCampRow).toBeVisible();
    
    // Find edit button in the row
    const editButton = firstCampRow.locator('button[title="Edytuj"]').first();
    await expect(editButton).toBeVisible();
    
    // Click edit button
    await editButton.click();
    
    // Wait for navigation to camp edit page
    await page.waitForURL(/\/admin-panel\/camps\/\d+\/edit/, { timeout: 10000 });
    
    // Wait for turnusy section
    await page.waitForSelector('text=Turnusy obozu', { timeout: 10000 });
    
    // Wait for turnus cards to appear (if any exist)
    const turnusCards = page.locator('.bg-white.rounded-lg.p-4.border');
    const count = await turnusCards.count();
    
    if (count > 0) {
      // Find edit icon button in first turnus card
      const editIconButton = turnusCards.first().locator('button[title="Edytuj turnus"]');
      await expect(editIconButton).toBeVisible();
      
      // Click on the edit icon
      await editIconButton.click();
      
      // Wait for navigation to turnus edit page
      await page.waitForURL(/\/admin-panel\/camps\/\d+\/turnus\/\d+\/edit/, { timeout: 10000 });
      
      // Verify we're on the turnus edit page
      await expect(page.locator('h1')).toContainText('Edytuj turnus');
      
      console.log('[TEST] ✅ Navigation to turnus edit page via edit icon successful');
    } else {
      console.log('[TEST] ℹ️ No turnusy found for this camp - skipping edit icon test');
    }
  });
});

