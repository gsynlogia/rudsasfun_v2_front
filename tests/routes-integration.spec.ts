import { test, expect } from '@playwright/test';

test.describe('Routes Integration - Camp Data with URLs', () => {
  // Removed beforeEach - each test navigates to its specific URL

  test('should redirect from home to camp edition step 1', async ({ page }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 10000 });
    // Home page should redirect to /camps/1/edition/1/step/1
    await page.waitForURL(/\/camps\/\d+\/edition\/\d+\/step\/\d+/, { timeout: 10000 });
    
    const url = page.url();
    expect(url).toMatch(/\/camps\/\d+\/edition\/\d+\/step\/1/);
    
    // Wait for camp data to load (max 10 seconds)
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1');
        return h1 && h1.textContent && h1.textContent.includes('Laserowy Paintball');
      },
      { timeout: 10000 }
    );
    
    // Take screenshot
    await page.screenshot({ 
      path: 'screenshots_playwright/routes-home-redirect.png',
      fullPage: true 
    });
  });

  test('should display camp data from URL parameters', async ({ page }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    await page.goto(`${baseURL}/camps/1/edition/1/step/1`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Wait for camp data to load (max 10 seconds)
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1');
        return h1 && h1.textContent && h1.textContent.includes('Laserowy Paintball');
      },
      { timeout: 10000 }
    );
    
    const title = await page.locator('h1').first().textContent();
    expect(title).toContain('Laserowy Paintball');
    expect(title).not.toContain('Ładowanie danych obozu');
    
    await page.screenshot({ 
      path: 'screenshots_playwright/routes-camp-data-displayed.png',
      fullPage: true 
    });
  });

  test('should navigate between steps using URLs', async ({ page }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    await page.goto(`${baseURL}/camps/1/edition/1/step/1`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1');
        return h1 && h1.textContent && h1.textContent.includes('Laserowy Paintball');
      },
      { timeout: 10000 }
    );
    
    // Click the main navigation button (not the one in ReservationSummary)
    const nextButton = page.locator('main button:has-text("przejdź dalej")').first();
    await nextButton.waitFor({ state: 'visible', timeout: 10000 });
    await nextButton.click();
    
    // Wait for navigation to complete
    await page.waitForURL(/\/camps\/\d+\/edition\/\d+\/step\/2/, { timeout: 10000, waitUntil: 'networkidle' });
    
    const url = page.url();
    expect(url).toMatch(/\/camps\/\d+\/edition\/\d+\/step\/2/);
    
    // Wait for step 2 content to appear
    await page.waitForFunction(
      () => {
        const h2s = Array.from(document.querySelectorAll('h2'));
        return h2s.some(h2 => h2.textContent?.includes('Szczegóły rezerwacji'));
      },
      { timeout: 10000 }
    );
    
    await page.screenshot({ 
      path: 'screenshots_playwright/routes-step-navigation.png',
      fullPage: true 
    });
  });

  test('should navigate using progress bar clicks', async ({ page }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    await page.goto(`${baseURL}/camps/1/edition/1/step/1`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1');
        return h1 && h1.textContent && h1.textContent.includes('Laserowy Paintball');
      },
      { timeout: 10000 }
    );
    
    // Click step 3 in progress bar (desktop or mobile view)
    await page.locator('nav button[aria-label*="kroku 3"], button[aria-label="Przejdź do kroku 3: Faktury"]').first().click();
    await page.waitForURL(/\/camps\/\d+\/edition\/\d+\/step\/3/, { timeout: 10000 });
    
    const url = page.url();
    expect(url).toMatch(/\/camps\/\d+\/edition\/\d+\/step\/3/);
    
    // Wait for step 3 content to appear (any of the invoice-related headings)
    await page.waitForFunction(
      () => {
        const h2s = Array.from(document.querySelectorAll('h2'));
        return h2s.some(h2 => h2.textContent?.includes('Typ faktury') || h2.textContent?.includes('Dane do faktury'));
      },
      { timeout: 10000 }
    );
    
    await page.screenshot({ 
      path: 'screenshots_playwright/routes-progress-bar-navigation.png',
      fullPage: true 
    });
  });

  test('should handle different camp editions', async ({ page }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    await page.goto(`${baseURL}/camps/1/edition/2/step/1`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1');
        return h1 && h1.textContent && h1.textContent.includes('Laserowy Paintball') && h1.textContent.includes('Zima');
      },
      { timeout: 10000 }
    );
    
    const title = await page.locator('h1').first().textContent();
    expect(title).toContain('Laserowy Paintball');
    expect(title).toContain('Zima');
    
    await page.screenshot({ 
      path: 'screenshots_playwright/routes-different-edition.png',
      fullPage: true 
    });
  });

  test('should maintain URL structure when navigating', async ({ page }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    const steps = [1, 2, 3, 4, 5];
    
    for (const step of steps) {
      await page.goto(`${baseURL}/camps/1/edition/1/step/${step}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForFunction(
        () => {
          const h1 = document.querySelector('h1');
          return h1 && h1.textContent && h1.textContent.includes('Laserowy Paintball');
        },
        { timeout: 10000 }
      );
      
      const url = page.url();
      expect(url).toMatch(new RegExp(`/camps/1/edition/1/step/${step}`));
    }
    
    await page.screenshot({ 
      path: 'screenshots_playwright/routes-all-steps-urls.png',
      fullPage: true 
    });
  });
});

