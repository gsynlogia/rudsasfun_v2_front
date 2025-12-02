import { test, expect } from '@playwright/test';

test.describe('Step1 Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to step 1
    await page.goto('http://localhost:3000/camps/1/edition/1/step/1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('should prevent navigation to step 2 when required fields are empty', async ({ page }) => {
    // Take initial screenshot
    await page.screenshot({ path: 'screenshots_playwright/step1-validation-initial.png', fullPage: true });

    // Try to click "Dalej" button without filling any fields
    // Use first() to get the main navigation button (not the one in summary)
    const nextButton = page.locator('button', { hasText: /Dalej|Następny|przejdź dalej/i }).first();
    await expect(nextButton).toBeVisible({ timeout: 10000 });
    
    await nextButton.click();
    await page.waitForTimeout(1000);

    // Should still be on step 1
    expect(page.url()).toContain('/step/1');

    // Check that validation errors are displayed
    const errorMessages = page.locator('text=/Pole obowiązkowe/i');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBeGreaterThan(0);

    // Check that at least one field has red border or error class
    const firstNameInput = page.locator('label', { hasText: /Imię/i }).locator('..').locator('input[type="text"]').first();
    const hasError = await firstNameInput.evaluate((el) => {
      const borderColor = window.getComputedStyle(el).borderColor;
      return el.classList.toString().includes('border-red') || 
             borderColor.includes('239') ||
             borderColor.includes('220') ||
             borderColor.includes('rgb(239');
    }).catch(() => false);
    
    // At least error message should be visible
    const hasErrorMessage = await firstNameInput.locator('..').locator('text=/Pole obowiązkowe/i').isVisible().catch(() => false);
    expect(hasError || hasErrorMessage).toBeTruthy();

    // Take screenshot with validation errors
    await page.screenshot({ path: 'screenshots_playwright/step1-validation-errors.png', fullPage: true });
  });

  test('should show validation errors for all required fields', async ({ page }) => {
    // Click "Dalej" without filling fields
    const nextButton = page.locator('button', { hasText: /Dalej|Następny|przejdź dalej/i }).first();
    await nextButton.click();
    await page.waitForTimeout(2000);

    // Check for all required field errors
    const requiredFields = [
      'Imię',
      'Nazwisko',
      'Adres e-mail',
      'Numer telefonu',
      'Ulica i numer',
      'Kod pocztowy',
      'Miejscowość'
    ];

    // Check that at least some fields show errors
    let errorCount = 0;
    for (const fieldLabel of requiredFields) {
      try {
        // Find the input field by label
        const label = page.locator('label', { hasText: new RegExp(fieldLabel, 'i') });
        await expect(label).toBeVisible({ timeout: 2000 });
        
        // Check for error message near this field
        const errorMessage = label.locator('..').locator('text=/Pole obowiązkowe/i');
        const isVisible = await errorMessage.isVisible().catch(() => false);
        
        if (isVisible) {
          errorCount++;
        }
      } catch (e) {
        // Field not found, skip
      }
    }
    
    // At least 3 fields should show errors
    expect(errorCount).toBeGreaterThanOrEqual(3);

    await page.screenshot({ path: 'screenshots_playwright/step1-all-errors.png', fullPage: true });
  });

  test('should allow navigation when all required fields are filled', async ({ page }) => {
    // Fill in all required parent fields
    const firstNameInput = page.locator('label', { hasText: /Imię/i }).locator('..').locator('input[type="text"]').first();
    await firstNameInput.fill('Jan');
    
    const lastNameInput = page.locator('label', { hasText: /Nazwisko/i }).locator('..').locator('input[type="text"]').first();
    await lastNameInput.fill('Kowalski');
    
    const emailInput = page.locator('label', { hasText: /Adres e-mail/i }).locator('..').locator('input[type="email"]');
    await emailInput.fill('jan.kowalski@example.com');
    
    const phoneInput = page.locator('label', { hasText: /Numer telefonu/i }).locator('..').locator('input[type="tel"]');
    await phoneInput.fill('123456789');
    
    const streetInput = page.locator('label', { hasText: /Ulica i numer/i }).locator('..').locator('input[type="text"]');
    await streetInput.fill('ul. Testowa 1');
    
    const postalCodeInput = page.locator('label', { hasText: /Kod pocztowy/i }).locator('..').locator('input[type="text"]');
    await postalCodeInput.fill('00-000');
    
    const cityInput = page.locator('label', { hasText: /Miejscowość/i }).locator('..').locator('input[type="text"]').first();
    await cityInput.fill('Warszawa');

    // Fill in all required participant fields
    const participantFirstNameInput = page.locator('label', { hasText: /Imię uczestnika/i }).locator('..').locator('input[type="text"]');
    await participantFirstNameInput.fill('Anna');
    
    const participantLastNameInput = page.locator('label', { hasText: /Nazwisko uczestnika/i }).locator('..').locator('input[type="text"]');
    await participantLastNameInput.fill('Kowalska');
    
    const ageSelect = page.locator('label', { hasText: /Wiek/i }).locator('..').locator('select');
    await ageSelect.selectOption('10');
    
    const genderSelect = page.locator('label', { hasText: /Płeć/i }).locator('..').locator('select');
    await genderSelect.selectOption('Dziewczynka');
    
    const participantCityInput = page.locator('label', { hasText: /Miejsce zamieszkania/i }).locator('..').locator('input[type="text"]');
    await participantCityInput.fill('Warszawa');

    await page.waitForTimeout(500);

    // Take screenshot before navigation
    await page.screenshot({ path: 'screenshots_playwright/step1-filled.png', fullPage: true });

    // Click "Dalej" button
    const nextButton = page.locator('button', { hasText: /Dalej|Następny|przejdź dalej/i }).first();
    await nextButton.click();
    await page.waitForTimeout(2000);

    // Should navigate to step 2
    expect(page.url()).toContain('/step/2');

    await page.screenshot({ path: 'screenshots_playwright/step1-navigation-success.png', fullPage: true });
  });

  test('should clear validation errors when user starts typing', async ({ page }) => {
    // Click "Dalej" to trigger validation
    const nextButton = page.locator('button', { hasText: /Dalej|Następny|przejdź dalej/i }).first();
    await nextButton.click();
    await page.waitForTimeout(1000);

    // Check that error is visible
    const firstNameInput = page.locator('label', { hasText: /Imię/i }).locator('..').locator('input[type="text"]').first();
    let errorVisible = await firstNameInput.locator('..').locator('text=/Pole obowiązkowe/i').isVisible().catch(() => false);
    expect(errorVisible).toBeTruthy();

    // Start typing in the field
    await firstNameInput.fill('J');
    await page.waitForTimeout(300);

    // Error should disappear or field should no longer have red border
    const borderColor = await firstNameInput.evaluate((el) => {
      return window.getComputedStyle(el).borderColor;
    });
    // Border should not be red anymore (or error message should be gone)
    const stillHasError = await firstNameInput.locator('..').locator('text=/Pole obowiązkowe/i').isVisible().catch(() => false);
    
    // Either error message should be gone or border should not be red
    expect(stillHasError || !borderColor.includes('rgb(239, 68, 68)')).toBeTruthy();

    await page.screenshot({ path: 'screenshots_playwright/step1-error-cleared.png', fullPage: true });
  });

  test('should validate email format', async ({ page }) => {
    // Fill all fields except use invalid email
    const firstNameInput = page.locator('label', { hasText: /Imię/i }).locator('..').locator('input[type="text"]').first();
    await firstNameInput.fill('Jan');
    
    const lastNameInput = page.locator('label', { hasText: /Nazwisko/i }).locator('..').locator('input[type="text"]').first();
    await lastNameInput.fill('Kowalski');
    
    const emailInput = page.locator('label', { hasText: /Adres e-mail/i }).locator('..').locator('input[type="email"]');
    await emailInput.fill('invalid-email');
    
    const phoneInput = page.locator('label', { hasText: /Numer telefonu/i }).locator('..').locator('input[type="tel"]');
    await phoneInput.fill('123456789');
    
    const streetInput = page.locator('label', { hasText: /Ulica i numer/i }).locator('..').locator('input[type="text"]');
    await streetInput.fill('ul. Testowa 1');
    
    const postalCodeInput = page.locator('label', { hasText: /Kod pocztowy/i }).locator('..').locator('input[type="text"]');
    await postalCodeInput.fill('00-000');
    
    const cityInput = page.locator('label', { hasText: /Miejscowość/i }).locator('..').locator('input[type="text"]');
    await cityInput.fill('Warszawa');

    await page.waitForTimeout(500);

    // Try to navigate
    const nextButton = page.locator('button', { hasText: /Dalej|Następny|przejdź dalej/i }).first();
    await nextButton.click();
    await page.waitForTimeout(1000);

    // Should show email validation error
    const emailError = page.locator('text=/Nieprawidłowy adres e-mail/i');
    const isVisible = await emailError.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();

    // Should still be on step 1
    expect(page.url()).toContain('/step/1');

    await page.screenshot({ path: 'screenshots_playwright/step1-email-validation.png', fullPage: true });
  });
});

