import { test, expect } from '@playwright/test';
import path from 'path';

test('Admin: filtry otwieraja sie w modalu na srodku (rezerwacje)', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('radsasfun_auth_token', 'test-token');
    localStorage.setItem('radsasfun_auth_user', JSON.stringify({
      id: 0,
      login: 'admin',
      user_type: 'admin',
      groups: ['admin'],
    }));
  });

  await page.route('**/api/auth/me', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 0,
        login: 'admin',
        user_type: 'admin',
        groups: ['admin'],
      }),
    });
  });

  await page.route('**/api/reservations/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          participant_first_name: 'Jan',
          participant_last_name: 'Kowalski',
          camp_name: 'Oboz testowy',
          property_name: 'Lato - Wladyslawowo',
          property_period: 'lato',
          property_city: 'Wladyslawowo',
          property_tag: 'B1',
          camp_id: 1,
          property_id: 1,
          selected_promotion: null,
          status: 'pending',
          total_price: 1999,
          created_at: '2026-01-21T00:00:00Z',
          parents_data: [
            {
              firstName: 'Anna',
              lastName: 'Kowalska',
              email: 'anna.kowalska@example.com',
              phoneNumber: '123456789',
            },
          ],
        },
      ]),
    });
  });

  await page.route('**/api/camps/**/properties/**/promotions', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/general-promotions/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ name: 'Promocja testowa' }),
    });
  });

  await page.goto('/admin-panel');

  const emailHeader = page.locator('th', { hasText: 'Email' });
  await expect(emailHeader).toBeVisible();

  await emailHeader.locator('button[title="Filtruj"]').click();

  await expect(page.getByText('Wybierz wartości do filtrowania')).toBeVisible();
  await expect(page.getByText('anna.kowalska@example.com')).toBeVisible();

  const screenshotPath = path.join(process.cwd(), '..', 'screens_pg', 'admin_filters_modal_reservations.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
});
