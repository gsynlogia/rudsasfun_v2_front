import { test, expect } from '@playwright/test';

test.describe('Admin Panel - Reservations Details and Actions', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Navigate to reservations page
    await page.goto(`${baseURL}/admin-panel/reservations`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Wait for reservations table to load
    await page.waitForFunction(
      () => {
        const table = document.querySelector('table');
        return table !== null;
      },
      { timeout: 10000 }
    );
    
    // Wait a bit for data generation
    await page.waitForTimeout(1000);
  });

  test('should display reservations list with action icons', async ({ page }) => {
    // Check if reservations table is visible
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
    
    // Check if action column header exists
    await expect(page.locator('th', { hasText: 'Akcje' })).toBeVisible({ timeout: 5000 });
    
    // Check if at least one reservation row exists
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });
    
    // Check if edit and delete icons are present in the first row
    const editButton = firstRow.locator('button[title="Edytuj"]');
    const deleteButton = firstRow.locator('button[title="Usuń"]');
    
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ 
      path: 'screenshots_playwright/reservations-list-with-actions.png',
      fullPage: true 
    });
  });

  test('should expand reservation details when clicking on row', async ({ page }) => {
    // Get first reservation row
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });
    
    // Click on the row to expand
    await firstRow.click();
    
    // Wait for details to appear
    await page.waitForTimeout(500);
    
    // Check if details section is visible (expanded row with colspan)
    const detailsRow = page.locator('tbody tr').nth(1);
    const detailsCell = detailsRow.locator('td[colspan="8"]');
    await expect(detailsCell).toBeVisible({ timeout: 5000 });
    
    // Check if detail sections are present
    await expect(detailsCell.locator('text=Dane uczestnika')).toBeVisible({ timeout: 5000 });
    await expect(detailsCell.locator('text=Dane opiekuna')).toBeVisible({ timeout: 5000 });
    await expect(detailsCell.locator('text=Płatności')).toBeVisible({ timeout: 5000 });
    await expect(detailsCell.locator('text=Dodatkowe informacje')).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ 
      path: 'screenshots_playwright/reservations-expanded-details.png',
      fullPage: true 
    });
    
    // Click again to collapse
    await firstRow.click();
    await page.waitForTimeout(500);
    
    // Details should be hidden
    const detailsAfterCollapse = page.locator('tbody tr').nth(1);
    const isDetailsVisible = await detailsAfterCollapse.locator('td[colspan="8"]').isVisible().catch(() => false);
    expect(isDetailsVisible).toBeFalsy();
  });

  test('should navigate to edit page when clicking edit icon', async ({ page }) => {
    // Get first reservation row
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });
    
    // Click edit button (stop propagation to prevent row expansion)
    const editButton = firstRow.locator('button[title="Edytuj"]');
    await editButton.click();
    
    // Wait for navigation to edit page
    await page.waitForURL('**/admin-panel/reservations/*/edit', { timeout: 10000 });
    
    // Check if edit page is visible
    await expect(page.locator('h1', { hasText: 'Edytuj rezerwację' })).toBeVisible({ timeout: 5000 });
    
    // Check if form fields are present
    await expect(page.locator('label', { hasText: 'Nazwa rezerwacji' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('label', { hasText: 'Uczestnik' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('label', { hasText: 'Email' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('label', { hasText: 'Status' })).toBeVisible({ timeout: 5000 });
    
    // Check if buttons are present
    await expect(page.locator('button', { hasText: 'Anuluj' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button', { hasText: 'Zapisz' })).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ 
      path: 'screenshots_playwright/reservations-edit-page.png',
      fullPage: true 
    });
  });

  test('should return to list when clicking cancel on edit page', async ({ page }) => {
    // Navigate to edit page
    await page.goto(`${baseURL}/admin-panel/reservations/1/edit`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Check if edit page is visible
    await expect(page.locator('h1', { hasText: 'Edytuj rezerwację' })).toBeVisible({ timeout: 5000 });
    
    // Click cancel button
    await page.locator('button', { hasText: 'Anuluj' }).click();
    await page.waitForTimeout(500);
    
    // Should return to reservations list
    await page.waitForURL('**/admin-panel/reservations', { timeout: 10000 });
    await expect(page.locator('h1', { hasText: 'Rezerwacje' })).toBeVisible({ timeout: 5000 });
  });

  test('should open delete confirmation modal with transparent background when clicking delete icon', async ({ page }) => {
    // Get first reservation row
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });
    
    // Get reservation name for verification
    const reservationName = await firstRow.locator('td').first().textContent();
    
    // Click delete button
    const deleteButton = firstRow.locator('button[title="Usuń"]');
    await deleteButton.click();
    
    // Wait for modal to appear with animation
    await page.waitForTimeout(600);
    
    // Check if delete modal is visible (with transparent background)
    const deleteModal = page.locator('div[class*="fixed"]').filter({ hasText: 'Potwierdź usunięcie' });
    await expect(deleteModal).toBeVisible({ timeout: 5000 });
    
    // Check if modal has white background element
    const whiteModal = deleteModal.locator('div[class*="bg-white"]');
    await expect(whiteModal).toBeVisible({ timeout: 5000 });
    
    // Check if modal title is present
    await expect(page.locator('h2', { hasText: 'Potwierdź usunięcie' })).toBeVisible({ timeout: 5000 });
    
    // Check if confirmation message contains reservation name
    if (reservationName) {
      const modalText = await deleteModal.textContent();
      expect(modalText).toContain(reservationName.trim());
    }
    
    // Check if buttons are present
    await expect(page.locator('button', { hasText: 'Anuluj' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button', { hasText: 'Usuń' })).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ 
      path: 'screenshots_playwright/reservations-delete-modal-transparent.png',
      fullPage: true 
    });
  });

  test('should close delete modal when clicking cancel', async ({ page }) => {
    // Get first reservation row
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });
    
    // Open delete modal
    const deleteButton = firstRow.locator('button[title="Usuń"]');
    await deleteButton.click();
    await page.waitForTimeout(500);
    
    // Check if modal is visible
    await expect(page.locator('h2', { hasText: 'Potwierdź usunięcie' })).toBeVisible({ timeout: 5000 });
    
    // Click cancel button
    await page.locator('button', { hasText: 'Anuluj' }).first().click();
    await page.waitForTimeout(500);
    
    // Modal should be closed
    const modalAfterClose = page.locator('h2', { hasText: 'Potwierdź usunięcie' });
    const isModalVisible = await modalAfterClose.isVisible().catch(() => false);
    expect(isModalVisible).toBeFalsy();
  });

  test('should confirm delete (without actual deletion)', async ({ page }) => {
    // Get first reservation row
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });
    
    // Get reservation name before deletion
    const reservationNameBefore = await firstRow.locator('td').first().textContent();
    
    // Open delete modal
    const deleteButton = firstRow.locator('button[title="Usuń"]');
    await deleteButton.click();
    await page.waitForTimeout(500);
    
    // Confirm deletion
    await page.locator('button', { hasText: 'Usuń' }).click();
    await page.waitForTimeout(500);
    
    // Modal should be closed
    const modalAfterConfirm = page.locator('h2', { hasText: 'Potwierdź usunięcie' });
    const isModalVisible = await modalAfterConfirm.isVisible().catch(() => false);
    expect(isModalVisible).toBeFalsy();
    
    // Reservation should still be visible (no actual deletion)
    const firstRowAfter = page.locator('tbody tr').first();
    const reservationNameAfter = await firstRowAfter.locator('td').first().textContent();
    expect(reservationNameAfter).toBe(reservationNameBefore);
  });

  test('should display detailed information in expanded row', async ({ page }) => {
    // Get first reservation row
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });
    
    // Click to expand
    await firstRow.click();
    await page.waitForTimeout(500);
    
    // Get details row
    const detailsRow = page.locator('tbody tr').nth(1);
    const detailsCell = detailsRow.locator('td[colspan="8"]');
    await expect(detailsCell).toBeVisible({ timeout: 5000 });
    
    // Check participant details
    await expect(detailsCell.locator('text=Telefon:').first()).toBeVisible({ timeout: 5000 });
    await expect(detailsCell.locator('text=Adres:')).toBeVisible({ timeout: 5000 });
    await expect(detailsCell.locator('text=Data urodzenia:')).toBeVisible({ timeout: 5000 });
    
    // Check parent details
    await expect(detailsCell.locator('text=Imię i nazwisko:')).toBeVisible({ timeout: 5000 });
    
    // Check payment details
    await expect(detailsCell.locator('text=Status:')).toBeVisible({ timeout: 5000 });
    await expect(detailsCell.locator('text=Kwota:')).toBeVisible({ timeout: 5000 });
    
    // Check additional info
    await expect(detailsCell.locator('text=Dieta:')).toBeVisible({ timeout: 5000 });
    await expect(detailsCell.locator('text=Informacje medyczne:')).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ 
      path: 'screenshots_playwright/reservations-detailed-info.png',
      fullPage: true 
    });
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to reservations
    await page.goto(`${baseURL}/admin-panel/reservations`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Check if table is visible (should be scrollable)
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
    
    // Get first row
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });
    
    // Check if action buttons are visible
    const editButton = firstRow.locator('button[title="Edytuj"]');
    const deleteButton = firstRow.locator('button[title="Usuń"]');
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    
    // Expand row
    await firstRow.click();
    await page.waitForTimeout(500);
    
    // Check if details are visible
    const detailsRow = page.locator('tbody tr').nth(1);
    await expect(detailsRow.locator('text=Dane uczestnika')).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ 
      path: 'screenshots_playwright/reservations-mobile-view.png',
      fullPage: true 
    });
  });
});

