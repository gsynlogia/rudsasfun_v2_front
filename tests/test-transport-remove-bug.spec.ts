import { test, expect } from '@playwright/test';
import { loginAsAdminAndSetToken } from './helpers/auth';

/**
 * Test to reproduce the bug where removing transport from turnus
 * and saving changes causes transport to reappear when editing turnus again
 * 
 * Steps to reproduce:
 * 1. Go to camp 1, turnus 1
 * 2. Verify transport is assigned
 * 3. Remove transport
 * 4. Save changes
 * 5. Go back to camp 1, turnus 1
 * 6. Verify transport is NOT there (should be removed)
 */
test.describe('Transport Remove Bug', () => {
  test('should remove transport and not restore it after saving turnus', async ({ page }) => {
    // Login as admin
    await loginAsAdminAndSetToken(page);
    
    // Navigate to camp 1, turnus 1 edit page
    await page.goto('http://localhost:3000/admin-panel/camps/1/turnus/1/edit');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot: Initial state
    await page.screenshot({ path: 'test-results/transport-remove-01-initial.png', fullPage: true });
    
    // Check if transport section exists and has transport
    const transportSection = page.locator('text=Transport').first();
    await expect(transportSection).toBeVisible();
    
    // Look for transport name or "Usuń transport" button
    const removeTransportButton = page.locator('button:has-text("Usuń transport"), button:has-text("Remove"), button:has-text("Usuń")').first();
    
    let hasTransport = false;
    try {
      await expect(removeTransportButton).toBeVisible({ timeout: 2000 });
      hasTransport = true;
      console.log('[TEST] Transport is assigned to turnus');
    } catch (e) {
      console.log('[TEST] No transport assigned to turnus');
      hasTransport = false;
    }
    
    if (!hasTransport) {
      // If no transport, assign one first for testing
      console.log('[TEST] Assigning transport first...');
      
      // Look for "Wybierz transport" or "Select transport" button
      const selectTransportButton = page.locator('button:has-text("Wybierz transport"), button:has-text("Select transport"), button:has-text("Dodaj transport")').first();
      
      if (await selectTransportButton.isVisible()) {
        await selectTransportButton.click();
        await page.waitForTimeout(1000);
        
        // Select first available transport
        const firstTransport = page.locator('[role="listitem"], .transport-item, button:has-text("Transport")').first();
        if (await firstTransport.isVisible()) {
          await firstTransport.click();
          await page.waitForTimeout(2000);
        }
      }
    }
    
    // Take screenshot: Before removal
    await page.screenshot({ path: 'test-results/transport-remove-02-before-removal.png', fullPage: true });
    
    // Click "Usuń transport" button
    const removeButton = page.locator('button:has-text("Usuń transport"), button:has-text("Remove"), button:has-text("Usuń")').first();
    await expect(removeButton).toBeVisible();
    await removeButton.click();
    
    // Wait for confirmation modal
    await page.waitForTimeout(500);
    
    // Take screenshot: Confirmation modal
    await page.screenshot({ path: 'test-results/transport-remove-03-confirmation-modal.png', fullPage: true });
    
    // Confirm removal
    const confirmButton = page.locator('button:has-text("Usuń"), button:has-text("Delete"), button:has-text("Potwierdź"), button:has-text("Confirm")').last();
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
    
    // Wait for transport to be removed
    await page.waitForTimeout(2000);
    
    // Take screenshot: After removal
    await page.screenshot({ path: 'test-results/transport-remove-04-after-removal.png', fullPage: true });
    
    // Verify transport is removed (should not see "Usuń transport" button)
    const removeButtonAfter = page.locator('button:has-text("Usuń transport")').first();
    await expect(removeButtonAfter).not.toBeVisible({ timeout: 2000 }).catch(() => {
      console.log('[TEST] Warning: Remove button still visible after removal');
    });
    
    // Click "Zapisz zmiany" (Save changes) button
    const saveButton = page.locator('button:has-text("Zapisz zmiany"), button:has-text("Save"), button:has-text("Zapisz")').first();
    await expect(saveButton).toBeVisible();
    await saveButton.click();
    
    // Wait for navigation
    await page.waitForURL('**/admin-panel/camps', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Take screenshot: After save (camps list)
    await page.screenshot({ path: 'test-results/transport-remove-05-after-save-camps-list.png', fullPage: true });
    
    // Navigate back to camp 1, turnus 1 edit page
    await page.goto('http://localhost:3000/admin-panel/camps/1/turnus/1/edit');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot: After returning to edit page
    await page.screenshot({ path: 'test-results/transport-remove-06-after-return.png', fullPage: true });
    
    // Verify transport is STILL removed (should not see "Usuń transport" button)
    const removeButtonFinal = page.locator('button:has-text("Usuń transport")').first();
    const transportName = page.locator('text=/Transport (BEAVER|SAWA|LIMBA)/i').first();
    
    // Transport should NOT be visible
    await expect(removeButtonFinal).not.toBeVisible({ timeout: 2000 });
    await expect(transportName).not.toBeVisible({ timeout: 2000 });
    
    console.log('[TEST] ✅ Transport successfully removed and stays removed after saving');
  });
});






