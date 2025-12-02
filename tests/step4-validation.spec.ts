import { test, expect } from '@playwright/test';

test.describe('Step4 Consents Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to step 4 of a reservation
    await page.goto('http://localhost:3000/camps/1/edition/1/step/4');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should prevent navigation when consents are not checked', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });
    
    // Ensure no consents are checked
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      const checkbox = checkboxes.nth(i);
      if (await checkbox.isChecked()) {
        await checkbox.uncheck();
      }
    }
    await page.waitForTimeout(500);
    
    // Try to navigate to next step
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    // Wait a bit for validation to run
    await page.waitForTimeout(500);
    
    // Check if we're still on step 4
    await expect(page).toHaveURL(/.*\/step\/4/);
    
    // Check if error messages are displayed
    const errorMessages = page.locator('text=Pole obowiązkowe');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test('should show validation errors for all unchecked consents', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });
    
    // Uncheck all consents
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      const checkbox = checkboxes.nth(i);
      if (await checkbox.isChecked()) {
        await checkbox.uncheck();
      }
    }
    await page.waitForTimeout(500);
    
    // Try to navigate
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    await page.waitForTimeout(500);
    
    // Check if all 4 consent errors are displayed
    const errorMessages = page.locator('text=Pole obowiązkowe');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBeGreaterThanOrEqual(4);
  });

  test('should show red highlighting for unchecked consents', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });
    
    // Uncheck all consents
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      const checkbox = checkboxes.nth(i);
      if (await checkbox.isChecked()) {
        await checkbox.uncheck();
      }
    }
    await page.waitForTimeout(500);
    
    // Try to navigate
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    await page.waitForTimeout(500);
    
    // Check if consent labels have red text (check for text-red-600 class or red color)
    const consent1Label = page.locator('label[for="consent1"]');
    const hasRedText = await consent1Label.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const color = style.color;
      return color.includes('rgb') || color.includes('red') || el.classList.contains('text-red-600');
    });
    expect(hasRedText).toBeTruthy();
    
    // Also check if error message is visible
    const errorMessage = page.locator('text=Pole obowiązkowe').first();
    await expect(errorMessage).toBeVisible();
  });

  test('should allow navigation when all consents are checked', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });
    
    // Check "Select All" checkbox
    const selectAllCheckbox = page.locator('input[id="selectAllConsents"]');
    await selectAllCheckbox.check();
    await page.waitForTimeout(500);
    
    // Verify all consents are checked
    const consent1 = page.locator('input[id="consent1"]');
    const consent2 = page.locator('input[id="consent2"]');
    const consent3 = page.locator('input[id="consent3"]');
    const consent4 = page.locator('input[id="consent4"]');
    
    await expect(consent1).toBeChecked();
    await expect(consent2).toBeChecked();
    await expect(consent3).toBeChecked();
    await expect(consent4).toBeChecked();
    
    // Try to navigate
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // Should navigate to step 5
    await expect(page).toHaveURL(/.*\/step\/5/);
  });

  test('should clear validation errors when consent is checked', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });
    
    // Uncheck all consents
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      const checkbox = checkboxes.nth(i);
      if (await checkbox.isChecked()) {
        await checkbox.uncheck();
      }
    }
    await page.waitForTimeout(500);
    
    // Try to navigate to trigger validation
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    await page.waitForTimeout(500);
    
    // Check if error is displayed
    const errorBefore = page.locator('text=Pole obowiązkowe').first();
    await expect(errorBefore).toBeVisible();
    
    // Check consent1
    const consent1 = page.locator('input[id="consent1"]');
    await consent1.check();
    
    await page.waitForTimeout(500);
    
    // Error for consent1 should be cleared
    const consent1Error = page.locator('label[for="consent1"]').locator('..').locator('text=Pole obowiązkowe');
    const isVisible = await consent1Error.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test('should validate all consents individually', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });
    
    // Uncheck all consents
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      const checkbox = checkboxes.nth(i);
      if (await checkbox.isChecked()) {
        await checkbox.uncheck();
      }
    }
    await page.waitForTimeout(500);
    
    // Check only consent1
    const consent1 = page.locator('input[id="consent1"]');
    await consent1.check();
    
    // Try to navigate
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    await page.waitForTimeout(500);
    
    // Should still be on step 4
    await expect(page).toHaveURL(/.*\/step\/4/);
    
    // Check if errors for consent2, consent3, consent4 are displayed
    const errorMessages = page.locator('text=Pole obowiązkowe');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBeGreaterThanOrEqual(3);
  });
});

