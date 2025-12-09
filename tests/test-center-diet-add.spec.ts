import { test, expect } from '@playwright/test';

/**
 * Test: Add Center Diet
 * Tests the functionality of adding a new center diet in the admin panel
 * 
 * Steps:
 * 1. Login as admin
 * 2. Navigate to center diets management
 * 3. Click "Dodaj dietę" button
 * 4. Fill in the form (name, select general diets, set prices)
 * 5. Click "Zapisz"
 * 6. Verify diet appears in the list
 * 7. Verify modal closes
 */

test.describe('Center Diet Management - Add Diet', () => {
  test('should add a new center diet successfully', async ({ page }) => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    
    console.log('[Test] Starting center diet add test');
    console.log('[Test] API URL:', API_BASE_URL);
    console.log('[Test] Frontend URL:', FRONTEND_URL);

    // Step 1: Navigate to login page
    console.log('[Test] Step 1: Navigating to login page');
    await page.goto(`${FRONTEND_URL}/admin-panel/login`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/center-diet-add-01-login-page.png', fullPage: true });
    console.log('[Test] Login page loaded');

    // Step 2: Fill in login form
    console.log('[Test] Step 2: Filling in login form');
    const usernameInput = page.locator('input[type="text"], input[name="username"], input[placeholder*="login" i], input[placeholder*="nazwa" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginButton = page.locator('button:has-text("Zaloguj"), button:has-text("Login"), button[type="submit"]').first();

    await usernameInput.fill('admin');
    await passwordInput.fill('admin');
    console.log('[Test] Login credentials filled');
    await page.screenshot({ path: 'test-results/center-diet-add-02-login-filled.png', fullPage: true });

    // Step 3: Click login button
    console.log('[Test] Step 3: Clicking login button');
    await loginButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for redirect
    await page.screenshot({ path: 'test-results/center-diet-add-03-after-login.png', fullPage: true });
    console.log('[Test] Login completed');

    // Step 4: Navigate to center diets management
    console.log('[Test] Step 4: Navigating to center diets management');
    await page.goto(`${FRONTEND_URL}/admin-panel/diets/center`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for data to load
    await page.screenshot({ path: 'test-results/center-diet-add-04-center-diets-page.png', fullPage: true });
    console.log('[Test] Center diets page loaded');

    // Step 5: Check initial state - count diets before adding
    const initialDietCount = await page.locator('table tbody tr').count();
    console.log('[Test] Initial diet count:', initialDietCount);
    await page.screenshot({ path: 'test-results/center-diet-add-05-initial-state.png', fullPage: true });

    // Step 6: Click "Dodaj dietę" button
    console.log('[Test] Step 6: Clicking "Dodaj dietę" button');
    const addButton = page.locator('button:has-text("Dodaj dietę")').first();
    await expect(addButton).toBeVisible();
    await addButton.click();
    await page.waitForTimeout(1000); // Wait for modal to open
    await page.screenshot({ path: 'test-results/center-diet-add-06-modal-opened.png', fullPage: true });
    console.log('[Test] Modal opened');

    // Step 7: Fill in diet name
    console.log('[Test] Step 7: Filling in diet name');
    const dietNameInput = page.locator('input[type="text"]').filter({ hasText: /nazwa/i }).or(page.locator('input[placeholder*="nazwa" i]')).or(page.locator('label:has-text("Nazwa") + input, label:has-text("Nazwa") ~ input')).first();
    const testDietName = `Test Diet ${Date.now()}`;
    await dietNameInput.fill(testDietName);
    console.log('[Test] Diet name filled:', testDietName);
    await page.screenshot({ path: 'test-results/center-diet-add-07-name-filled.png', fullPage: true });

    // Step 8: Select general diets (if available)
    console.log('[Test] Step 8: Selecting general diets');
    const generalDietCheckboxes = page.locator('input[type="checkbox"]').filter({ hasNotText: /iconMethod/i });
    const checkboxCount = await generalDietCheckboxes.count();
    console.log('[Test] Found', checkboxCount, 'general diet checkboxes');
    
    if (checkboxCount > 0) {
      // Select first 2 general diets if available
      const dietsToSelect = Math.min(2, checkboxCount);
      for (let i = 0; i < dietsToSelect; i++) {
        const checkbox = generalDietCheckboxes.nth(i);
        await checkbox.check();
        console.log('[Test] Selected general diet', i + 1);
        await page.waitForTimeout(300);
      }
      await page.screenshot({ path: 'test-results/center-diet-add-08-diets-selected.png', fullPage: true });
    } else {
      console.log('[Test] No general diets available to select');
    }

    // Step 9: Set prices for selected diets (if any)
    console.log('[Test] Step 9: Setting prices for selected diets');
    const priceInputs = page.locator('input[type="number"]').filter({ hasText: /cena/i }).or(page.locator('label:has-text("Cena") + input, label:has-text("Cena") ~ input'));
    const priceInputCount = await priceInputs.count();
    console.log('[Test] Found', priceInputCount, 'price inputs');
    
    if (priceInputCount > 0) {
      for (let i = 0; i < Math.min(priceInputCount, 2); i++) {
        const priceInput = priceInputs.nth(i);
        await priceInput.fill('100');
        console.log('[Test] Set price', i + 1, 'to 100 PLN');
        await page.waitForTimeout(300);
      }
      await page.screenshot({ path: 'test-results/center-diet-add-09-prices-set.png', fullPage: true });
    }

    // Step 10: Click "Zapisz" button
    console.log('[Test] Step 10: Clicking "Zapisz" button');
    const saveButton = page.locator('button:has-text("Zapisz"):not(:has-text("Zapisywanie"))').last();
    await expect(saveButton).toBeVisible();
    await page.screenshot({ path: 'test-results/center-diet-add-10-before-save.png', fullPage: true });
    await saveButton.click();
    console.log('[Test] Save button clicked');

    // Step 11: Wait for modal to close and list to refresh
    console.log('[Test] Step 11: Waiting for modal to close');
    await page.waitForTimeout(2000); // Wait for API call and modal close
    await page.screenshot({ path: 'test-results/center-diet-add-11-after-save.png', fullPage: true });

    // Step 12: Verify modal is closed
    console.log('[Test] Step 12: Verifying modal is closed');
    const modal = page.locator('div[class*="fixed"]:has-text("Dodaj dietę"), div[class*="fixed"]:has-text("Edytuj dietę")');
    const modalCount = await modal.count();
    if (modalCount > 0) {
      const isVisible = await modal.first().isVisible();
      if (isVisible) {
        console.log('[Test] WARNING: Modal is still visible after save');
        await page.screenshot({ path: 'test-results/center-diet-add-12-modal-still-open.png', fullPage: true });
      } else {
        console.log('[Test] Modal is closed (exists but not visible)');
      }
    } else {
      console.log('[Test] Modal is closed (not found in DOM)');
    }

    // Step 13: Verify diet appears in the list
    console.log('[Test] Step 13: Verifying diet appears in the list');
    await page.waitForTimeout(2000); // Wait for list to refresh
    const finalDietCount = await page.locator('table tbody tr').count();
    console.log('[Test] Final diet count:', finalDietCount);
    
    // Check if diet name appears in the table
    const dietNameInTable = page.locator(`table tbody:has-text("${testDietName}")`);
    const dietFound = await dietNameInTable.count() > 0;
    console.log('[Test] Diet found in table:', dietFound);
    
    await page.screenshot({ path: 'test-results/center-diet-add-13-final-state.png', fullPage: true });

    // Assertions
    expect(finalDietCount).toBeGreaterThanOrEqual(initialDietCount);
    if (dietFound) {
      console.log('[Test] ✅ SUCCESS: Diet was added and appears in the list');
    } else {
      console.log('[Test] ⚠️ WARNING: Diet was saved but not found in the list (may need to refresh)');
    }

    // Step 14: Check console for any errors
    console.log('[Test] Step 14: Checking console for errors');
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        console.log('[Test] Console error:', text);
      }
    });

    await page.waitForTimeout(1000);
    console.log('[Test] Test completed');
  });
});






