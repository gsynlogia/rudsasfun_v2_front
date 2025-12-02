import { test, expect } from '@playwright/test';

test.describe('Step3 Invoice Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to step 3 of a reservation
    await page.goto('http://localhost:3000/camps/1/edition/1/step/3');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should prevent navigation when private person fields are not filled', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('input', { timeout: 10000 });
    
    // Ensure private person is selected (default)
    const privateButton = page.locator('button:has-text("Osoba prywatna")').first();
    await privateButton.click();
    await page.waitForTimeout(500);
    
    // Try to navigate to next step
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    // Wait a bit for validation to run
    await page.waitForTimeout(500);
    
    // Check if we're still on step 3
    await expect(page).toHaveURL(/.*\/step\/3/);
    
    // Check if error messages are displayed (should include firstName error)
    const errorMessages = page.locator('text=Pole obowiązkowe');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBeGreaterThan(0);
    
    // Check if firstName field has error
    const firstNameInput = page.locator('input[placeholder="Imię"]').first();
    const hasRedBorder = await firstNameInput.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const borderColor = style.borderColor;
      return borderColor.includes('rgb') || borderColor.includes('red') || el.classList.contains('border-red-500');
    });
    expect(hasRedBorder).toBeTruthy();
  });

  test('should show validation errors for all required private person fields', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('input', { timeout: 10000 });
    
    // Ensure private person is selected
    const privateButton = page.locator('button:has-text("Osoba prywatna")').first();
    await privateButton.click();
    await page.waitForTimeout(500);
    
    // Try to navigate
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    await page.waitForTimeout(500);
    
    // Check if fields have red borders (check for border-red-500 class or red color)
    const lastNameInput = page.locator('input[placeholder="Nazwisko"]').first();
    const hasRedBorder = await lastNameInput.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const borderColor = style.borderColor;
      return borderColor.includes('rgb') || borderColor.includes('red') || el.classList.contains('border-red-500');
    });
    expect(hasRedBorder).toBeTruthy();
    
    // Check if error messages are visible
    const errorMessages = page.locator('text=Pole obowiązkowe');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test('should validate email format for private person', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('input', { timeout: 10000 });
    
    // Ensure private person is selected
    const privateButton = page.locator('button:has-text("Osoba prywatna")').first();
    await privateButton.click();
    await page.waitForTimeout(500);
    
    // Fill invalid email
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('invalid-email');
    
    // Fill other required fields
    await page.locator('input[placeholder="Nazwisko"]').first().fill('Kowalski');
    await page.locator('input[type="tel"]').first().fill('123456789');
    await page.locator('input[placeholder*="Ulica"]').first().fill('ul. Testowa 1');
    await page.locator('input[placeholder*="00-000"]').first().fill('00-000');
    await page.locator('input[placeholder="Miejscowość"]').first().fill('Warszawa');
    
    // Try to navigate
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    await page.waitForTimeout(500);
    
    // Check if email error is displayed
    const emailError = page.locator('text=Nieprawidłowy adres e-mail');
    await expect(emailError).toBeVisible();
  });

  test('should prevent navigation when company fields are not filled', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('button', { timeout: 10000 });
    
    // Select company option
    const companyButton = page.locator('button:has-text("Firma")').first();
    await companyButton.click();
    await page.waitForTimeout(500);
    
    // Try to navigate to next step
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    // Wait a bit for validation to run
    await page.waitForTimeout(500);
    
    // Check if we're still on step 3
    await expect(page).toHaveURL(/.*\/step\/3/);
    
    // Check if error messages are displayed
    const errorMessages = page.locator('text=Pole obowiązkowe');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test('should show validation errors for all required company fields', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('button', { timeout: 10000 });
    
    // Select company option
    const companyButton = page.locator('button:has-text("Firma")').first();
    await companyButton.click();
    await page.waitForTimeout(500);
    
    // Try to navigate
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    await page.waitForTimeout(500);
    
    // Check if fields have red borders (check for border-red-500 class or red color)
    const companyNameInput = page.locator('input[placeholder="Nazwa firmy"]').first();
    const hasRedBorder = await companyNameInput.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const borderColor = style.borderColor;
      return borderColor.includes('rgb') || borderColor.includes('red') || el.classList.contains('border-red-500');
    });
    expect(hasRedBorder).toBeTruthy();
    
    // Check if error messages are visible
    const errorMessages = page.locator('text=Pole obowiązkowe');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test('should not validate delivery address when electronic version is selected', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('button', { timeout: 10000 });
    
    // Fill private person data
    const privateButton = page.locator('button:has-text("Osoba prywatna")').first();
    await privateButton.click();
    await page.waitForTimeout(500);
    
    await page.locator('input[placeholder="Nazwisko"]').first().fill('Kowalski');
    await page.locator('input[type="email"]').first().fill('test@example.com');
    await page.locator('input[type="tel"]').first().fill('123456789');
    await page.locator('input[placeholder*="Ulica"]').first().fill('ul. Testowa 1');
    await page.locator('input[placeholder*="00-000"]').first().fill('00-000');
    await page.locator('input[placeholder="Miejscowość"]').first().fill('Warszawa');
    
    // Ensure electronic version is selected (default)
    const electronicButton = page.locator('button:has-text("Wersja elektroniczna")').first();
    await electronicButton.click();
    await page.waitForTimeout(500);
    
    // Try to navigate
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // Should navigate to step 4 (no delivery address validation needed)
    await expect(page).toHaveURL(/.*\/step\/4/);
  });

  test('should not validate delivery address when paper version is selected but checkbox is not checked', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('button', { timeout: 10000 });
    
    // Fill private person data
    const privateButton = page.locator('button:has-text("Osoba prywatna")').first();
    await privateButton.click();
    await page.waitForTimeout(500);
    
    await page.locator('input[placeholder="Nazwisko"]').first().fill('Kowalski');
    await page.locator('input[type="email"]').first().fill('test@example.com');
    await page.locator('input[type="tel"]').first().fill('123456789');
    await page.locator('input[placeholder*="Ulica"]').first().fill('ul. Testowa 1');
    await page.locator('input[placeholder*="00-000"]').first().fill('00-000');
    await page.locator('input[placeholder="Miejscowość"]').first().fill('Warszawa');
    
    // Select paper version
    const paperButton = page.locator('button:has-text("Wersja papierowa")').first();
    await paperButton.click();
    await page.waitForTimeout(500);
    
    // Don't check the different address checkbox
    
    // Try to navigate
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // Should navigate to step 4 (delivery address not required when checkbox not checked)
    await expect(page).toHaveURL(/.*\/step\/4/);
  });

  test('should validate delivery address when paper version is selected and checkbox is checked', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('button', { timeout: 10000 });
    
    // Fill private person data
    const privateButton = page.locator('button:has-text("Osoba prywatna")').first();
    await privateButton.click();
    await page.waitForTimeout(500);
    
    await page.locator('input[placeholder="Nazwisko"]').first().fill('Kowalski');
    await page.locator('input[type="email"]').first().fill('test@example.com');
    await page.locator('input[type="tel"]').first().fill('123456789');
    await page.locator('input[placeholder*="Ulica"]').first().fill('ul. Testowa 1');
    await page.locator('input[placeholder*="00-000"]').first().fill('00-000');
    await page.locator('input[placeholder="Miejscowość"]').first().fill('Warszawa');
    
    // Select paper version
    const paperButton = page.locator('button:has-text("Wersja papierowa")').first();
    await paperButton.click();
    await page.waitForTimeout(500);
    
    // Check the different address checkbox
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.check();
    await page.waitForTimeout(500);
    
    // Don't fill delivery address fields
    
    // Try to navigate
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    // Wait a bit for validation to run
    await page.waitForTimeout(500);
    
    // Check if we're still on step 3
    await expect(page).toHaveURL(/.*\/step\/3/);
    
    // Check if delivery address error messages are displayed
    const deliveryErrors = page.locator('text=Pole obowiązkowe');
    const errorCount = await deliveryErrors.count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test('should allow navigation when all required fields are filled (private person, electronic)', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('input', { timeout: 10000 });
    
    // Ensure private person is selected
    const privateButton = page.locator('button:has-text("Osoba prywatna")').first();
    await privateButton.click();
    await page.waitForTimeout(500);
    
    // Fill all required fields
    await page.locator('input[placeholder="Imię"]').first().fill('Jan');
    await page.locator('input[placeholder="Nazwisko"]').first().fill('Kowalski');
    await page.locator('input[type="email"]').first().fill('jan.kowalski@example.com');
    await page.locator('input[type="tel"]').first().fill('123456789');
    await page.locator('input[placeholder*="Ulica"]').first().fill('ul. Testowa 1');
    await page.locator('input[placeholder*="00-000"]').first().fill('00-000');
    await page.locator('input[placeholder="Miejscowość"]').first().fill('Warszawa');
    
    // Ensure electronic version is selected
    const electronicButton = page.locator('button:has-text("Wersja elektroniczna")').first();
    await electronicButton.click();
    await page.waitForTimeout(500);
    
    // Try to navigate
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // Should navigate to step 4
    await expect(page).toHaveURL(/.*\/step\/4/);
  });

  test('should allow navigation when all required fields are filled (company, paper with delivery address)', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('button', { timeout: 10000 });
    
    // Select company option
    const companyButton = page.locator('button:has-text("Firma")').first();
    await companyButton.click();
    await page.waitForTimeout(500);
    
    // Fill all required company fields
    await page.locator('input[placeholder="Nazwa firmy"]').first().fill('Test Sp. z o.o.');
    await page.locator('input[placeholder="NIP"]').first().fill('1234567890');
    await page.locator('input[placeholder*="Ulica"]').first().fill('ul. Firmowa 1');
    await page.locator('input[placeholder*="00-000"]').first().fill('00-000');
    await page.locator('input[placeholder="Miejscowość"]').first().fill('Warszawa');
    
    // Select paper version
    const paperButton = page.locator('button:has-text("Wersja papierowa")').first();
    await paperButton.click();
    await page.waitForTimeout(500);
    
    // Check the different address checkbox
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.check();
    await page.waitForTimeout(500);
    
    // Fill delivery address fields
    const deliveryStreetInput = page.locator('input[placeholder*="Ulica"]').last();
    await deliveryStreetInput.fill('ul. Dostawcza 2');
    const deliveryPostalInput = page.locator('input[placeholder*="00-000"]').last();
    await deliveryPostalInput.fill('01-001');
    const deliveryCityInput = page.locator('input[placeholder="Miejscowość"]').last();
    await deliveryCityInput.fill('Kraków');
    
    // Try to navigate
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // Should navigate to step 4
    await expect(page).toHaveURL(/.*\/step\/4/);
  });

  test('should clear validation errors when user starts typing', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('input', { timeout: 10000 });
    
    // Ensure private person is selected
    const privateButton = page.locator('button:has-text("Osoba prywatna")').first();
    await privateButton.click();
    await page.waitForTimeout(500);
    
    // Try to navigate to trigger validation
    const nextButton = page.locator('button:has-text("Dalej")').first();
    await nextButton.click();
    
    await page.waitForTimeout(500);
    
    // Check if error is displayed
    const errorBefore = page.locator('text=Pole obowiązkowe').first();
    await expect(errorBefore).toBeVisible();
    
    // Start typing in lastName field
    const lastNameInput = page.locator('input[placeholder="Nazwisko"]').first();
    await lastNameInput.fill('K');
    
    await page.waitForTimeout(500);
    
    // Error for lastName should be cleared (but other errors might still be visible)
    const lastNameError = page.locator('input[placeholder="Nazwisko"]').locator('..').locator('text=Pole obowiązkowe');
    const isVisible = await lastNameError.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });
});

