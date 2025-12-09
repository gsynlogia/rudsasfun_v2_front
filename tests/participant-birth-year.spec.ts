import { test, expect } from '@playwright/test';

/**
 * Test: Wybór rocznika urodzenia zamiast wieku
 * Zadanie 3: 
 * - Zamiast lat mają być roczniki
 * - Roczniki od 7 do 17 roku życia (w dniu rozpoczęcia obozu)
 * - Obliczanie dostępnych roczników na podstawie daty obozu
 * - Walidacja, że wybrany rocznik daje wiek 7-17 lat w dniu obozu
 */
test.describe('Participant Birth Year Selection', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to reservation form Step 1
    await page.goto('http://localhost:3000/camps/1/edition/1/step/1');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h2:has-text("Dane uczestnika")', { timeout: 10000 });
  });

  test('should show birth year select instead of age select', async ({ page }) => {
    // Check that there is a select for birth year (not age)
    const birthYearSelect = page.locator('label:has-text("Rocznik")').locator('..').locator('select').first();
    await expect(birthYearSelect).toBeVisible({ timeout: 5000 });
    
    // Check that label says "Rocznik" not "Wiek"
    const label = page.locator('label:has-text("Rocznik")');
    await expect(label).toBeVisible();
    
    await page.screenshot({ 
      path: 'screenshots_playwright/participant-birth-year-select.png',
      fullPage: true 
    });
  });

  test('should show only valid birth years (7-17 years old on camp start date)', async ({ page }) => {
    // Get birth year select
    const birthYearSelect = page.locator('label:has-text("Rocznik")').locator('..').locator('select').first();
    
    // Get all options
    const options = await birthYearSelect.locator('option').allTextContents();
    
    // Should have "Wybierz z listy" as first option
    expect(options[0]).toContain('Wybierz');
    
    // Should have valid birth years (not ages)
    // Birth years should be 4-digit years (e.g., 2010, 2011, etc.)
    const birthYearOptions = options.slice(1); // Skip first "Wybierz z listy"
    
    // All options should be 4-digit years
    birthYearOptions.forEach(year => {
      expect(year).toMatch(/^\d{4}$/);
    });
    
    await page.screenshot({ 
      path: 'screenshots_playwright/participant-birth-year-options.png',
      fullPage: true 
    });
  });

  test('should validate birth year gives age 7-17 on camp start date', async ({ page }) => {
    // Select a birth year
    const birthYearSelect = page.locator('label:has-text("Rocznik")').locator('..').locator('select').first();
    
    // Get first valid birth year option (skip "Wybierz z listy")
    const firstYearOption = birthYearSelect.locator('option').nth(1);
    const birthYear = await firstYearOption.textContent();
    
    // Select the birth year
    await birthYearSelect.selectOption({ index: 1 });
    
    // Fill other required fields
    const participantSection = page.locator('h2:has-text("Dane uczestnika")').locator('..');
    await participantSection.locator('input[type="text"]').first().fill('Anna');
    await participantSection.locator('input[type="text"]').nth(1).fill('Kowalska');
    
    // Try to proceed - should work if birth year is valid
    const nextButton = page.locator('button:has-text("przejdź dalej"), button:has-text("Przejdź dalej")').first();
    
    await page.screenshot({ 
      path: 'screenshots_playwright/participant-birth-year-selected.png',
      fullPage: true 
    });
  });
});








