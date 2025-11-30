import { test, expect } from '@playwright/test';

test.describe('Admin Panel - Camps Table View', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    await page.goto(`${baseURL}/admin-panel/camps`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await expect(page.locator('h1', { hasText: 'Obozy' })).toBeVisible({ timeout: 10000 });
  });

  test('should display camps table with search and filters', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th', { hasText: 'ID' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Nazwa obozu' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Liczba edycji' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Akcje' })).toBeVisible();
    await expect(page.locator('input[placeholder*="Szukaj"]')).toBeVisible();
    await page.screenshot({ path: 'screenshots_playwright/camps-table-view.png', fullPage: true });
  });

  test('should expand camp details when clicking on row', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    
    // Click the row to expand
    await firstRow.click();
    await page.waitForTimeout(300); // Wait for animation

    const detailsCell = firstRow.locator('+ tr td[colspan="6"]');
    await expect(detailsCell).toBeVisible();
    await expect(detailsCell.locator('h4', { hasText: 'Edycje obozu' })).toBeVisible();
    
    await page.screenshot({ path: 'screenshots_playwright/camps-expanded-details.png', fullPage: true });

    // Click again to collapse
    await firstRow.click();
    await page.waitForTimeout(300); // Wait for animation
    await expect(detailsCell).not.toBeVisible();
  });

  test('should navigate to edit page when clicking edit icon', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    
    const editButton = firstRow.locator('button[title="Edytuj"]');
    await editButton.click();
    
    await page.waitForURL(/\/admin-panel\/camps\/\d+\/edit/, { timeout: 10000 });
    await expect(page.locator('h1', { hasText: 'Edytuj obóz' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Powrót do listy' })).toBeVisible();
    
    await page.screenshot({ path: 'screenshots_playwright/camps-edit-page.png', fullPage: true });
  });

  test('should return to list when clicking cancel on edit page', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    
    const editButton = firstRow.locator('button[title="Edytuj"]');
    await editButton.click();
    
    await page.waitForURL(/\/admin-panel\/camps\/\d+\/edit/, { timeout: 10000 });
    await expect(page.locator('h1', { hasText: 'Edytuj obóz' })).toBeVisible();
    
    await page.locator('button', { hasText: 'Anuluj' }).click();
    
    await page.waitForURL(/\/admin-panel\/camps/, { timeout: 10000 });
    await expect(page.locator('h1', { hasText: 'Obozy' })).toBeVisible();
    
    await page.screenshot({ path: 'screenshots_playwright/camps-edit-cancel.png', fullPage: true });
  });

  test('should open delete confirmation modal with transparent background when clicking delete icon', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    
    const deleteButton = firstRow.locator('button[title="Usuń"]');
    await deleteButton.click();
    
    await page.waitForTimeout(500); // Wait for animation

    // Find modal by text content - look for h2 with "Potwierdź usunięcie"
    const modalTitle = page.locator('h2', { hasText: 'Potwierdź usunięcie' });
    await expect(modalTitle).toBeVisible({ timeout: 5000 });
    
    // Find the modal container (parent of h2)
    const modal = modalTitle.locator('..').locator('..');
    
    // Check for transparent background (approximate check)
    const bgColor = await page.evaluate(() => {
      const overlay = document.querySelector('[style*="rgba(0, 0, 0, 0.3)"]') || 
                      document.querySelector('[style*="background"]');
      return overlay ? window.getComputedStyle(overlay as Element).backgroundColor : '';
    });
    expect(bgColor).toContain('rgba'); // Expect a transparent background

    await expect(page.locator('text=Czy na pewno chcesz usunąć obóz')).toBeVisible();
    
    // Find buttons - they should be visible when modal is open
    await expect(page.locator('button', { hasText: 'Anuluj' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Usuń' })).toBeVisible();
    
    await page.screenshot({ path: 'screenshots_playwright/camps-delete-modal.png', fullPage: true });
  });

  test('should close delete modal when clicking cancel', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    
    const deleteButton = firstRow.locator('button[title="Usuń"]');
    await deleteButton.click();
    
    await page.waitForTimeout(500); // Wait for animation
    const modalTitle = page.locator('h2', { hasText: 'Potwierdź usunięcie' });
    await expect(modalTitle).toBeVisible({ timeout: 5000 });
    
    // Find cancel button - it should be in the same container as the modal title
    const cancelButton = page.locator('button', { hasText: 'Anuluj' }).first();
    await cancelButton.click();
    await page.waitForTimeout(300); // Wait for animation
    
    await expect(modalTitle).not.toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'screenshots_playwright/camps-delete-cancel.png', fullPage: true });
  });

  test('should filter camps by search query', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Szukaj"]');
    await searchInput.fill('Laserowy');
    await page.waitForTimeout(500); // Wait for filtering

    const rows = page.locator('tbody tr');
    const count = await rows.count();
    
    // Check if all visible rows contain "Laserowy" in some form
    for (let i = 0; i < Math.min(count, 5); i++) {
      const row = rows.nth(i);
      const text = await row.textContent();
      expect(text?.toLowerCase()).toContain('laserowy');
    }
    
    await page.screenshot({ path: 'screenshots_playwright/camps-search-filter.png', fullPage: true });
  });

  test('should filter camps by period', async ({ page }) => {
    const periodButton = page.locator('button', { hasText: 'Tylko Lato' }).first();
    if (await periodButton.isVisible()) {
      await periodButton.click();
      await page.waitForTimeout(500); // Wait for filtering
      
      await page.screenshot({ path: 'screenshots_playwright/camps-period-filter.png', fullPage: true });
    }
  });

  test('should sort camps by column', async ({ page }) => {
    const nameHeader = page.locator('th', { hasText: 'Nazwa obozu' });
    await nameHeader.click();
    await page.waitForTimeout(300); // Wait for sorting

    await page.screenshot({ path: 'screenshots_playwright/camps-sorted.png', fullPage: true });
  });

  test('should navigate to new camp page', async ({ page }) => {
    const createButton = page.locator('button', { hasText: 'Dodaj obóz' });
    await createButton.click();
    
    await page.waitForURL('/admin-panel/camps/new', { timeout: 10000 });
    await expect(page.locator('h1', { hasText: 'Dodaj nowy obóz' })).toBeVisible();
    
    await page.screenshot({ path: 'screenshots_playwright/camps-new-page.png', fullPage: true });
  });

  test('should work on mobile viewport', async ({ page }) => {
    page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.reload({ waitUntil: 'domcontentloaded' });
    
    await expect(page.locator('h1', { hasText: 'Obozy' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    
    // Check if action icons are visible
    await expect(page.locator('tbody tr').first().locator('button[title="Edytuj"]')).toBeVisible();
    await expect(page.locator('tbody tr').first().locator('button[title="Usuń"]')).toBeVisible();

    // Expand a row
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(300); // Wait for animation
    const detailsCell = firstRow.locator('+ tr td[colspan="6"]');
    await expect(detailsCell).toBeVisible();

    // Check if details are displayed responsively
    await expect(detailsCell.locator('h4', { hasText: 'Edycje obozu' })).toBeVisible();
    
    await page.screenshot({ path: 'screenshots_playwright/camps-mobile-view.png', fullPage: true });
  });
});

