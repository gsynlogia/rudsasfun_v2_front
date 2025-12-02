import { test, expect } from '@playwright/test';

test.describe('Payment Integration - Step 5', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Navigate to a camp reservation page with Step 5
    // Using a test camp and edition ID - adjust if needed
    await page.goto(`${baseURL}/camps/1/edition/1/step/5`, { 
      waitUntil: 'domcontentloaded', 
      timeout: 20000 
    });
    
    // Wait for React to hydrate
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
  });

  test('should display payment summary and options', async ({ page }) => {
    // Check for summary section
    await expect(page.locator('h2', { hasText: 'Podsumowanie rezerwacji' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h2', { hasText: 'Płatność' })).toBeVisible({ timeout: 10000 });
    
    // Check for payment amounts - use more specific selectors
    await expect(page.locator('text=/Koszt całkowity/i')).toBeVisible({ timeout: 10000 });
    // "Zaliczka:" with colon to distinguish from radio button label
    await expect(page.locator('text=/Zaliczka:/i')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Pozostała kwota/i')).toBeVisible({ timeout: 10000 });
    
    // Check for "Pay Now" checkbox
    const payNowCheckbox = page.locator('input#payNow');
    await expect(payNowCheckbox).toBeVisible();
    
    await page.screenshot({ path: 'screenshots_playwright/step5-payment-initial.png', fullPage: true });
  });

  test('should enable payment options when "Pay Now" is checked', async ({ page }) => {
    // Check "Pay Now" checkbox
    const payNowCheckbox = page.locator('input#payNow');
    await expect(payNowCheckbox).toBeVisible();
    
    // Initially should be checked (default)
    const isChecked = await payNowCheckbox.isChecked();
    if (!isChecked) {
      await payNowCheckbox.click();
      await page.waitForTimeout(500);
    }
    
    // Payment options should be enabled
    const onlinePaymentRadio = page.locator('input#paymentOnline');
    const blikPaymentRadio = page.locator('input#paymentBlik');
    
    await expect(onlinePaymentRadio).toBeEnabled();
    await expect(blikPaymentRadio).toBeEnabled();
    
    // Payment amount options should be enabled
    const fullPaymentRadio = page.locator('input#paymentFull');
    const depositPaymentRadio = page.locator('input#paymentDeposit');
    
    await expect(fullPaymentRadio).toBeEnabled();
    await expect(depositPaymentRadio).toBeEnabled();
    
    await page.screenshot({ path: 'screenshots_playwright/step5-payment-options-enabled.png', fullPage: true });
  });

  test('should disable payment options when "Pay Now" is unchecked', async ({ page }) => {
    const payNowCheckbox = page.locator('input#payNow');
    await expect(payNowCheckbox).toBeVisible();
    
    // Uncheck "Pay Now"
    if (await payNowCheckbox.isChecked()) {
      await payNowCheckbox.click();
      await page.waitForTimeout(500);
    }
    
    // Payment options should be disabled
    const onlinePaymentRadio = page.locator('input#paymentOnline');
    const blikPaymentRadio = page.locator('input#paymentBlik');
    
    // Check if parent container has opacity-50 class (disabled state)
    const paymentOptionsContainer = page.locator('.opacity-50.pointer-events-none');
    await expect(paymentOptionsContainer).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ path: 'screenshots_playwright/step5-payment-options-disabled.png', fullPage: true });
  });

  test('should allow selecting payment method (online or BLIK)', async ({ page }) => {
    const payNowCheckbox = page.locator('input#payNow');
    await expect(payNowCheckbox).toBeVisible();
    
    // Ensure "Pay Now" is checked
    if (!(await payNowCheckbox.isChecked())) {
      await payNowCheckbox.click();
      await page.waitForTimeout(500);
    }
    
    // Select online payment
    const onlinePaymentRadio = page.locator('input#paymentOnline');
    await onlinePaymentRadio.click();
    await page.waitForTimeout(300);
    
    await expect(onlinePaymentRadio).toBeChecked();
    
    // Select BLIK payment
    const blikPaymentRadio = page.locator('input#paymentBlik');
    await blikPaymentRadio.click();
    await page.waitForTimeout(300);
    
    await expect(blikPaymentRadio).toBeChecked();
    await expect(onlinePaymentRadio).not.toBeChecked();
    
    await page.screenshot({ path: 'screenshots_playwright/step5-payment-method-selection.png', fullPage: true });
  });

  test('should allow selecting payment amount (full or deposit)', async ({ page }) => {
    const payNowCheckbox = page.locator('input#payNow');
    await expect(payNowCheckbox).toBeVisible();
    
    // Ensure "Pay Now" is checked
    if (!(await payNowCheckbox.isChecked())) {
      await payNowCheckbox.click();
      await page.waitForTimeout(500);
    }
    
    // Select full payment
    const fullPaymentRadio = page.locator('input#paymentFull');
    await fullPaymentRadio.click();
    await page.waitForTimeout(300);
    
    await expect(fullPaymentRadio).toBeChecked();
    
    // Select deposit payment
    const depositPaymentRadio = page.locator('input#paymentDeposit');
    await depositPaymentRadio.click();
    await page.waitForTimeout(300);
    
    await expect(depositPaymentRadio).toBeChecked();
    await expect(fullPaymentRadio).not.toBeChecked();
    
    await page.screenshot({ path: 'screenshots_playwright/step5-payment-amount-selection.png', fullPage: true });
  });

  test('should show "Pay Now" button when payment options are selected', async ({ page }) => {
    const payNowCheckbox = page.locator('input#payNow');
    await expect(payNowCheckbox).toBeVisible();
    
    // Ensure "Pay Now" is checked
    if (!(await payNowCheckbox.isChecked())) {
      await payNowCheckbox.click();
      await page.waitForTimeout(500);
    }
    
    // Select payment method and amount
    await page.locator('input#paymentOnline').click();
    await page.locator('input#paymentDeposit').click();
    await page.waitForTimeout(500);
    
    // Check for "Pay Now" button
    const payButton = page.locator('button', { hasText: 'Zapłać teraz' });
    await expect(payButton).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ path: 'screenshots_playwright/step5-pay-button-visible.png', fullPage: true });
  });

  test('should display validation error when trying to pay without selecting options', async ({ page }) => {
    const payNowCheckbox = page.locator('input#payNow');
    await expect(payNowCheckbox).toBeVisible();
    
    // Ensure "Pay Now" is checked
    if (!(await payNowCheckbox.isChecked())) {
      await payNowCheckbox.click();
      await page.waitForTimeout(500);
    }
    
    // Use JavaScript to clear the form data (radio buttons can't be truly unchecked)
    await page.evaluate(() => {
      // Clear sessionStorage for step5
      sessionStorage.removeItem('step5_form_data');
      // Trigger form reset by dispatching custom event
      window.dispatchEvent(new Event('storage'));
    });
    
    await page.waitForTimeout(500);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    // Ensure "Pay Now" is checked again after reload
    const payNowCheckboxAfterReload = page.locator('input#payNow');
    if (!(await payNowCheckboxAfterReload.isChecked())) {
      await payNowCheckboxAfterReload.click();
      await page.waitForTimeout(500);
    }
    
    // Check if button is disabled (which is the expected behavior when validation fails)
    const payButton = page.locator('button', { hasText: 'Zapłać teraz' });
    await expect(payButton).toBeVisible({ timeout: 5000 });
    
    // Try to click the button - it should either be disabled or show error
    const isDisabled = await payButton.isDisabled().catch(() => false);
    
    if (!isDisabled) {
      // If button is not disabled, click it and check for error message
      await payButton.click();
      await page.waitForTimeout(500);
      
      // Check for validation error message
      const errorMessage = page.locator('.bg-red-50 .text-red-700, .text-red-700');
      const errorVisible = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (!errorVisible) {
        throw new Error('Validation should prevent payment: button should be disabled or error message should be visible after click');
      }
    }
    
    await page.screenshot({ path: 'screenshots_playwright/step5-payment-validation-error.png', fullPage: true });
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.waitForLoadState('domcontentloaded');
    
    await expect(page.locator('h2', { hasText: 'Podsumowanie rezerwacji' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Płatność' })).toBeVisible();
    await expect(page.locator('input#payNow')).toBeVisible();
    
    await page.screenshot({ path: 'screenshots_playwright/step5-payment-mobile.png', fullPage: true });
  });

  test('should display payment summary with all reservation details', async ({ page }) => {
    // Check for all summary sections
    await expect(page.locator('text=/Dane rodzica/')).toBeVisible();
    await expect(page.locator('text=/Dane uczestnika/')).toBeVisible();
    await expect(page.locator('text=/Stan zdrowia uczestnika/')).toBeVisible();
    await expect(page.locator('text=/Dieta uczestnika/')).toBeVisible();
    
    await page.screenshot({ path: 'screenshots_playwright/step5-payment-summary-full.png', fullPage: true });
  });
});

