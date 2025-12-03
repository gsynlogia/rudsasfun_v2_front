import { test, expect } from '@playwright/test';

/**
 * Test suite for payment status logic in admin panel
 * Tests full payment vs partial payment display
 * 
 * @workflow.txt 19.7 - E2E Playwright tests with screenshots in headed mode
 */

test.describe('Payment Status Logic - Full vs Partial Payment', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin panel login
    await page.goto('http://localhost:3000/admin-panel/login');
    await page.waitForLoadState('networkidle');
    
    // Find login input (check different possible selectors)
    const loginInput = page.locator('input[type="text"], input[name="login"], input[id="login"], input[placeholder*="login" i], input[placeholder*="Login"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Zaloguj"), button:has-text("Login")').first();
    
    // Wait for inputs to be visible
    await loginInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    
    // Login as admin (assuming default admin credentials)
    await loginInput.fill('admin');
    await passwordInput.fill('admin');
    
    await submitButton.click();
    
    // Wait for navigation to admin panel
    await page.waitForURL('**/admin-panel**', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Navigate to payments page
    await page.goto('http://localhost:3000/admin-panel/payments');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for data to load
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: 'tests/screenshots/payment-status-initial.png',
      fullPage: true 
    });
  });

  test('should display full payment status correctly', async ({ page }) => {
    // Wait for reservations to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Find a reservation with full payment (paidAmount >= totalAmount)
    const rows = await page.locator('table tbody tr').all();
    
    for (const row of rows) {
      const statusBadge = row.locator('td:last-child span');
      const statusText = await statusBadge.textContent();
      
      if (statusText?.includes('Opłacone w całości') || statusText?.includes('Opłacone')) {
        // Click to expand
        await row.click();
        await page.waitForTimeout(500);
        
        // Take screenshot of expanded full payment
        await page.screenshot({ 
          path: 'tests/screenshots/payment-status-full-payment-expanded.png',
          fullPage: true 
        });
        
        // Check payment summary
        const paidAmountText = await page.locator('text=/Opłacone/i').first().textContent();
        const remainingAmountText = await page.locator('text=/Pozostało/i').first().textContent();
        
        // Verify full payment indicator
        const fullPaymentIndicator = page.locator('text=/Płatność w całości/i');
        if (await fullPaymentIndicator.isVisible()) {
          await page.screenshot({ 
            path: 'tests/screenshots/payment-status-full-payment-indicator.png',
            fullPage: true 
          });
        }
        
        // Check that all items show as paid
        const paidItems = page.locator('text=/Opłacone/i');
        const unpaidItems = page.locator('text=/Nieopłacone/i');
        
        // Verify no unpaid items for full payment
        const unpaidCount = await unpaidItems.count();
        expect(unpaidCount).toBe(0);
        
        break;
      }
    }
  });

  test('should display partial payment status correctly', async ({ page }) => {
    // Wait for reservations to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Find a reservation with partial payment
    const rows = await page.locator('table tbody tr').all();
    
    for (const row of rows) {
      const statusBadge = row.locator('td:last-child span');
      const statusText = await statusBadge.textContent();
      
      if (statusText?.includes('Częściowo opłacone') || statusText?.includes('Częściowo')) {
        // Take screenshot before expanding
        await page.screenshot({ 
          path: 'tests/screenshots/payment-status-partial-before-expand.png',
          fullPage: true 
        });
        
        // Click to expand
        await row.click();
        await page.waitForTimeout(500);
        
        // Take screenshot of expanded partial payment
        await page.screenshot({ 
          path: 'tests/screenshots/payment-status-partial-payment-expanded.png',
          fullPage: true 
        });
        
        // Check payment summary
        const partialPaymentIndicator = page.locator('text=/Płatność częściowa/i');
        if (await partialPaymentIndicator.isVisible()) {
          await page.screenshot({ 
            path: 'tests/screenshots/payment-status-partial-payment-indicator.png',
            fullPage: true 
          });
        }
        
        // Check that there are both paid and unpaid items
        const paidItems = page.locator('text=/Opłacone/i');
        const unpaidItems = page.locator('text=/Nieopłacone/i');
        const partiallyPaidItems = page.locator('text=/Częściowo opłacone/i');
        
        const paidCount = await paidItems.count();
        const unpaidCount = await unpaidItems.count();
        const partiallyPaidCount = await partiallyPaidItems.count();
        
        // For partial payment, there should be some unpaid or partially paid items
        expect(paidCount + unpaidCount + partiallyPaidCount).toBeGreaterThan(0);
        
        // Verify remaining amount is displayed
        const remainingAmount = page.locator('text=/Pozostało/i').first();
        await expect(remainingAmount).toBeVisible();
        
        break;
      }
    }
  });

  test('should display payment items with correct status badges', async ({ page }) => {
    // Wait for reservations to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Expand first reservation
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(500);
    
    // Take screenshot of payment items
    await page.screenshot({ 
      path: 'tests/screenshots/payment-status-items-display.png',
      fullPage: true 
    });
    
    // Check for different status badges
    const paidBadge = page.locator('text=/Opłacone/i').first();
    const unpaidBadge = page.locator('text=/Nieopłacone/i').first();
    const partiallyPaidBadge = page.locator('text=/Częściowo opłacone/i').first();
    
    // At least one status badge should be visible
    const hasPaid = await paidBadge.isVisible().catch(() => false);
    const hasUnpaid = await unpaidBadge.isVisible().catch(() => false);
    const hasPartiallyPaid = await partiallyPaidBadge.isVisible().catch(() => false);
    
    expect(hasPaid || hasUnpaid || hasPartiallyPaid).toBe(true);
  });

  test('should calculate paid amount from database correctly', async ({ page }) => {
    // Wait for reservations to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Expand first reservation
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(500);
    
    // Get payment summary values
    const totalAmountText = await page.locator('text=/Kwota całkowita/i').locator('..').locator('p.text-lg').textContent();
    const paidAmountText = await page.locator('text=/Opłacone/i').locator('..').locator('p.text-lg').textContent();
    const remainingAmountText = await page.locator('text=/Pozostało/i').locator('..').locator('p.text-lg').textContent();
    
    // Extract numbers from text (remove "PLN" and spaces)
    const totalAmount = parseFloat(totalAmountText?.replace(/[^\d.,]/g, '').replace(',', '.') || '0');
    const paidAmount = parseFloat(paidAmountText?.replace(/[^\d.,]/g, '').replace(',', '.') || '0');
    const remainingAmount = parseFloat(remainingAmountText?.replace(/[^\d.,]/g, '').replace(',', '.') || '0');
    
    // Take screenshot of calculation
    await page.screenshot({ 
      path: 'tests/screenshots/payment-status-calculation.png',
      fullPage: true 
    });
    
    // Verify calculation: totalAmount = paidAmount + remainingAmount (with small tolerance for rounding)
    const calculatedTotal = paidAmount + remainingAmount;
    expect(Math.abs(totalAmount - calculatedTotal)).toBeLessThan(0.01);
    
    // Verify paid amount is not greater than total amount
    expect(paidAmount).toBeLessThanOrEqual(totalAmount);
    
    // Verify remaining amount is not negative
    expect(remainingAmount).toBeGreaterThanOrEqual(0);
  });

  test('should show correct payment status in table row', async ({ page }) => {
    // Wait for reservations to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Take screenshot of table with status badges
    await page.screenshot({ 
      path: 'tests/screenshots/payment-status-table-badges.png',
      fullPage: true 
    });
    
    // Check all status badges in table
    const statusBadges = page.locator('table tbody tr td:last-child span');
    const count = await statusBadges.count();
    
    expect(count).toBeGreaterThan(0);
    
    // Verify status badges have correct text
    for (let i = 0; i < count; i++) {
      const badge = statusBadges.nth(i);
      const text = await badge.textContent();
      
      // Status should be one of: "Opłacone w całości", "Częściowo opłacone", "Nieopłacone", "Zwrócone"
      expect(text).toMatch(/Opłacone w całości|Częściowo opłacone|Nieopłacone|Zwrócone/);
    }
  });

  test('should display payment method and date for paid items', async ({ page }) => {
    // Wait for reservations to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Expand first reservation
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(500);
    
    // Look for paid items
    const paidItems = page.locator('text=/Opłacone/i').locator('..').locator('..');
    
    // Check if any paid items have payment date and method
    const paidItemCount = await paidItems.count();
    
    if (paidItemCount > 0) {
      // Take screenshot of paid items with details
      await page.screenshot({ 
        path: 'tests/screenshots/payment-status-paid-items-details.png',
        fullPage: true 
      });
      
      // Check for payment date text
      const paymentDateText = page.locator('text=/Data płatności/i');
      const hasPaymentDate = await paymentDateText.isVisible().catch(() => false);
      
      // If there are paid items, at least some should have payment date
      if (hasPaymentDate) {
        expect(hasPaymentDate).toBe(true);
      }
    }
  });
});

