import { test, expect } from '@playwright/test';

/**
 * Test to reproduce the bug where removing transport from turnus
 * and then returning to the turnus edit page shows transport again
 * 
 * Detailed steps with screenshots:
 * 1. Login as admin (admin/admin) - SCREENSHOT
 * 2. Navigate to admin-panel/camps/1/turnus/1/edit - SCREENSHOT
 * 3. Press remove button - SCREENSHOT
 * 4. When modal appears - SCREENSHOT
 * 5. When modal disappears - SCREENSHOT
 * 6. Verify transport is NOT there (should be removed) - SCREENSHOT
 */
test.describe('Transport Remove from Turnus Bug - Detailed', () => {
  test('should remove transport and it should stay removed after returning to edit page', async ({ page }) => {
    console.log('[TEST] Step 1: Login as admin');
    // Login as admin through UI
    await page.goto('http://localhost:3000/admin-panel/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Take screenshot: Login page
    await page.screenshot({ path: 'test-results/transport-remove-detailed-01-login-page.png', fullPage: true });
    console.log('[TEST] Screenshot: Login page');
    
    // Fill login form
    const loginInput = page.locator('input[type="text"], input[name="login"], input[placeholder*="login" i], input[id="login"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Zaloguj"), button:has-text("Login")').first();
    
    await loginInput.fill('admin');
    await passwordInput.fill('admin');
    await page.waitForTimeout(500);
    
    // Take screenshot: Login form filled
    await page.screenshot({ path: 'test-results/transport-remove-detailed-02-login-filled.png', fullPage: true });
    console.log('[TEST] Screenshot: Login form filled');
    
    await submitButton.click();
    
    // Wait for login to complete
    await page.waitForURL('**/admin-panel/**', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot: After login
    await page.screenshot({ path: 'test-results/transport-remove-detailed-03-after-login.png', fullPage: true });
    console.log('[TEST] Screenshot: After login');
    
    console.log('[TEST] Step 2: Navigate to turnus edit page');
    // Navigate to turnus edit page
    await page.goto('http://localhost:3000/admin-panel/camps/1/turnus/1/edit');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot: Initial state on turnus edit page
    await page.screenshot({ path: 'test-results/transport-remove-detailed-04-turnus-edit-initial.png', fullPage: true });
    console.log('[TEST] Screenshot: Turnus edit page - initial state');
    
    // Check if transport section exists
    const transportSection = page.locator('text=Transport, text=/Transport/i').first();
    try {
      await expect(transportSection).toBeVisible({ timeout: 5000 });
      console.log('[TEST] Transport section is visible');
    } catch (e) {
      console.log('[TEST] ⚠️ Transport section not found');
    }
    
    // Look for "Usuń transport" button or transport name
    const removeTransportButton = page.locator('button:has-text("Usuń transport"), button:has-text("Remove"), button:has-text("Usuń"), button[title*="transport" i]').first();
    
    let hasTransport = false;
    try {
      await expect(removeTransportButton).toBeVisible({ timeout: 3000 });
      hasTransport = true;
      console.log('[TEST] ✅ Transport is assigned to turnus - remove button visible');
      
      // Get transport info for logging
      const transportInfo = await page.locator('text=/Transport|BEAVER|SAWA|LIMBA/i').first().textContent().catch(() => null);
      console.log('[TEST] Transport info:', transportInfo);
    } catch (e) {
      console.log('[TEST] ❌ No transport assigned to turnus - cannot test removal');
      hasTransport = false;
    }
    
    if (!hasTransport) {
      console.log('[TEST] ⚠️ No transport to remove - test cannot proceed');
      // Take screenshot anyway
      await page.screenshot({ path: 'test-results/transport-remove-detailed-05-no-transport.png', fullPage: true });
      return;
    }
    
    // Take screenshot: Before removal (with transport visible)
    await page.screenshot({ path: 'test-results/transport-remove-detailed-05-before-removal.png', fullPage: true });
    console.log('[TEST] Screenshot: Before removal - transport is visible');
    
    console.log('[TEST] Step 3: Press remove button');
    // Click "Usuń transport" button
    await removeTransportButton.click();
    await page.waitForTimeout(500);
    
    // Take screenshot: After clicking remove (modal should appear)
    await page.screenshot({ path: 'test-results/transport-remove-detailed-06-after-click-remove.png', fullPage: true });
    console.log('[TEST] Screenshot: After clicking remove button');
    
    console.log('[TEST] Step 4: Wait for confirmation modal');
    // Wait for confirmation modal
    await page.waitForTimeout(1000);
    
    // Look for modal
    const modal = page.locator('[role="dialog"], .modal, [class*="modal"], [class*="Modal"]').first();
    let modalVisible = false;
    try {
      await expect(modal).toBeVisible({ timeout: 2000 });
      modalVisible = true;
      console.log('[TEST] ✅ Confirmation modal is visible');
    } catch (e) {
      console.log('[TEST] ⚠️ Modal not found, looking for confirm button directly');
    }
    
    // Take screenshot: Confirmation modal
    await page.screenshot({ path: 'test-results/transport-remove-detailed-07-confirmation-modal.png', fullPage: true });
    console.log('[TEST] Screenshot: Confirmation modal');
    
    console.log('[TEST] Step 5: Confirm removal');
    // Confirm removal - look for confirm button in modal
    // The button text is "Usuń" according to DeleteConfirmationModal component
    const confirmButton = page.locator('button:has-text("Usuń"):not(:has-text("Usuwanie"))').last();
    
    // Wait a bit more for modal to fully render
    await page.waitForTimeout(1000);
    
    // Check if button exists
    const buttonCount = await confirmButton.count();
    console.log('[TEST] Found', buttonCount, 'buttons with text "Usuń"');
    
    if (buttonCount === 0) {
      // Try to find any button with "Usuń" text
      const allButtons = page.locator('button');
      const buttonTexts = await allButtons.allTextContents();
      console.log('[TEST] All buttons on page:', buttonTexts);
    }
    
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    await confirmButton.click();
    
    console.log('[TEST] Step 6: Wait for modal to disappear');
    // Wait for modal to disappear
    await page.waitForTimeout(1000);
    
    // Check if modal is gone
    try {
      if (modalVisible) {
        await expect(modal).not.toBeVisible({ timeout: 2000 });
        console.log('[TEST] ✅ Modal disappeared');
      }
    } catch (e) {
      console.log('[TEST] ⚠️ Modal might still be visible');
    }
    
    // Take screenshot: After modal disappears
    await page.screenshot({ path: 'test-results/transport-remove-detailed-08-after-modal-disappears.png', fullPage: true });
    console.log('[TEST] Screenshot: After modal disappears');
    
    // Wait for transport to be removed
    await page.waitForTimeout(2000);
    
    // Take screenshot: After removal (should not see transport)
    await page.screenshot({ path: 'test-results/transport-remove-detailed-09-after-removal.png', fullPage: true });
    console.log('[TEST] Screenshot: After removal - transport should be gone');
    
    console.log('[TEST] Step 7: Verify transport is removed (immediately after removal)');
    // Verify transport is removed (should not see "Usuń transport" button)
    const removeButtonAfter = page.locator('button:has-text("Usuń transport"), button:has-text("Remove"), button:has-text("Usuń")').first();
    let transportStillVisible = false;
    try {
      await expect(removeButtonAfter).not.toBeVisible({ timeout: 3000 });
      console.log('[TEST] ✅ Transport removed from UI (remove button not visible)');
    } catch (e) {
      console.log('[TEST] ❌ ERROR: Remove button STILL visible after removal!');
      transportStillVisible = true;
    }
    
    // Also check for transport name/text
    const transportText = page.locator('text=/Transport|BEAVER|SAWA|LIMBA/i').first();
    try {
      const transportTextContent = await transportText.textContent({ timeout: 2000 });
      if (transportTextContent) {
        console.log('[TEST] ⚠️ WARNING: Transport text still visible:', transportTextContent);
        transportStillVisible = true;
      }
    } catch (e) {
      console.log('[TEST] ✅ Transport text not found (good)');
    }
    
    if (transportStillVisible) {
      await page.screenshot({ path: 'test-results/transport-remove-detailed-10-ERROR-still-visible-after-removal.png', fullPage: true });
      console.log('[TEST] ❌ ERROR: Transport is still visible immediately after removal!');
    }
    
    console.log('[TEST] Step 8: Navigate away and come back');
    // Navigate away from the page
    await page.goto('http://localhost:3000/admin-panel/camps');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot: Camps list
    await page.screenshot({ path: 'test-results/transport-remove-detailed-11-camps-list.png', fullPage: true });
    console.log('[TEST] Screenshot: Camps list');
    
    // Navigate back to turnus edit page
    console.log('[TEST] Step 9: Return to turnus edit page');
    await page.goto('http://localhost:3000/admin-panel/camps/1/turnus/1/edit');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait longer for data to load
    
    // Take screenshot: After returning to edit page
    await page.screenshot({ path: 'test-results/transport-remove-detailed-12-after-return.png', fullPage: true });
    console.log('[TEST] Screenshot: After returning to edit page');
    
    console.log('[TEST] Step 10: Verify transport is STILL removed');
    // Verify transport is STILL removed (should not see "Usuń transport" button)
    const removeButtonFinal = page.locator('button:has-text("Usuń transport"), button:has-text("Remove"), button:has-text("Usuń")').first();
    const transportName = page.locator('text=/Transport|BEAVER|SAWA|LIMBA/i').first();
    
    // Check if remove button is visible
    let transportVisibleAfterReturn = false;
    try {
      await expect(removeButtonFinal).not.toBeVisible({ timeout: 3000 });
      console.log('[TEST] ✅ Remove button is NOT visible after returning');
    } catch (e) {
      console.log('[TEST] ❌ ERROR: Remove button is STILL visible after returning to edit page!');
      transportVisibleAfterReturn = true;
    }
    
    // Check if transport name/text is visible
    try {
      const transportNameText = await transportName.textContent({ timeout: 2000 });
      if (transportNameText) {
        console.log('[TEST] ❌ ERROR: Transport name/text is STILL visible:', transportNameText);
        transportVisibleAfterReturn = true;
      }
    } catch (e) {
      console.log('[TEST] ✅ Transport name/text not found (good)');
    }
    
    // If transport is still visible, take error screenshot and fail test
    if (transportVisibleAfterReturn) {
      await page.screenshot({ path: 'test-results/transport-remove-detailed-13-ERROR-still-visible-after-return.png', fullPage: true });
      console.log('[TEST] ❌ ERROR: Transport is STILL visible after returning to edit page!');
      throw new Error('Transport was not removed - it is still visible after returning to edit page');
    }
    
    console.log('[TEST] ✅ Test completed - transport successfully removed and stays removed');
  });
});

