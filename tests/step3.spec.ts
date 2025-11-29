import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Step 3 - Faktury', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Navigate to Step 3 by clicking on step 3 in the progress bar
    // The progress bar has buttons with aria-label containing step number
    const step3Button = page.locator('button[aria-label*="kroku 3"]').first();
    await step3Button.waitFor({ state: 'visible', timeout: 5000 });
    await step3Button.click();
    
    // Wait for Step 3 to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('should display Step 3 with all sections', async ({ page }) => {
    // Take screenshot of initial state
    await page.screenshot({ 
      path: 'screenshots_playwright/step3-initial.png',
      fullPage: true 
    });

    // Check if Invoice Type Section is visible
    await expect(page.locator('text=Typ faktury')).toBeVisible();
    
    // Check if Invoice Data Section is visible
    await expect(page.locator('text=Dane do faktury')).toBeVisible();
    
    // Check if Invoice Delivery Section is visible
    await expect(page.locator('text=Wysyłka faktury')).toBeVisible();
  });

  test('should allow selecting invoice type (private person)', async ({ page }) => {
    // Click on "Osoba prywatna" option
    const privateOption = page.locator('button:has-text("Osoba prywatna")').first();
    await expect(privateOption).toBeVisible();
    await privateOption.click();
    
    // Wait for state to update
    await page.waitForTimeout(500);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'screenshots_playwright/step3-private-selected.png',
      fullPage: true 
    });

    // Verify private person form fields are visible
    await expect(page.locator('input[placeholder="Imię"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Nazwisko"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Adres e-mail"]')).toBeVisible();
  });

  test('should allow selecting invoice type (company)', async ({ page }) => {
    // Click on "Firma" option
    const companyOption = page.locator('button:has-text("Firma")').first();
    await expect(companyOption).toBeVisible();
    await companyOption.click();
    
    // Wait for state to update
    await page.waitForTimeout(500);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'screenshots_playwright/step3-company-selected.png',
      fullPage: true 
    });

    // Verify company form fields are visible
    await expect(page.locator('input[placeholder="Nazwa firmy"]')).toBeVisible();
    await expect(page.locator('input[placeholder="NIP"]')).toBeVisible();
  });

  test('should fill private person invoice data', async ({ page }) => {
    // Select private person if not already selected
    const privateOption = page.locator('button:has-text("Osoba prywatna")').first();
    if (await privateOption.isVisible()) {
      await privateOption.click();
      await page.waitForTimeout(300);
    }

    // Fill in private person data
    await page.fill('input[placeholder="Imię"]', 'Jan');
    await page.fill('input[placeholder="Nazwisko"]', 'Kowalski');
    await page.fill('input[placeholder="Adres e-mail"]', 'jan.kowalski@example.com');
    await page.fill('input[placeholder="+48"]', '+48123456789');
    await page.fill('input[placeholder="Ulica i numer budynku/mieszkania"]', 'ul. Testowa 1');
    await page.fill('input[placeholder="np. 00-000"]', '00-001');
    await page.fill('input[placeholder="Miejscowość"]', 'Warszawa');

    // Take screenshot
    await page.screenshot({ 
      path: 'screenshots_playwright/step3-private-filled.png',
      fullPage: true 
    });

    // Verify data is saved (check sessionStorage)
    const sessionStorage = await page.evaluate(() => {
      return JSON.parse(sessionStorage.getItem('radsasfun_step3_form_data') || '{}');
    });
    
    expect(sessionStorage.privateData.firstName).toBe('Jan');
    expect(sessionStorage.privateData.lastName).toBe('Kowalski');
  });

  test('should fill company invoice data', async ({ page }) => {
    // Select company option
    const companyOption = page.locator('button:has-text("Firma")').first();
    await companyOption.click();
    await page.waitForTimeout(500);

    // Fill in company data (no email and phone for company)
    await page.fill('input[placeholder="Nazwa firmy"]', 'Test Sp. z o.o.');
    await page.fill('input[placeholder="NIP"]', '1234567890');
    await page.fill('input[placeholder="Ulica i numer budynku/mieszkania"]', 'ul. Firmowa 10');
    await page.fill('input[placeholder="np. 00-000"]', '00-002');
    await page.fill('input[placeholder="Miejscowość"]', 'Kraków');

    // Take screenshot
    await page.screenshot({ 
      path: 'screenshots_playwright/step3-company-filled.png',
      fullPage: true 
    });

    // Verify data is saved
    const sessionStorage = await page.evaluate(() => {
      return JSON.parse(sessionStorage.getItem('radsasfun_step3_form_data') || '{}');
    });
    
    expect(sessionStorage.companyData.companyName).toBe('Test Sp. z o.o.');
    expect(sessionStorage.companyData.nip).toBe('1234567890');
  });

  test('should allow selecting electronic invoice delivery', async ({ page }) => {
    // Scroll to delivery section
    await page.locator('text=Wysyłka faktury').scrollIntoViewIfNeeded();
    
    // Click on electronic option
    const electronicOption = page.locator('button:has-text("Wersja elektroniczna")').first();
    await expect(electronicOption).toBeVisible();
    await electronicOption.click();
    
    await page.waitForTimeout(300);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'screenshots_playwright/step3-electronic-delivery.png',
      fullPage: true 
    });

    // Verify electronic is selected
    const sessionStorage = await page.evaluate(() => {
      return JSON.parse(sessionStorage.getItem('radsasfun_step3_form_data') || '{}');
    });
    
    expect(sessionStorage.deliveryType).toBe('electronic');
  });

  test('should allow selecting paper invoice delivery with different address', async ({ page }) => {
    // Scroll to delivery section
    await page.locator('text=Wysyłka faktury').scrollIntoViewIfNeeded();
    
    // Click on paper option
    const paperOption = page.locator('button:has-text("Wersja papierowa")').first();
    await expect(paperOption).toBeVisible();
    await paperOption.click();
    
    await page.waitForTimeout(300);
    
    // Check "different address" checkbox
    const differentAddressCheckbox = page.locator('input[type="checkbox"]').filter({ 
      hasText: 'Wysłać na inny adres niż na fakturze' 
    }).first();
    
    // Find checkbox by label text
    const checkboxLabel = page.locator('label:has-text("Wysłać na inny adres niż na fakturze")');
    const checkbox = checkboxLabel.locator('input[type="checkbox"]');
    
    await checkbox.check();
    await page.waitForTimeout(300);
    
    // Fill in different address
    const addressInputs = page.locator('input[placeholder="Ulica i numer budynku/mieszkania"]');
    const addressInput = addressInputs.nth(1); // Second input (delivery address)
    
    if (await addressInput.isVisible()) {
      await addressInput.fill('ul. Dostawcza 5');
      
      const postalCodeInputs = page.locator('input[placeholder="np. 00-000"]');
      const postalCodeInput = postalCodeInputs.nth(1);
      if (await postalCodeInput.isVisible()) {
        await postalCodeInput.fill('00-003');
      }
      
      const cityInputs = page.locator('input[placeholder="Miejscowość"]');
      const cityInput = cityInputs.nth(1);
      if (await cityInput.isVisible()) {
        await cityInput.fill('Gdańsk');
      }
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: 'screenshots_playwright/step3-paper-different-address.png',
      fullPage: true 
    });

    // Verify data is saved
    const sessionStorage = await page.evaluate(() => {
      return JSON.parse(sessionStorage.getItem('radsasfun_step3_form_data') || '{}');
    });
    
    expect(sessionStorage.deliveryType).toBe('paper');
    expect(sessionStorage.differentAddress).toBe(true);
  });

  test('should persist data in sessionStorage', async ({ page }) => {
    // Fill in some data
    const privateOption = page.locator('button:has-text("Osoba prywatna")').first();
    await privateOption.click();
    await page.waitForTimeout(500);
    
    // Wait for form to be visible
    await page.waitForSelector('input[placeholder="Imię"]', { state: 'visible' });
    
    await page.fill('input[placeholder="Imię"]', 'Test');
    await page.waitForTimeout(500);
    
    // Verify data is saved before reload
    const sessionStorageBefore = await page.evaluate(() => {
      return JSON.parse(sessionStorage.getItem('radsasfun_step3_form_data') || '{}');
    });
    expect(sessionStorageBefore.privateData?.firstName).toBe('Test');
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Navigate back to Step 3
    const step3Button = page.locator('button[aria-label*="kroku 3"]').first();
    await step3Button.waitFor({ state: 'visible', timeout: 5000 });
    await step3Button.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Wait for form to be visible and data to load
    await page.waitForSelector('input[placeholder="Imię"]', { state: 'visible' });
    await page.waitForTimeout(500);
    
    // Verify data is restored
    const firstNameValue = await page.locator('input[placeholder="Imię"]').inputValue();
    expect(firstNameValue).toBe('Test');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'screenshots_playwright/step3-persisted-data.png',
      fullPage: true 
    });
  });
});

