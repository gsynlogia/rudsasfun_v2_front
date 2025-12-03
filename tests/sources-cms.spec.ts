import { test, expect } from '@playwright/test';

test.describe('Sources CMS Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin login (assuming you need to login first)
    // Adjust URL and credentials as needed
    await page.goto('http://localhost:3000/admin-panel/login');
    
    // TODO: Add login logic if needed
    // For now, assuming user is already logged in or login is handled elsewhere
  });

  test('should display sources management page', async ({ page }) => {
    // Navigate to sources CMS page
    await page.goto('http://localhost:3000/admin-panel/sources');
    
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Zarządzanie Źródłami Informacji")');
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/sources-cms-page.png', fullPage: true });
    
    // Check if main elements are present
    await expect(page.locator('h1')).toContainText('Zarządzanie Źródłami Informacji');
    await expect(page.locator('button:has-text("Dodaj nowe źródło")')).toBeVisible();
  });

  test('should add new source', async ({ page }) => {
    await page.goto('http://localhost:3000/admin-panel/sources');
    
    // Click "Add new source" button
    await page.click('button:has-text("Dodaj nowe źródło")');
    
    // Wait for modal
    await page.waitForSelector('text=Dodaj nowe źródło', { timeout: 5000 });
    
    // Fill form
    await page.fill('input[id="source-name"]', 'Test Source');
    await page.check('input[type="checkbox"]'); // Check "is_other" if needed
    
    // Take screenshot of modal
    await page.screenshot({ path: 'tests/screenshots/add-source-modal.png', fullPage: true });
    
    // Submit form
    await page.click('button:has-text("Dodaj źródło")');
    
    // Wait for success (source should appear in list)
    await page.waitForTimeout(2000);
    
    // Take screenshot after adding
    await page.screenshot({ path: 'tests/screenshots/after-add-source.png', fullPage: true });
    
    // Verify source was added
    await expect(page.locator('text=Test Source')).toBeVisible();
  });

  test('should reorder sources with drag and drop', async ({ page }) => {
    await page.goto('http://localhost:3000/admin-panel/sources');
    
    // Wait for sources to load
    await page.waitForSelector('table tbody tr', { timeout: 5000 });
    
    // Get first and second source rows
    const firstRow = page.locator('table tbody tr').first();
    const secondRow = page.locator('table tbody tr').nth(1);
    
    // Take screenshot before drag
    await page.screenshot({ path: 'tests/screenshots/before-drag.png', fullPage: true });
    
    // Perform drag and drop
    await firstRow.dragTo(secondRow);
    
    // Wait for reorder to complete
    await page.waitForTimeout(2000);
    
    // Take screenshot after drag
    await page.screenshot({ path: 'tests/screenshots/after-drag.png', fullPage: true });
  });

  test('should display sources in Step2 reservation form', async ({ page }) => {
    // Navigate to reservation form Step2
    // This assumes you have a way to get to Step2
    await page.goto('http://localhost:3000/reservation');
    
    // Navigate to Step2 (adjust selector as needed)
    // For now, just check if SourceSection is visible
    await page.waitForSelector('text=Skąd dowiedziałeś się o Radsas Fun?', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/step2-sources.png', fullPage: true });
    
    // Verify sources are loaded from API
    const sourceOptions = page.locator('input[type="radio"][name="source"]');
    const count = await sourceOptions.count();
    expect(count).toBeGreaterThan(0);
  });
});

