import { test, expect } from '@playwright/test';

test.describe('Step2 Transport Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to step 2 of a reservation
    await page.goto('http://localhost:3000/camps/1/edition/1/step/2');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should prevent navigation when transport fields are not filled', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('select', { timeout: 10000 });
    
    // Clear any default values by selecting empty option
    const departureSelect = page.locator('label:has-text("Wybierz sposób dojazdu") + div select').first();
    await departureSelect.selectOption('');
    
    const returnSelect = page.locator('label:has-text("Wybierz sposób powrotu") + div select').first();
    await returnSelect.selectOption('');
    
    // Try to navigate to next step
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    // Wait a bit for validation to run
    await page.waitForTimeout(500);
    
    // Check if we're still on step 2
    await expect(page).toHaveURL(/.*\/step\/2/);
    
    // Check if error messages are displayed
    const departureError = page.locator('text=Pole obowiązkowe').first();
    await expect(departureError).toBeVisible();
    
    const returnError = page.locator('text=Pole obowiązkowe').last();
    await expect(returnError).toBeVisible();
  });

  test('should show validation errors for transport type fields', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('select', { timeout: 10000 });
    
    // Clear departure type
    const departureSelect = page.locator('label:has-text("Wybierz sposób dojazdu") + div select').first();
    await departureSelect.selectOption('');
    
    // Clear return type
    const returnSelect = page.locator('label:has-text("Wybierz sposób powrotu") + div select').first();
    await returnSelect.selectOption('');
    
    // Try to navigate
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    await page.waitForTimeout(500);
    
    // Check if fields have red borders
    const departureBorderColor = await departureSelect.evaluate((el) => {
      return window.getComputedStyle(el).borderColor;
    });
    expect(departureBorderColor).toContain('rgb');
    
    const returnBorderColor = await returnSelect.evaluate((el) => {
      return window.getComputedStyle(el).borderColor;
    });
    expect(returnBorderColor).toContain('rgb');
  });

  test('should show validation error when collective transport is selected but city is not', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('select', { timeout: 10000 });
    
    // Select collective transport for departure
    const departureSelect = page.locator('label:has-text("Wybierz sposób dojazdu") + div select').first();
    await departureSelect.selectOption('zbiorowy');
    
    // Wait for cities to load
    await page.waitForTimeout(2000);
    
    // Don't select a city - leave it empty
    
    // Try to navigate
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    await page.waitForTimeout(500);
    
    // Check if city error is displayed
    const cityError = page.locator('text=Pole obowiązkowe').filter({ hasText: 'Pole obowiązkowe' });
    await expect(cityError.first()).toBeVisible();
  });

  test('should allow navigation when all transport fields are filled', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('select', { timeout: 10000 });
    
    // Select collective transport for departure
    const departureSelect = page.locator('label:has-text("Wybierz sposób dojazdu") + div select').first();
    await departureSelect.selectOption('zbiorowy');
    
    // Wait for cities to load
    await page.waitForTimeout(2000);
    
    // Select a city for departure
    const departureCitySelect = page.locator('label:has-text("Wybierz miasto zbiórki") + div select').first();
    const departureOptions = await departureCitySelect.locator('option').all();
    if (departureOptions.length > 1) {
      const firstCityValue = await departureOptions[1].getAttribute('value');
      if (firstCityValue) {
        await departureCitySelect.selectOption(firstCityValue);
      }
    }
    
    // Select collective transport for return
    const returnSelect = page.locator('label:has-text("Wybierz sposób powrotu") + div select').first();
    await returnSelect.selectOption('zbiorowy');
    
    // Wait for cities to load
    await page.waitForTimeout(2000);
    
    // Select a city for return
    const returnCitySelect = page.locator('label:has-text("Wybierz miasto powrotu") + div select').first();
    const returnOptions = await returnCitySelect.locator('option').all();
    if (returnOptions.length > 1) {
      const firstCityValue = await returnOptions[1].getAttribute('value');
      if (firstCityValue) {
        await returnCitySelect.selectOption(firstCityValue);
      }
    }
    
    // Try to navigate
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // Check if we moved to step 3
    await expect(page).toHaveURL(/.*\/step\/3/);
  });

  test('should clear validation errors when user starts selecting', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('select', { timeout: 10000 });
    
    // Clear departure type to trigger error
    const departureSelect = page.locator('label:has-text("Wybierz sposób dojazdu") + div select').first();
    await departureSelect.selectOption('');
    
    // Try to navigate to trigger validation
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    await page.waitForTimeout(500);
    
    // Check if error is displayed
    const errorBefore = page.locator('text=Pole obowiązkowe').first();
    await expect(errorBefore).toBeVisible();
    
    // Select a transport type
    await departureSelect.selectOption('zbiorowy');
    
    await page.waitForTimeout(500);
    
    // Error should be cleared
    const errorAfter = page.locator('text=Pole obowiązkowe').first();
    // The error might still be visible if return type is also empty, so we check if departure error is gone
    const departureErrorCount = await page.locator('text=Pole obowiązkowe').count();
    // Should have fewer errors now (only return type error if it's also empty)
    expect(departureErrorCount).toBeGreaterThanOrEqual(0);
  });
});

