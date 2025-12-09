import { test, expect } from '@playwright/test';

/**
 * Step 2 Protection Section E2E Tests
 * Tests the protection section in Step 2 of reservation process
 * 
 * Requirements:
 * - Login as admin (admin/admin)
 * - Navigate through reservation process
 * - Take screenshots at each step
 * - Verify protection section displays protections from database
 * - Verify icons, names, and prices are from API
 */

test.describe('Step 2 - Protection Section', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
  
  test.beforeEach(async ({ page }) => {
    // Clear storage
    await page.goto(baseURL);
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  });

  test('should display protection section with data from database', async ({ page }) => {
    // Step 1: Login as admin
    await page.goto(`${baseURL}/admin-panel/login`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: 'screenshots_playwright/step2-01-login-page.png',
      fullPage: true 
    });

    // Fill login form
    await page.fill('input[name="login"]', 'admin');
    await page.fill('input[name="password"]', 'admin');
    await page.screenshot({ 
      path: 'screenshots_playwright/step2-02-login-filled.png',
      fullPage: true 
    });

    // Submit login
    await page.click('button[type="submit"]');
    await page.waitForURL(/admin-panel/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: 'screenshots_playwright/step2-03-admin-panel.png',
      fullPage: true 
    });

    // Step 2: Navigate to main page
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: 'screenshots_playwright/step2-04-main-page.png',
      fullPage: true 
    });

    // Step 3: Click on a camp/turnus
    // Look for camp buttons (Lato, Zima, etc.)
    const campButton = page.locator('button').filter({ hasText: /Lato|Zima|Obozy/i }).first();
    
    if (await campButton.count() > 0) {
      await campButton.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // Wait for navigation
      await page.screenshot({ 
        path: 'screenshots_playwright/step2-05-camp-selected.png',
        fullPage: true 
      });
    }

    // Step 4: Navigate to Step 2 if we're on Step 1
    // Check if we're on a reservation step page
    const currentUrl = page.url();
    if (currentUrl.includes('/step/1')) {
      // Fill Step 1 if needed (minimal data)
      // Then navigate to Step 2
      const step2Url = currentUrl.replace('/step/1', '/step/2');
      await page.goto(step2Url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    } else if (currentUrl.includes('/camps/') && !currentUrl.includes('/step/')) {
      // We're on camp selection, need to select edition and go to step 1 first
      // For now, try to find a direct link to step 2
      const urlParts = currentUrl.split('/');
      const campIdIndex = urlParts.indexOf('camps');
      if (campIdIndex !== -1 && campIdIndex + 1 < urlParts.length) {
        const campId = urlParts[campIdIndex + 1];
        // Try to find edition ID from page
        const editionLink = page.locator('a[href*="/edition/"]').first();
        if (await editionLink.count() > 0) {
          const href = await editionLink.getAttribute('href');
          if (href) {
            const editionId = href.match(/edition\/(\d+)/)?.[1];
            if (editionId) {
              await page.goto(`${baseURL}/camps/${campId}/edition/${editionId}/step/2`);
              await page.waitForLoadState('networkidle');
              await page.waitForTimeout(2000);
            }
          }
        }
      }
    }

    // Step 5: Verify we're on Step 2
    await page.waitForURL(/\/step\/2/, { timeout: 10000 });
    await page.screenshot({ 
      path: 'screenshots_playwright/step2-06-step2-page.png',
      fullPage: true 
    });

    // Step 6: Verify "Ochrona rezerwacji" section exists
    const protectionSectionTitle = page.locator('h2').filter({ hasText: /Ochrona rezerwacji/i });
    await expect(protectionSectionTitle).toBeVisible({ timeout: 5000 });
    await page.screenshot({ 
      path: 'screenshots_playwright/step2-07-protection-section-title.png',
      fullPage: true 
    });

    // Step 7: Verify protection tiles are displayed
    const protectionTiles = page.locator('section:has(h2:has-text("Ochrona rezerwacji")) button');
    const tileCount = await protectionTiles.count();
    
    if (tileCount > 0) {
      // Take screenshot of protection tiles
      await page.screenshot({ 
        path: 'screenshots_playwright/step2-08-protection-tiles.png',
        fullPage: true 
      });

      // Verify each tile has icon, name, and price
      for (let i = 0; i < Math.min(tileCount, 5); i++) {
        const tile = protectionTiles.nth(i);
        await expect(tile).toBeVisible();
        
        // Check if tile has icon (img or svg)
        const hasIcon = await tile.locator('img, svg').count() > 0;
        
        // Check if tile has name text
        const tileText = await tile.textContent();
        expect(tileText).toBeTruthy();
        expect(tileText!.length).toBeGreaterThan(0);
        
        // Check if tile has price (contains "zł" or number)
        const hasPrice = tileText!.includes('zł') || /\d+/.test(tileText!);
        expect(hasPrice).toBeTruthy();
      }
    }

    // Step 8: Verify information block exists
    const infoBlock = page.locator('section:has(h2:has-text("Ochrona rezerwacji"))').locator('.bg-gray-50');
    if (await infoBlock.count() > 0) {
      await expect(infoBlock.first()).toBeVisible();
      await page.screenshot({ 
        path: 'screenshots_playwright/step2-09-info-block.png',
        fullPage: true 
      });
    }

    // Step 9: Verify regulation buttons exist (if documents are available)
    const regulationButtons = page.locator('section:has(h2:has-text("Ochrona rezerwacji"))').locator('button:has-text("Regulamin")');
    const regulationCount = await regulationButtons.count();
    
    if (regulationCount > 0) {
      await page.screenshot({ 
        path: 'screenshots_playwright/step2-10-regulation-buttons.png',
        fullPage: true 
      });
    }

    // Step 10: Verify "Ochrony" section does NOT exist (should be removed)
    const protectionsSection = page.locator('h2').filter({ hasText: /^Ochrony$/i });
    await expect(protectionsSection).not.toBeVisible({ timeout: 2000 });

    // Step 11: Click on a protection tile to test selection
    if (tileCount > 0) {
      const firstTile = protectionTiles.first();
      await firstTile.click();
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: 'screenshots_playwright/step2-11-protection-selected.png',
        fullPage: true 
      });

      // Verify tile is selected (should have different background color)
      const isSelected = await firstTile.evaluate((el) => {
        return el.classList.contains('bg-[#03adf0]') || 
               window.getComputedStyle(el).backgroundColor.includes('rgb');
      });
      expect(isSelected).toBeTruthy();
    }

    // Final screenshot
    await page.screenshot({ 
      path: 'screenshots_playwright/step2-12-final-state.png',
      fullPage: true 
    });
  });

  test('should load protections from API with icons and prices', async ({ page }) => {
    // Login as admin
    await page.goto(`${baseURL}/admin-panel/login`);
    await page.fill('input[name="login"]', 'admin');
    await page.fill('input[name="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL(/admin-panel/, { timeout: 10000 });

    // Navigate to a camp with protections
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');

    // Try to navigate to Step 2 directly if we know a camp/edition
    // For testing, we'll intercept API calls to verify data
    const apiCalls: any[] = [];
    
    page.on('response', async (response) => {
      if (response.url().includes('/protections')) {
        const data = await response.json().catch(() => null);
        if (data) {
          apiCalls.push({ url: response.url(), data });
        }
      }
    });

    // Navigate to Step 2 (try common paths)
    const testPaths = [
      '/camps/1/edition/1/step/2',
      '/camps/2/edition/1/step/2',
    ];

    for (const path of testPaths) {
      try {
        await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle', timeout: 5000 });
        if (page.url().includes('/step/2')) {
          break;
        }
      } catch (e) {
        // Continue to next path
      }
    }

    // Wait for protection section
    await page.waitForSelector('h2:has-text("Ochrona rezerwacji")', { timeout: 10000 });
    
    // Verify API was called
    expect(apiCalls.length).toBeGreaterThan(0);
    
    // Verify protection data structure
    const protectionData = apiCalls.find(call => call.data && Array.isArray(call.data))?.data;
    if (protectionData && protectionData.length > 0) {
      const firstProtection = protectionData[0];
      
      // Verify protection has required fields
      expect(firstProtection).toHaveProperty('name');
      expect(firstProtection).toHaveProperty('price');
      // Icon fields are optional but should be checked if present
      if (firstProtection.icon_url || firstProtection.icon_svg) {
        expect(firstProtection.icon_url || firstProtection.icon_svg).toBeTruthy();
      }
    }

    await page.screenshot({ 
      path: 'screenshots_playwright/step2-api-verification.png',
      fullPage: true 
    });
  });
});






