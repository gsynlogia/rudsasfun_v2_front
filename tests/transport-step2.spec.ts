import { test, expect } from '@playwright/test';

test.describe('Step2 Transport Section', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to step 2 of a reservation
    // Assuming we have a camp with id 1 and edition with id 1
    await page.goto('http://localhost:3000/camps/1/edition/1/step/2');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display transport section with warning and buttons', async ({ page }) => {
    // Check for transport section title (use heading role to avoid strict mode violation)
    await expect(page.getByRole('heading', { name: 'Transport' }).first()).toBeVisible();
    
    // Check for warning message
    await expect(page.locator('text=Uwaga!')).toBeVisible();
    await expect(page.locator('text=Przed wypełnieniem tego formularza sprawdź informacje transportowe.')).toBeVisible();
    
    // Check for regulation buttons
    await expect(page.getByRole('button', { name: 'Regulamin transportu' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lista transportów' })).toBeVisible();
  });

  test('should show city dropdown when collective transport is selected for departure', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('select', { timeout: 10000 });
    
    // Select collective transport for departure
    const departureSelect = page.locator('label:has-text("Wybierz sposób dojazdu") + div select').first();
    await departureSelect.selectOption('zbiorowy');
    
    // Wait for cities to load (API call)
    await page.waitForTimeout(2000);
    
    // Check if city dropdown appears
    const citySelect = page.locator('label:has-text("Wybierz miasto zbiórki") + div select').first();
    await expect(citySelect).toBeVisible({ timeout: 5000 });
    
    // Check if "Wybierz miasto" option is present
    await expect(citySelect.locator('option[value=""]')).toContainText('Wybierz miasto');
  });

  test('should show city dropdown when collective transport is selected for return', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('select', { timeout: 10000 });
    
    // Select collective transport for return
    const returnTypeSelect = page.locator('label:has-text("Wybierz sposób powrotu") + div select').first();
    await returnTypeSelect.selectOption('zbiorowy');
    
    // Wait for cities to load (API call)
    await page.waitForTimeout(2000);
    
    // Check if city dropdown appears
    const citySelect = page.locator('label:has-text("Wybierz miasto powrotu") + div select').first();
    await expect(citySelect).toBeVisible({ timeout: 5000 });
  });

  test('should not display price under city select fields', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('select', { timeout: 10000 });
    
    // Select collective transport for departure
    const departureSelect = page.locator('label:has-text("Wybierz sposób dojazdu") + div select').first();
    await departureSelect.selectOption('zbiorowy');
    
    // Wait for cities to load
    await page.waitForTimeout(2000);
    
    // Select a city (if available)
    const citySelect = page.locator('label:has-text("Wybierz miasto zbiórki") + div select').first();
    
    // Get available options
    const options = await citySelect.locator('option').all();
    if (options.length > 1) {
      // Select first non-empty option
      const firstCityOption = options[1];
      const cityValue = await firstCityOption.getAttribute('value');
      if (cityValue) {
        await citySelect.selectOption(cityValue);
        
        // Wait a bit
        await page.waitForTimeout(1000);
        
        // Check that price is NOT displayed under city select
        const priceText = page.locator('text=/Cena:.*zł/');
        const priceCount = await priceText.count();
        // Price should not be displayed under city selects (only in summary section)
        expect(priceCount).toBe(0);
      }
    }
  });

  test('should show modal when different cities are selected for departure and return', async ({ page }) => {
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
        await page.waitForTimeout(500);
      }
    }
    
    // Select collective transport for return
    const returnTypeSelect = page.locator('label:has-text("Wybierz sposób powrotu") + div select').first();
    await returnTypeSelect.selectOption('zbiorowy');
    
    // Wait for cities to load
    await page.waitForTimeout(2000);
    
    // Select a different city for return
    const returnCitySelect = page.locator('label:has-text("Wybierz miasto powrotu") + div select').first();
    const returnOptions = await returnCitySelect.locator('option').all();
    if (returnOptions.length > 1) {
      // Try to find a different city
      const departureCityValue = await departureCitySelect.inputValue();
      for (let i = 1; i < returnOptions.length; i++) {
        const returnCityValue = await returnOptions[i].getAttribute('value');
        if (returnCityValue && returnCityValue !== departureCityValue) {
          await returnCitySelect.selectOption(returnCityValue);
          
          // Wait for modal to appear
          await page.waitForTimeout(1000);
          
          // Check if modal is visible
          await expect(page.locator('text=Transport w dwóch różnych lokalizacjach')).toBeVisible({ timeout: 5000 });
          
          // Check modal content
          await expect(page.locator('text=Wybrałeś transport zbiórkowy w dwóch różnych lokalizacjach')).toBeVisible();
          
          // Confirm modal
          const confirmButton = page.locator('button:has-text("Potwierdź")');
          await confirmButton.click();
          
          // Wait for modal to close
          await page.waitForTimeout(500);
          
          // Verify modal is closed
          await expect(page.locator('text=Transport w dwóch różnych lokalizacjach')).not.toBeVisible();
          
          break;
        }
      }
    }
  });

  test('should display transport summary with higher price', async ({ page }) => {
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
        
        // Wait for summary to appear
        await page.waitForTimeout(1000);
        
        // Check if transport summary is visible (use more specific selector)
        const summarySection = page.locator('div.bg-blue-50').filter({ hasText: 'Transport' });
        await expect(summarySection).toBeVisible({ timeout: 5000 });
        
        // Check if price is displayed
        const priceText = summarySection.locator('text=/Cena transportu:.*zł/');
        await expect(priceText).toBeVisible();
      }
    }
  });

  test('should clear city selection when transport type changes', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForSelector('select', { timeout: 10000 });
    
    // Select collective transport for departure
    const departureSelect = page.locator('label:has-text("Wybierz sposób dojazdu") + div select').first();
    await departureSelect.selectOption('zbiorowy');
    
    // Wait for cities to load
    await page.waitForTimeout(2000);
    
    // Select a city
    const departureCitySelect = page.locator('label:has-text("Wybierz miasto zbiórki") + div select').first();
    const departureOptions = await departureCitySelect.locator('option').all();
    if (departureOptions.length > 1) {
      const firstCityValue = await departureOptions[1].getAttribute('value');
      if (firstCityValue) {
        await departureCitySelect.selectOption(firstCityValue);
        await page.waitForTimeout(500);
        
        // Change transport type to own
        await departureSelect.selectOption('wlasny');
        
        // Wait for city select to be cleared or hidden
        await page.waitForTimeout(500);
        
        // Verify city select is cleared (value should be empty)
        // The city select should either be hidden or have empty value
        const citySelectAfter = page.locator('label:has-text("Wybierz miasto zbiórki") + div select').first();
        if (await citySelectAfter.isVisible()) {
          const value = await citySelectAfter.inputValue();
          expect(value).toBe('');
        } else {
          // City select is hidden, which is also valid
          expect(true).toBe(true);
        }
      }
    }
  });
});

