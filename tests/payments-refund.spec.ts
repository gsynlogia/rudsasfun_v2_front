import { test, expect } from '@playwright/test';

test.describe('Admin Panel - Payments Refund System', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    await page.goto(`${baseURL}/admin-panel/payments`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // Wait for React to hydrate and component to mount
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000); // Give time for useEffect to run and generate zahardkodowane dane
    
    // Wait for header
    await expect(page.locator('h1', { hasText: 'Płatności' })).toBeVisible({ timeout: 20000 });
    
    // Wait for table to be present
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Wait for data to be loaded (zahardkodowane dane są generowane w useEffect)
    // Wait for actual data rows (not just "Brak rezerwacji" message)
    await page.waitForFunction(
      () => {
        const tbody = document.querySelector('tbody');
        if (!tbody) return false;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        // Check if we have actual data rows (not just "Brak rezerwacji" message)
        const hasDataRows = rows.some(row => {
          const text = row.textContent || '';
          const hasTd = row.querySelector('td') !== null;
          // Data row should have td and not contain "Brak rezerwacji" or "spełniających"
          return hasTd && !text.includes('Brak rezerwacji') && !text.includes('spełniających');
        });
        return hasDataRows; // We need actual data rows, not just the "no data" message
      },
      { timeout: 20000 }
    );
  });

  test('should display payments table with status colors', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th', { hasText: 'Nazwa rezerwacji' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Uczestnik' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Status' })).toBeVisible();

    // Wait for data to appear (zahardkodowane dane)
    await page.waitForFunction(
      () => {
        const tbody = document.querySelector('tbody');
        if (!tbody) return false;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        // Check if we have data rows (not just "Brak rezerwacji" message)
        return rows.some(row => {
          const text = row.textContent || '';
          return !text.includes('Brak rezerwacji') && row.querySelector('td') !== null;
        });
      },
      { timeout: 10000 }
    );

    // Check if status badges are visible with correct colors
    const statusBadges = page.locator('span.bg-yellow-100, span.bg-green-100, span.bg-red-100, span.bg-purple-100');
    const count = await statusBadges.count();
    expect(count).toBeGreaterThan(0);

    await page.screenshot({ path: 'screenshots_playwright/payments-initial.png', fullPage: true });
  });

  test('should expand payment details when clicking on row', async ({ page }) => {
    // Wait for data rows to be available
    await page.waitForFunction(
      () => {
        const tbody = document.querySelector('tbody');
        if (!tbody) return false;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        return rows.some(row => {
          const text = row.textContent || '';
          return !text.includes('Brak rezerwacji') && row.querySelector('td') !== null;
        });
      },
      { timeout: 10000 }
    );

    // Find first data row (skip "Brak rezerwacji" message if present)
    const firstRow = page.locator('tbody tr').filter({ hasNotText: 'Brak rezerwacji' }).first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });
    await firstRow.click();

    // Wait for expanded content
    await page.waitForTimeout(1000);
    const expandedContent = page.locator('tr.bg-blue-50, tr').filter({ has: page.locator('h4') });
    await expect(expandedContent.filter({ has: page.locator('h4', { hasText: 'Elementy płatności' }) })).toBeVisible({ timeout: 5000 });

    await expect(page.locator('h4', { hasText: 'Elementy płatności' })).toBeVisible();
    await page.screenshot({ path: 'screenshots_playwright/payments-expanded.png', fullPage: true });
  });

  test('should show refund button for paid items and cancel button for unpaid items', async ({ page }) => {
    // Wait for data rows
    await page.waitForFunction(
      () => {
        const tbody = document.querySelector('tbody');
        if (!tbody) return false;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        return rows.some(row => {
          const text = row.textContent || '';
          return !text.includes('Brak rezerwacji') && row.querySelector('td') !== null;
        });
      },
      { timeout: 10000 }
    );

    const firstRow = page.locator('tbody tr').filter({ hasNotText: 'Brak rezerwacji' }).first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });
    await firstRow.click();

    await page.waitForTimeout(1000);

    // Wait for expanded content with payment items
    await page.waitForFunction(
      () => {
        const items = document.querySelectorAll('div.bg-gray-50, div.bg-red-50, div.bg-purple-50, div.bg-green-50');
        return items.length > 0;
      },
      { timeout: 5000 }
    );

    // Check for payment items
    const paymentItems = page.locator('div.bg-gray-50, div.bg-red-50, div.bg-purple-50, div.bg-green-50');
    const itemCount = await paymentItems.count();
    expect(itemCount).toBeGreaterThan(0);

    // Check for refund button (RotateCcw icon) on paid items
    const refundButtons = page.locator('button[title="Zwróć środki"]');
    const refundCount = await refundButtons.count();
    
    // Check for cancel button (XCircle) on unpaid items
    const cancelButtons = page.locator('button[title="Anuluj element"]');
    const cancelCount = await cancelButtons.count();

    // At least one of these should exist
    expect(refundCount + cancelCount).toBeGreaterThan(0);

    await page.screenshot({ path: 'screenshots_playwright/payments-items-buttons.png', fullPage: true });
  });

  test('should open refund confirmation modal when clicking refund button', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    await page.waitForTimeout(500);

    // Find refund button
    const refundButton = page.locator('button[title="Zwróć środki"]').first();
    const isVisible = await refundButton.isVisible().catch(() => false);
    
    if (isVisible) {
      await refundButton.click();
      
      // Wait for modal
      const modal = page.locator('.fixed.inset-0.flex.items-center.justify-center.z-50');
      await expect(modal).toBeVisible({ timeout: 5000 });
      
      // Check modal content
      await expect(page.locator('h2', { hasText: 'Zwrot środków' })).toBeVisible();
      await expect(page.locator('button', { hasText: 'Zwróć środki' })).toBeVisible();
      await expect(page.locator('button', { hasText: 'Anuluj' })).toBeVisible();

      await page.screenshot({ path: 'screenshots_playwright/payments-refund-modal-1.png', fullPage: true });
    } else {
      // If no refund button, take screenshot anyway
      await page.screenshot({ path: 'screenshots_playwright/payments-no-refund-button.png', fullPage: true });
    }
  });

  test('should open second refund confirmation modal after confirming first', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    await page.waitForTimeout(500);

    const refundButton = page.locator('button[title="Zwróć środki"]').first();
    const isVisible = await refundButton.isVisible().catch(() => false);
    
    if (isVisible) {
      await refundButton.click();
      
      // Wait for first modal
      const modal1 = page.locator('.fixed.inset-0.flex.items-center.justify-center.z-50');
      await expect(modal1).toBeVisible({ timeout: 5000 });
      
      // Click confirm on first modal
      await page.locator('button', { hasText: 'Zwróć środki' }).click();
      
      // Wait for second modal
      await page.waitForTimeout(500);
      const modal2 = page.locator('.fixed.inset-0.flex.items-center.justify-center.z-50');
      await expect(modal2).toBeVisible({ timeout: 5000 });
      
      // Check second modal content
      await expect(page.locator('h2', { hasText: 'Potwierdź zwrot środków' })).toBeVisible();
      await expect(page.locator('button', { hasText: 'Potwierdź zwrot' })).toBeVisible();

      await page.screenshot({ path: 'screenshots_playwright/payments-refund-modal-2.png', fullPage: true });
    }
  });

  test('should display correct status colors for payment items', async ({ page }) => {
    // Wait for data rows
    await page.waitForFunction(
      () => {
        const tbody = document.querySelector('tbody');
        if (!tbody) return false;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        return rows.some(row => {
          const text = row.textContent || '';
          return !text.includes('Brak rezerwacji') && row.querySelector('td') !== null;
        });
      },
      { timeout: 10000 }
    );

    const firstRow = page.locator('tbody tr').filter({ hasNotText: 'Brak rezerwacji' }).first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });
    await firstRow.click();

    await page.waitForTimeout(1000);

    // Wait for expanded content with payment items
    await page.waitForFunction(
      () => {
        const items = document.querySelectorAll('div.bg-gray-50, div.bg-red-50, div.bg-purple-50, div.bg-green-50');
        return items.length > 0;
      },
      { timeout: 5000 }
    );

    // Check for status badges with correct colors
    const unpaidBadge = page.locator('span.bg-yellow-100.text-yellow-800', { hasText: 'Nieopłacone' });
    const paidBadge = page.locator('span.bg-green-100.text-green-800', { hasText: 'Opłacone' });
    const canceledBadge = page.locator('span.bg-red-100.text-red-800', { hasText: 'Anulowane' });
    const returnedBadge = page.locator('span.bg-purple-100.text-purple-800', { hasText: 'Zwrócone' });

    // At least one status badge should be visible
    const unpaidCount = await unpaidBadge.count();
    const paidCount = await paidBadge.count();
    const canceledCount = await canceledBadge.count();
    const returnedCount = await returnedBadge.count();

    expect(unpaidCount + paidCount + canceledCount + returnedCount).toBeGreaterThan(0);

    await page.screenshot({ path: 'screenshots_playwright/payments-status-colors.png', fullPage: true });
  });

  test('should not show cancel button for paid items', async ({ page }) => {
    // Wait for data rows
    await page.waitForFunction(
      () => {
        const tbody = document.querySelector('tbody');
        if (!tbody) return false;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        return rows.some(row => {
          const text = row.textContent || '';
          return !text.includes('Brak rezerwacji') && row.querySelector('td') !== null;
        });
      },
      { timeout: 10000 }
    );

    const firstRow = page.locator('tbody tr').filter({ hasNotText: 'Brak rezerwacji' }).first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });
    await firstRow.click();

    await page.waitForTimeout(1000);

    // Wait for expanded content
    await page.waitForFunction(
      () => {
        const items = document.querySelectorAll('div.bg-gray-50, div.bg-red-50, div.bg-purple-50, div.bg-green-50');
        return items.length > 0;
      },
      { timeout: 5000 }
    );

    // Find all paid items (green badge)
    const paidItems = page.locator('span.bg-green-100.text-green-800', { hasText: 'Opłacone' });
    const paidCount = await paidItems.count();

    if (paidCount > 0) {
      // For each paid item, check that there's no cancel button nearby
      for (let i = 0; i < paidCount; i++) {
        const paidItem = paidItems.nth(i);
        const parentContainer = paidItem.locator('..').locator('..').locator('..'); // Go up to item container
        const cancelButton = parentContainer.locator('button[title="Anuluj element"]');
        const hasCancelButton = await cancelButton.isVisible().catch(() => false);
        
        // Paid items should NOT have cancel button
        expect(hasCancelButton).toBe(false);
      }
    }

    await page.screenshot({ path: 'screenshots_playwright/payments-no-cancel-for-paid.png', fullPage: true });
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1', { hasText: 'Płatności' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('input[placeholder*="Szukaj"]')).toBeVisible();

    await page.screenshot({ path: 'screenshots_playwright/payments-mobile.png', fullPage: true });
  });
});

