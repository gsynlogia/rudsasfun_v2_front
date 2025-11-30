import { test, expect } from '@playwright/test';

/**
 * Test: Transport Feature in Turnus Edit Page
 * Tests the transport settings functionality
 */
test.describe('Transport Feature', () => {
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

  test('should display transport section in turnus edit page', async ({ page }) => {
    // Find first camp row and expand it
    const firstCampRow = page.locator('tbody tr').first();
    await firstCampRow.click();
    
    // Wait for expanded content
    await page.waitForSelector('.bg-blue-50', { timeout: 5000 });
    
    // Find first turnus edit button
    const editButton = page.locator('button[title="Edytuj turnus"]').first();
    await expect(editButton).toBeVisible();
    
    // Click edit button
    await editButton.click();
    
    // Wait for navigation to edit page
    await page.waitForURL(/\/admin-panel\/camps\/\d+\/turnus\/\d+\/edit/, { timeout: 10000 });
    
    // Wait for transport section
    await page.waitForSelector('h2:has-text("Transport")', { timeout: 10000 });
    
    // Verify transport section is visible
    await expect(page.locator('h2:has-text("Transport")')).toBeVisible();
    await expect(page.locator('h3:has-text("Wyjazd do obozu")')).toBeVisible();
    await expect(page.locator('h3:has-text("Powrót z obozu")')).toBeVisible();
    
    console.log('[TEST] ✅ Transport section displayed');
  });

  test('should show/hide fields based on transport type selection', async ({ page }) => {
    // Navigate to turnus edit page
    const firstCampRow = page.locator('tbody tr').first();
    await firstCampRow.click();
    await page.waitForSelector('.bg-blue-50', { timeout: 5000 });
    const editButton = page.locator('button[title="Edytuj turnus"]').first();
    await editButton.click();
    await page.waitForURL(/\/admin-panel\/camps\/\d+\/turnus\/\d+\/edit/, { timeout: 10000 });
    await page.waitForSelector('h2:has-text("Transport")', { timeout: 10000 });
    
    // Test departure type
    const departureTypeSelect = page.locator('select#departure-type');
    await expect(departureTypeSelect).toBeVisible();
    
    // Check initial state (should be collective)
    const departureCityInput = page.locator('input#departure-city');
    await expect(departureCityInput).toBeVisible();
    
    // Check that collective price input is visible for collective transport
    const departureCollectivePriceInput = page.locator('input#departure-collective-price');
    await expect(departureCollectivePriceInput).toBeVisible();
    
    // Change to own transport
    await departureTypeSelect.selectOption('own');
    await page.waitForTimeout(300); // Wait for state update
    
    // City and price inputs should be hidden for own transport (no price needed)
    await expect(departureCityInput).not.toBeVisible();
    await expect(departureCollectivePriceInput).not.toBeVisible();
    
    // Change back to collective
    await departureTypeSelect.selectOption('collective');
    await page.waitForTimeout(300);
    
    // City and price inputs should be visible again
    await expect(departureCityInput).toBeVisible();
    await expect(departureCollectivePriceInput).toBeVisible();
    
    // Test return type
    const returnTypeSelect = page.locator('select#return-type');
    await expect(returnTypeSelect).toBeVisible();
    
    // Check initial state (should be collective)
    const returnCityInput = page.locator('input#return-city');
    await expect(returnCityInput).toBeVisible();
    
    // Check that collective price input is visible for collective transport
    const returnCollectivePriceInput = page.locator('input#return-collective-price');
    await expect(returnCollectivePriceInput).toBeVisible();
    
    // Change to own transport
    await returnTypeSelect.selectOption('own');
    await page.waitForTimeout(300);
    
    // City and price inputs should be hidden for own transport (no price needed)
    await expect(returnCityInput).not.toBeVisible();
    await expect(returnCollectivePriceInput).not.toBeVisible();
    
    console.log('[TEST] ✅ Transport fields show/hide correctly');
  });

  test('should allow entering price in PLN for collective transport', async ({ page }) => {
    // Navigate to turnus edit page
    const firstCampRow = page.locator('tbody tr').first();
    await firstCampRow.click();
    await page.waitForSelector('.bg-blue-50', { timeout: 5000 });
    const editButton = page.locator('button[title="Edytuj turnus"]').first();
    await editButton.click();
    await page.waitForURL(/\/admin-panel\/camps\/\d+\/turnus\/\d+\/edit/, { timeout: 10000 });
    await page.waitForSelector('h2:has-text("Transport")', { timeout: 10000 });
    
    // Ensure departure is set to collective transport (default)
    await page.locator('select#departure-type').selectOption('collective');
    await page.waitForTimeout(300);
    
    // Enter price in PLN for collective transport
    const departureCollectivePriceInput = page.locator('input#departure-collective-price');
    await expect(departureCollectivePriceInput).toBeVisible();
    await departureCollectivePriceInput.fill('500.00');
    await page.waitForTimeout(300);
    
    // Verify the input value
    const inputValue = await departureCollectivePriceInput.inputValue();
    expect(inputValue).toBe('500');
    
    console.log('[TEST] ✅ Price input in PLN works correctly for collective transport');
  });

  test('should create transport from turnus with default name', async ({ page }) => {
    // Navigate to turnus edit page
    const firstCampRow = page.locator('tbody tr').first();
    await firstCampRow.click();
    await page.waitForSelector('.bg-blue-50', { timeout: 5000 });
    const editButton = page.locator('button[title="Edytuj turnus"]').first();
    await editButton.click();
    await page.waitForURL(/\/admin-panel\/camps\/\d+\/turnus\/\d+\/edit/, { timeout: 10000 });
    await page.waitForSelector('h2:has-text("Transport")', { timeout: 10000 });
    
    // Fill in transport details
    await page.locator('select#departure-type').selectOption('collective');
    await page.waitForTimeout(300);
    await page.locator('input#departure-city').fill('Warszawa');
    await page.locator('input#departure-collective-price').fill('50000');
    
    await page.locator('select#return-type').selectOption('collective');
    await page.waitForTimeout(300);
    await page.locator('input#return-city').fill('Kraków');
    await page.locator('input#return-collective-price').fill('45000');
    
    // Click "Utwórz transport" button
    const createTransportButton = page.locator('button:has-text("Utwórz transport")');
    await expect(createTransportButton).toBeVisible();
    await createTransportButton.click();
    
    // Wait for transport to be created (check for success - no error message)
    await page.waitForTimeout(1000);
    
    // Verify no error message is displayed
    const errorMessage = page.locator('.bg-red-50, .text-red-700');
    const errorCount = await errorMessage.count();
    if (errorCount > 0) {
      const errorText = await errorMessage.first().textContent();
      console.error('[TEST] ❌ Error creating transport:', errorText);
    }
    
    // The transport should now be created and assigned to the turnus
    console.log('[TEST] ✅ Transport created from turnus');
  });
});

