import { test, expect } from '@playwright/test';

test.describe('Admin Panel - Camp Management', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  test('should display admin panel page with sidebar', async ({ page }) => {
    // Set localStorage to expanded sidebar state BEFORE navigation
    await page.goto(`${baseURL}/admin-panel`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.evaluate(() => {
      localStorage.setItem('adminPanelSettings', JSON.stringify({ sidebarCollapsed: false }));
    });
    
    // Reload to apply localStorage settings
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Take screenshot immediately (0.25 seconds) to catch loader
    await page.waitForTimeout(250);
    await page.screenshot({ 
      path: 'screenshots_playwright/admin-panel-0.25s-expanded.png',
      fullPage: true 
    });
    
    await page.waitForTimeout(250); // 0.5 seconds total
    await page.screenshot({ 
      path: 'screenshots_playwright/admin-panel-0.5s-expanded.png',
      fullPage: true 
    });
    
    await page.waitForTimeout(500); // 1 second total
    await page.screenshot({ 
      path: 'screenshots_playwright/admin-panel-1s-expanded.png',
      fullPage: true 
    });
    
    await expect(page.locator('h1', { hasText: 'Zarządzanie obozami' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Obozy').first()).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ 
      path: 'screenshots_playwright/admin-panel-initial-expanded.png',
      fullPage: true 
    });
    
    // Test SPA navigation - navigate to reservations
    await page.locator('a[href="/admin-panel/reservations"]').first().click();
    await page.waitForTimeout(250); // Screenshot during navigation
    await page.screenshot({ 
      path: 'screenshots_playwright/admin-panel-reservations-0.25s.png',
      fullPage: true 
    });
    
    await page.waitForURL('**/admin-panel/reservations', { timeout: 10000 });
    await page.screenshot({ 
      path: 'screenshots_playwright/admin-panel-reservations-final.png',
      fullPage: true 
    });
  });

  test('should display camps list', async ({ page }) => {
    await page.goto(`${baseURL}/admin-panel`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Wait for camps to load
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1');
        return h1 && h1.textContent && h1.textContent.includes('Zarządzanie obozami');
      },
      { timeout: 10000 }
    );
    
    // Check if camps are displayed or empty state
    const hasCamps = await page.locator('text=/Laserowy Paintball|Brak obozów/').first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasCamps).toBeTruthy();
    
    await page.screenshot({ 
      path: 'screenshots_playwright/admin-panel-camps-list.png',
      fullPage: true 
    });
  });

  test('should open camp form when clicking "Dodaj obóz"', async ({ page }) => {
    await page.goto(`${baseURL}/admin-panel`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1');
        return h1 && h1.textContent && h1.textContent.includes('Zarządzanie obozami');
      },
      { timeout: 10000 }
    );
    
    await page.locator('button:has-text("Dodaj obóz")').first().click();
    
    await expect(page.locator('h2', { hasText: /Dodaj nowy obóz|Edytuj obóz/ })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="text"]').first()).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ 
      path: 'screenshots_playwright/admin-panel-camp-form.png',
      fullPage: true 
    });
  });

  test('should select camp and show camp detail view', async ({ page }) => {
    await page.goto(`${baseURL}/admin-panel`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1');
        return h1 && h1.textContent && h1.textContent.includes('Zarządzanie obozami');
      },
      { timeout: 10000 }
    );
    
    // Wait for camps to load
    await page.waitForTimeout(2000);
    
    // Try to find "Zarządzaj edycjami" button
    const manageButton = page.locator('button:has-text("Zarządzaj edycjami")').first();
    const isVisible = await manageButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      await manageButton.click();
      
      await expect(page.locator('h1', { hasText: /Laserowy Paintball/ })).toBeVisible({ timeout: 5000 });
      await expect(page.locator('button:has-text("Dodaj edycję")')).toBeVisible({ timeout: 5000 });
      
      await page.screenshot({ 
        path: 'screenshots_playwright/admin-panel-camp-detail.png',
        fullPage: true 
      });
    } else {
      // If no camps exist, skip this test
      test.skip();
    }
  });

  test('should display camp properties in table when viewing camp detail', async ({ page }) => {
    await page.goto(`${baseURL}/admin-panel`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1');
        return h1 && h1.textContent && h1.textContent.includes('Zarządzanie obozami');
      },
      { timeout: 10000 }
    );
    
    // Wait for camps to load
    await page.waitForTimeout(2000);
    
    // Try to find "Zarządzaj edycjami" button and click it
    const manageButton = page.locator('button:has-text("Zarządzaj edycjami")').first();
    const isVisible = await manageButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      await manageButton.click();
      
      // Wait for camp detail view
      await page.waitForFunction(
        () => {
          const h1 = document.querySelector('h1');
          return h1 && h1.textContent && h1.textContent.includes('Laserowy Paintball');
        },
        { timeout: 5000 }
      );
      
      // Check if table with properties exists
      const tableExists = await page.locator('table').first().isVisible({ timeout: 5000 }).catch(() => false);
      
      if (tableExists) {
        await expect(page.locator('th', { hasText: 'Okres' })).toBeVisible({ timeout: 5000 });
        await expect(page.locator('th', { hasText: 'Miejscowość' })).toBeVisible({ timeout: 5000 });
        await expect(page.locator('th', { hasText: 'Data rozpoczęcia' })).toBeVisible({ timeout: 5000 });
        
        await page.screenshot({ 
          path: 'screenshots_playwright/admin-panel-properties-table.png',
          fullPage: true 
        });
      }
    } else {
      test.skip();
    }
  });

  test('should cancel form and return to list', async ({ page }) => {
    await page.goto(`${baseURL}/admin-panel`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1');
        return h1 && h1.textContent && h1.textContent.includes('Zarządzanie obozami');
      },
      { timeout: 10000 }
    );
    
    await page.locator('button:has-text("Dodaj obóz")').first().click();
    
    await expect(page.locator('h2', { hasText: /Dodaj nowy obóz/ })).toBeVisible({ timeout: 5000 });
    
    await page.locator('button:has-text("Anuluj")').first().click();
    
    await expect(page.locator('h1', { hasText: 'Zarządzanie obozami' })).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ 
      path: 'screenshots_playwright/admin-panel-cancel-form.png',
      fullPage: true 
    });
  });
});

