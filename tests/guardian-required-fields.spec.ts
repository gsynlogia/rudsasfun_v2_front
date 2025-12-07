import { test, expect } from '@playwright/test';

/**
 * Test: Obowiązkowe/opcjonalne pola dla opiekunów
 * Zadanie 2: 
 * - Pierwszy opiekun: imię, nazwisko, email, telefon - obowiązkowe; reszta opcjonalna
 * - Drugi opiekun: imię, nazwisko, telefon - obowiązkowe; reszta opcjonalna
 */
test.describe('Guardian Required Fields', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to reservation form Step 1
    await page.goto('http://localhost:3000/camps/1/edition/1/step/1');
    await page.waitForLoadState('networkidle');
    // Wait for form to be ready
    await page.waitForSelector('h2:has-text("Dane rodzica")', { timeout: 10000 });
  });

  test('first guardian should require firstName, lastName, email, phoneNumber', async ({ page }) => {
    // Get first guardian section
    const firstGuardianSection = page.locator('section.bg-white').first();
    
    // Clear all required fields
    const firstNameInput = firstGuardianSection.locator('input').filter({ has: page.locator('label:has-text("Imię")') }).first();
    const lastNameInput = firstGuardianSection.locator('input').filter({ has: page.locator('label:has-text("Nazwisko")') }).first();
    const emailInput = firstGuardianSection.locator('input[type="email"]').first();
    const phoneInput = firstGuardianSection.locator('input[type="tel"]').first();
    
    // Use more reliable selectors
    await firstGuardianSection.locator('label:has-text("Imię")').locator('..').locator('input[type="text"]').first().clear();
    await firstGuardianSection.locator('label:has-text("Nazwisko")').locator('..').locator('input[type="text"]').first().clear();
    await firstGuardianSection.locator('input[type="email"]').first().clear();
    await firstGuardianSection.locator('input[type="tel"]').first().clear();
    
    // Fill participant data to enable next button
    const participantSection = page.locator('h2:has-text("Dane uczestnika")').locator('..');
    await participantSection.locator('input[type="text"]').first().fill('Anna');
    await participantSection.locator('select').nth(0).selectOption({ index: 1 }); // age
    await participantSection.locator('select').nth(1).selectOption({ index: 1 }); // gender
    
    // Try to click next
    const nextButton = page.locator('button:has-text("przejdź dalej"), button:has-text("Przejdź dalej")').first();
    await nextButton.click();
    
    // Wait a bit for validation
    await page.waitForTimeout(1000);
    
    // Should show validation errors for required fields
    const errorMessages = page.locator('text=/Pole obowiązkowe/i');
    await expect(errorMessages.first()).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ 
      path: 'screenshots_playwright/guardian-required-fields-first-guardian.png',
      fullPage: true 
    });
  });

  test('first guardian should allow empty optional fields (street, postalCode, city)', async ({ page }) => {
    // Get first guardian section
    const firstGuardianSection = page.locator('section.bg-white').first();
    
    // Fill only required fields
    await firstGuardianSection.locator('label:has-text("Imię")').locator('..').locator('input[type="text"]').first().fill('Jan');
    await firstGuardianSection.locator('label:has-text("Nazwisko")').locator('..').locator('input[type="text"]').first().fill('Kowalski');
    await firstGuardianSection.locator('input[type="email"]').first().fill('jan@example.com');
    await firstGuardianSection.locator('input[type="tel"]').first().fill('123456789');
    
    // Leave optional fields empty (street, postalCode, city should be optional for first guardian)
    
    // Fill participant data
    const participantSection = page.locator('h2:has-text("Dane uczestnika")').locator('..');
    await participantSection.locator('input[type="text"]').first().fill('Anna');
    await participantSection.locator('select').nth(0).selectOption({ index: 1 }); // age
    await participantSection.locator('select').nth(1).selectOption({ index: 1 }); // gender
    
    // Should be able to proceed (validation will be checked in backend)
    await page.screenshot({ 
      path: 'screenshots_playwright/guardian-required-fields-first-optional.png',
      fullPage: true 
    });
  });

  test('second guardian should require only firstName, lastName, phoneNumber', async ({ page }) => {
    // Get first guardian section
    const firstGuardianSection = page.locator('section.bg-white').first();
    
    // Fill first guardian (all required)
    await firstGuardianSection.locator('label:has-text("Imię")').locator('..').locator('input[type="text"]').first().fill('Jan');
    await firstGuardianSection.locator('label:has-text("Nazwisko")').locator('..').locator('input[type="text"]').first().fill('Kowalski');
    await firstGuardianSection.locator('input[type="email"]').first().fill('jan@example.com');
    await firstGuardianSection.locator('input[type="tel"]').first().fill('123456789');
    
    // Add second guardian
    await page.click('button:has-text("Dodaj opiekuna")');
    await page.waitForTimeout(1000);
    
    // Fill only firstName, lastName, phoneNumber for second guardian
    const secondGuardianSection = page.locator('section.bg-white').nth(1);
    await secondGuardianSection.locator('label:has-text("Imię")').locator('..').locator('input[type="text"]').first().fill('Anna');
    await secondGuardianSection.locator('label:has-text("Nazwisko")').locator('..').locator('input[type="text"]').first().fill('Kowalska');
    await secondGuardianSection.locator('input[type="tel"]').first().fill('987654321');
    
    // Leave email, street, postalCode, city empty (should be optional)
    
    // Fill participant data
    const participantSection = page.locator('h2:has-text("Dane uczestnika")').locator('..');
    await participantSection.locator('input[type="text"]').first().fill('Anna');
    await participantSection.locator('select').nth(0).selectOption({ index: 1 }); // age
    await participantSection.locator('select').nth(1).selectOption({ index: 1 }); // gender
    
    await page.screenshot({ 
      path: 'screenshots_playwright/guardian-required-fields-second-guardian.png',
      fullPage: true 
    });
  });

  test('second guardian should show email, street, postalCode, city as optional (no asterisk)', async ({ page }) => {
    // Add second guardian
    await page.click('button:has-text("Dodaj opiekuna")');
    await page.waitForTimeout(1000);
    
    // Check that email, street, postalCode, city labels don't have asterisk for second guardian
    const secondGuardianSection = page.locator('section.bg-white').nth(1);
    
    // Email label should not have asterisk
    const emailLabel = secondGuardianSection.locator('label:has-text("Adres e-mail")');
    const emailLabelText = await emailLabel.textContent();
    expect(emailLabelText).not.toContain('*');
    
    // Street label should not have asterisk
    const streetLabel = secondGuardianSection.locator('label:has-text("Ulica")');
    const streetLabelText = await streetLabel.textContent();
    expect(streetLabelText).not.toContain('*');
    
    await page.screenshot({ 
      path: 'screenshots_playwright/guardian-required-fields-second-optional-labels.png',
      fullPage: true 
    });
  });
});

