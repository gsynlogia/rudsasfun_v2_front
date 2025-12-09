/**
 * Complete Step Validation Tests
 * Tests validation for each step of the reservation process
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

test.describe('Step Validation Tests', () => {
  test('Step 1 - Full validation (all required fields)', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/1`);

    // Try to proceed without filling any fields
    await page.click('button:has-text("Przejdź dalej")');

    // Check for multiple validation errors
    const errors = await page.locator('text=Pole obowiązkowe').all();
    expect(errors.length).toBeGreaterThan(0);
  });

  test('Step 1 - First guardian validation (email required)', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/1`);

    // Fill all fields except email
    await page.fill('input[name="parent-firstName-1"]', 'Jan');
    await page.fill('input[name="parent-lastName-1"]', 'Kowalski');
    // Skip email
    await page.fill('input[name="parent-phoneNumber-1"]', '123456789');
    await page.fill('input[name="parent-street-1"]', 'ul. Testowa 1');
    await page.fill('input[name="parent-postalCode-1"]', '00-000');
    await page.fill('input[name="parent-city-1"]', 'Warszawa');

    // Fill participant
    await page.fill('input[name="participant-firstName"]', 'Anna');
    await page.fill('input[name="participant-lastName"]', 'Kowalska');
    await page.selectOption('select[name="participant-age"]', '2010');
    await page.selectOption('select[name="participant-gender"]', 'Dziewczynka');
    await page.fill('input[name="participant-city"]', 'Warszawa');

    // Try to proceed
    await page.click('button:has-text("Przejdź dalej")');

    // Should show email validation error
    await expect(page.locator('input[name="parent-email-1"] + p.text-red-600')).toBeVisible();
  });

  test('Step 1 - Second guardian validation (email optional)', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/1`);

    // Fill first guardian completely
    await page.fill('input[name="parent-firstName-1"]', 'Jan');
    await page.fill('input[name="parent-lastName-1"]', 'Kowalski');
    await page.fill('input[name="parent-email-1"]', 'jan.kowalski@example.com');
    await page.fill('input[name="parent-phoneNumber-1"]', '123456789');
    await page.fill('input[name="parent-street-1"]', 'ul. Testowa 1');
    await page.fill('input[name="parent-postalCode-1"]', '00-000');
    await page.fill('input[name="parent-city-1"]', 'Warszawa');

    // Add second guardian
    await page.click('button:has-text("Dodaj opiekuna")');

    // Fill only required fields for second guardian (no email)
    await page.fill('input[name="parent-firstName-2"]', 'Anna');
    await page.fill('input[name="parent-lastName-2"]', 'Kowalska');
    await page.fill('input[name="parent-phoneNumber-2"]', '987654321');
    // Leave email, street, postalCode, city empty (should be optional)

    // Fill participant
    await page.fill('input[name="participant-firstName"]', 'Anna');
    await page.fill('input[name="participant-lastName"]', 'Kowalska');
    await page.selectOption('select[name="participant-age"]', '2010');
    await page.selectOption('select[name="participant-gender"]', 'Dziewczynka');
    await page.fill('input[name="participant-city"]', 'Warszawa');

    // Should be able to proceed
    await page.click('button:has-text("Przejdź dalej")');
    await page.waitForURL(/.*step\/2/, { timeout: 10000 });
  });

  test('Step 2 - Transport validation', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/2`);

    // Try to proceed without selecting transport
    await page.click('button:has-text("Przejdź dalej")');

    // Should show validation errors
    await expect(page.locator('text=Pole obowiązkowe').first()).toBeVisible();
  });

  test('Step 2 - Transport city required when collective selected', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/2`);

    // Select collective transport but don't select city
    await page.selectOption('select[name="departureType"]', 'zbiorowy');
    
    // Wait for city select to appear
    await page.waitForSelector('select[name="departureCity"]', { timeout: 5000 });

    // Try to proceed without selecting city
    await page.click('button:has-text("Przejdź dalej")');

    // Should show validation error
    await expect(page.locator('text=Pole obowiązkowe').first()).toBeVisible();
  });

  test('Step 3 - Addons optional (no validation required)', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/3`);

    // Should be able to proceed without selecting addons
    await page.click('button:has-text("Przejdź dalej")');
    await page.waitForURL(/.*step\/4/, { timeout: 10000 });
  });

  test('Step 4 - Invoice validation (individual)', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/4`);

    // Select individual invoice
    await page.selectOption('select[name="invoiceType"]', 'individual');

    // Try to proceed without filling invoice data
    await page.click('button:has-text("Przejdź dalej")');

    // Should show validation errors
    await expect(page.locator('text=Pole obowiązkowe').first()).toBeVisible();
  });

  test('Step 4 - Invoice validation (company)', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/4`);

    // Select company invoice
    await page.selectOption('select[name="invoiceType"]', 'company');

    // Try to proceed without filling company data
    await page.click('button:has-text("Przejdź dalej")');

    // Should show validation errors
    await expect(page.locator('text=Pole obowiązkowe').first()).toBeVisible();
  });

  test('Step 5 - Consents validation', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/5`);

    // Try to submit without checking consents
    await page.click('button:has-text("Złóż rezerwację")');

    // Should show validation errors
    await expect(page.locator('text=Pole obowiązkowe').first()).toBeVisible();
  });

  test('Step 5 - Partial payment amount validation', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/camps/1/edition/1/step/5`);

    // Select partial payment
    await page.selectOption('select[name="paymentType"]', 'partial');

    // Try to submit without entering amount
    await page.check('input[name="consent1"]');
    await page.check('input[name="consent2"]');
    await page.check('input[name="consent3"]');
    await page.check('input[name="consent4"]');

    await page.click('button:has-text("Złóż rezerwację")');

    // Should show validation error for amount
    await expect(page.locator('text=Pole obowiązkowe').or(page.locator('input[name="partialPaymentAmount"]'))).toBeVisible();
  });
});







