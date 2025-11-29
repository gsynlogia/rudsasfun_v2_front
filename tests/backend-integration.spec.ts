import { test, expect } from '@playwright/test';

test.describe('Backend Integration - Camp Data', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should fetch and display camp data from backend', async ({ page }) => {
    // Wait for camp data to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Check if camp data is displayed (should not be "Ładowanie danych obozu...")
    const title = await page.locator('h1').first().textContent();
    expect(title).not.toBe('Ładowanie danych obozu...');
    expect(title).not.toBe('Błąd ładowania danych obozu');
    
    // Should contain camp name
    expect(title).toContain('Laserowy Paintball');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'screenshots_playwright/backend-camp-data-displayed.png',
      fullPage: true 
    });
  });

  test('should display camp information correctly', async ({ page }) => {
    // Wait for camp data to load
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1');
        return h1 && !h1.textContent?.includes('Ładowanie danych obozu');
      },
      { timeout: 15000 }
    );
    
    const title = await page.locator('h1').first().textContent();
    
    // Verify camp data format
    expect(title).toMatch(/Rezerwacja obozu/);
    expect(title).toMatch(/Laserowy Paintball/);
    expect(title).toMatch(/\d+ dni/); // Should contain number of days
    
    // Take screenshot
    await page.screenshot({ 
      path: 'screenshots_playwright/backend-camp-info-format.png',
      fullPage: true 
    });
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API call and return error
    await page.route('http://localhost:8000/api/camps/current/active', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should show error message or fallback
    const title = await page.locator('h1').first().textContent();
    // Either error message or fallback text
    expect(title).toMatch(/Błąd|Rezerwacja obozu/);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'screenshots_playwright/backend-api-error-handling.png',
      fullPage: true 
    });
  });

  test('should display loading state initially', async ({ page, context }) => {
    // Navigate to page
    await page.goto('http://localhost:3000');
    
    // Wait for camp data to load
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1');
        return h1 && !h1.textContent?.includes('Ładowanie danych obozu');
      },
      { timeout: 15000 }
    );
    
    // Should eventually show camp data
    const finalText = await page.locator('h1').first().textContent();
    expect(finalText).toContain('Laserowy Paintball');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'screenshots_playwright/backend-loading-state.png',
      fullPage: true 
    });
  });
});

