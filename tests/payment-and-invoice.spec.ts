/**
 * Payment and Invoice Tests
 * Tests payment processing, invoice generation, and payment status
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

test.describe('Payment and Invoice Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route(`${API_BASE_URL}/api/payments/**`, async (route: any) => {
      const url = route.request().url();
      
      if (url.includes('/create')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            payment_id: 'mock-payment-123',
            payment_url: 'https://secure.tpay.com/?id=mock-payment-123',
            status: 'pending'
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            reservation_id: 1,
            amount: 1000.00,
            status: 'pending',
            payment_method: 'tpay'
          })
        });
      }
    });
  });

  test('Full payment flow', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/5`);

    // Select full payment
    await page.selectOption('select[name="paymentType"]', 'full');

    // Check consents
    await page.check('input[name="consent1"]');
    await page.check('input[name="consent2"]');
    await page.check('input[name="consent3"]');
    await page.check('input[name="consent4"]');

    // Submit
    await page.click('button:has-text("Złóż rezerwację")');

    // Verify payment was initiated
    await page.waitForTimeout(2000);
    // Check for payment redirect or success message
    const url = page.url();
    expect(url).toMatch(/payment|success|tpay/);
  });

  test('Partial payment flow', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/5`);

    // Select partial payment
    await page.selectOption('select[name="paymentType"]', 'partial');

    // Enter partial payment amount
    await page.fill('input[name="partialPaymentAmount"]', '500.00');

    // Check consents
    await page.check('input[name="consent1"]');
    await page.check('input[name="consent2"]');
    await page.check('input[name="consent3"]');
    await page.check('input[name="consent4"]');

    // Submit
    await page.click('button:has-text("Złóż rezerwację")');

    // Verify partial payment was initiated
    await page.waitForTimeout(2000);
  });

  test('Invoice generation - individual', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/4`);

    // Select individual invoice
    await page.selectOption('select[name="invoiceType"]', 'individual');

    // Fill invoice data
    await page.fill('input[name="invoice-firstName"]', 'Jan');
    await page.fill('input[name="invoice-lastName"]', 'Kowalski');
    await page.fill('input[name="invoice-email"]', 'jan.kowalski@example.com');
    await page.fill('input[name="invoice-phone"]', '+48');
    await page.fill('input[name="invoice-phoneNumber"]', '123456789');
    await page.fill('input[name="invoice-street"]', 'ul. Testowa 1');
    await page.fill('input[name="invoice-postalCode"]', '00-000');
    await page.fill('input[name="invoice-city"]', 'Warszawa');

    // Proceed to next step
    await page.click('button:has-text("Przejdź dalej")');
    await page.waitForURL(/.*step\/5/, { timeout: 10000 });

    // Verify invoice data is preserved
    await expect(page.locator('text=Jan Kowalski')).toBeVisible();
  });

  test('Invoice generation - company', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/4`);

    // Select company invoice
    await page.selectOption('select[name="invoiceType"]', 'company');

    // Fill company invoice data
    await page.fill('input[name="invoice-companyName"]', 'Test Company Sp. z o.o.');
    await page.fill('input[name="invoice-nip"]', '1234567890');
    await page.fill('input[name="invoice-street"]', 'ul. Firmowa 1');
    await page.fill('input[name="invoice-postalCode"]', '00-000');
    await page.fill('input[name="invoice-city"]', 'Warszawa');

    // Proceed to next step
    await page.click('button:has-text("Przejdź dalej")');
    await page.waitForURL(/.*step\/5/, { timeout: 10000 });

    // Verify company invoice data is preserved
    await expect(page.locator('text=Test Company')).toBeVisible();
  });

  test('No invoice selected', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/4`);

    // Select no invoice
    await page.selectOption('select[name="invoiceType"]', 'none');

    // Proceed to next step
    await page.click('button:has-text("Przejdź dalej")');
    await page.waitForURL(/.*step\/5/, { timeout: 10000 });

    // Verify no invoice section is shown
    await expect(page.locator('text=Faktura').or(page.locator('text=Invoice'))).not.toBeVisible();
  });
});








