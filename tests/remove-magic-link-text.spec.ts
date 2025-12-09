import { test, expect } from '@playwright/test';

/**
 * Test: Usunięcie słowa "magiczny link" z sekcji logowania
 * Zadanie 1: Usunąć słowo "magiczny link" z tekstu na stronie logowania
 */
test.describe('Remove Magic Link Text from Login', () => {
  test('should not contain "magiczny link" text on login page', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Get all text content on the page
    const pageText = await page.textContent('body');
    
    // Check that "magiczny link" is NOT in the visible text
    // (it may still be in code/comments, but not in UI)
    expect(pageText?.toLowerCase()).not.toContain('magiczny link');
    
    // Check that the login description text exists but without "magiczny link"
    const descriptionText = await page.locator('p.text-sm, p.text-base').first().textContent();
    expect(descriptionText).toBeTruthy();
    expect(descriptionText?.toLowerCase()).not.toContain('magiczny link');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'screenshots_playwright/remove-magic-link-text-login-page.png',
      fullPage: true 
    });
  });

  test('should contain alternative text about email login link', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Check that there is still text about email/link/login
    const pageText = await page.textContent('body');
    expect(pageText?.toLowerCase()).toMatch(/email|link|logowanie/);
    
    await page.screenshot({ 
      path: 'screenshots_playwright/remove-magic-link-text-alternative-text.png',
      fullPage: true 
    });
  });
});







