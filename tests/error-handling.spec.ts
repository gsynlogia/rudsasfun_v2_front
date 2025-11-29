import { test, expect } from '@playwright/test';

test.describe('Error Handling - Camp and Edition Not Found', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  test('should display message when camp does not exist', async ({ page }) => {
    // Navigate to non-existent camp (camp ID 999)
    await page.goto(`${baseURL}/camps/999/edition/1/step/1`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Wait for message to appear (not an error, just information)
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1');
        return h1 && h1.textContent?.includes('Obóz lub edycja nie istnieje');
      },
      { timeout: 10000 }
    );
    
    const title = await page.locator('h1').first().textContent();
    expect(title).toContain('Obóz lub edycja nie istnieje');
    
    // Check for warning message
    const warning = await page.locator('text=/Żądany obóz lub edycja nie istnieje/').first();
    await expect(warning).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ 
      path: 'screenshots_playwright/error-camp-not-found.png',
      fullPage: true 
    });
  });

  test('should display message when edition does not exist', async ({ page }) => {
    // Navigate to existing camp but non-existent edition (edition ID 999)
    await page.goto(`${baseURL}/camps/1/edition/999/step/1`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Wait for message to appear (not an error, just information)
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1');
        return h1 && h1.textContent?.includes('Obóz lub edycja nie istnieje');
      },
      { timeout: 10000 }
    );
    
    const title = await page.locator('h1').first().textContent();
    expect(title).toContain('Obóz lub edycja nie istnieje');
    
    // Check for warning message
    const warning = await page.locator('text=/Żądany obóz lub edycja nie istnieje/').first();
    await expect(warning).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ 
      path: 'screenshots_playwright/error-edition-not-found.png',
      fullPage: true 
    });
  });

  test('should display message when both camp and edition do not exist', async ({ page }) => {
    // Navigate to non-existent camp and edition
    await page.goto(`${baseURL}/camps/999/edition/999/step/1`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Wait for message to appear (not an error, just information)
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1');
        return h1 && h1.textContent?.includes('Obóz lub edycja nie istnieje');
      },
      { timeout: 10000 }
    );
    
    const title = await page.locator('h1').first().textContent();
    expect(title).toContain('Obóz lub edycja nie istnieje');
    
    // Check for warning message
    const warning = await page.locator('text=/Żądany obóz lub edycja nie istnieje/').first();
    await expect(warning).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ 
      path: 'screenshots_playwright/error-both-not-found.png',
      fullPage: true 
    });
  });

  test('should display message when invalid camp ID is provided', async ({ page }) => {
    // Navigate with invalid camp ID (not a number) - Next.js will show not-found
    await page.goto(`${baseURL}/camps/invalid/edition/1/step/1`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Wait for not-found page or message
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1');
        return h1 && (h1.textContent?.includes('Nie znaleziono') || h1.textContent?.includes('Obóz lub edycja nie istnieje'));
      },
      { timeout: 10000 }
    );
    
    const title = await page.locator('h1').first().textContent();
    expect(title).toMatch(/Nie znaleziono|Obóz lub edycja nie istnieje/);
    
    await page.screenshot({ 
      path: 'screenshots_playwright/error-invalid-camp-id.png',
      fullPage: true 
    });
  });

  test('should display message when invalid edition ID is provided', async ({ page }) => {
    // Navigate with invalid edition ID (not a number) - Next.js will show not-found
    await page.goto(`${baseURL}/camps/1/edition/invalid/step/1`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Wait for not-found page or message
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1');
        return h1 && (h1.textContent?.includes('Nie znaleziono') || h1.textContent?.includes('Obóz lub edycja nie istnieje'));
      },
      { timeout: 10000 }
    );
    
    const title = await page.locator('h1').first().textContent();
    expect(title).toMatch(/Nie znaleziono|Obóz lub edycja nie istnieje/);
    
    await page.screenshot({ 
      path: 'screenshots_playwright/error-invalid-edition-id.png',
      fullPage: true 
    });
  });

  test('should display warning message when camp does not exist', async ({ page }) => {
    // Navigate to non-existent camp
    await page.goto(`${baseURL}/camps/999/edition/1/step/1`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Wait for message to appear
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1');
        return h1 && h1.textContent?.includes('Obóz lub edycja nie istnieje');
      },
      { timeout: 10000 }
    );
    
    // Check for yellow warning box
    const warningBox = page.locator('.bg-yellow-50');
    await expect(warningBox).toBeVisible({ timeout: 5000 });
    
    const warningText = await warningBox.textContent();
    expect(warningText).toContain('Żądany obóz lub edycja nie istnieje');
    
    await page.screenshot({ 
      path: 'screenshots_playwright/error-home-button-works.png',
      fullPage: true 
    });
  });
});

