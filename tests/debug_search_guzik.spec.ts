import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Test debugujący problem z wyszukiwaniem "guzik"
 * Mockuje API z prawdziwymi danymi z bazy
 */
test('Debug: wyszukiwanie guzik - sprawdź renderowanie danych', async ({ page }) => {
  // Upewnij się że folder screens_pg istnieje
  const screensDir = path.join(process.cwd(), '..', 'screens_pg');
  if (!fs.existsSync(screensDir)) {
    fs.mkdirSync(screensDir, { recursive: true });
  }

  // Mock auth
  await page.addInitScript(() => {
    localStorage.setItem('radsasfun_auth_token', 'test-token');
    localStorage.setItem('radsasfun_auth_user', JSON.stringify({
      id: 1,
      login: 'admin',
      user_type: 'admin',
      groups: ['admin'],
    }));
  });

  // Mock auth/me endpoint
  await page.route('**/api/auth/me', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        login: 'admin',
        user_type: 'admin',
        groups: ['admin'],
      }),
    });
  });

  // PRAWDZIWE DANE z bazy - rezerwacja 441 Tomasz Guzik
  const guzikReservation = {
    id: 441,
    camp_id: 1,
    property_id: 1,
    status: 'pending',
    payment_status: 'unpaid',
    total_price: 2160.0,
    deposit_amount: 500,
    created_at: '2026-01-20T22:09:03',
    camp_name: 'Akrobatyka',
    property_name: 'lato - BEAVER',
    property_city: 'BEAVER',
    property_period: 'lato',
    property_tag: 'B1',
    property_start_date: '2026-06-28',
    property_end_date: '2026-07-04',
    participant_first_name: 'Tomasz',
    participant_last_name: 'Guzik',
    participant_age: '2014',
    participant_city: 'Gdańsk',
    parents_data: [{
      id: '1',
      firstName: 'Szymon',
      lastName: 'Guzik',
      email: 'szymon.guzik@gmail.com',
      phone: '+48',
      phoneNumber: '735048660',
      street: 'Władysława jagiełly 2/20',
      postalCode: '80-180',
      city: 'Gdańsk'
    }],
    invoice_email: null,
    selected_protection: ['2'],
    selected_addons: [],
    selected_promotion: 634,
    promotion_name: 'Rabat rodzeństwo',
    departure_type: 'wlasny',
    departure_city: null,
    return_type: 'wlasny',
    return_city: null,
    contract_status: null,
    qualification_card_status: null,
    payment_plan: null,
    payments: [],
    manual_payments: [],
  };

  // Inna rezerwacja dla porównania
  const otherReservation = {
    id: 612,
    camp_id: 2,
    property_id: 5,
    status: 'pending',
    payment_status: 'unpaid',
    total_price: 3280.0,
    deposit_amount: 500,
    created_at: '2026-02-01T10:00:00',
    camp_name: 'Wakeboard',
    property_name: 'lato - Władysławowo',
    property_city: 'Władysławowo',
    property_period: 'lato',
    property_tag: 'W1',
    property_start_date: '2026-07-13',
    property_end_date: '2026-07-22',
    participant_first_name: 'Zofia',
    participant_last_name: 'Rębisz',
    participant_age: '2012',
    participant_city: 'Warszawa',
    parents_data: [{
      firstName: 'Anna',
      lastName: 'Rębisz',
      email: 'anna.rebisz@example.com',
      phoneNumber: '123456789',
    }],
    invoice_email: 'anna.rebisz@example.com',
    selected_protection: [],
    selected_addons: [],
    selected_promotion: null,
    promotion_name: null,
    departure_type: 'wlasny',
    departure_city: null,
    return_type: 'wlasny',
    return_city: null,
    contract_status: null,
    qualification_card_status: null,
    payment_plan: null,
    payments: [],
    manual_payments: [],
  };

  // Mock payments/paginated endpoint - zwraca wszystko bez filtra
  await page.route('**/api/payments/paginated**', (route) => {
    const url = route.request().url();
    console.log('API Request URL:', url);
    
    // Sprawdź czy to wyszukiwanie "guzik"
    if (url.includes('search=guzik')) {
      console.log('Returning guzik reservation');
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [guzikReservation],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
          filter_options: {
            campName: ['Akrobatyka', 'Wakeboard'],
            location: ['BEAVER', 'Władysławowo'],
            propertyTag: ['B1', 'W1'],
            participantCity: ['Gdańsk', 'Warszawa'],
            participantAge: ['2014', '2012'],
            participantName: ['Tomasz Guzik', 'Zofia Rębisz'],
            transportDeparture: [],
            transportReturn: [],
            promotionName: ['Rabat rodzeństwo'],
            protectionNames: [],
            status: ['Opłacone w całości', 'Częściowo opłacone', 'Nieopłacone'],
            qualificationCardStatus: [],
            contractStatus: [],
            hasOaza: ['Tak', 'Nie'],
            hasTarcza: ['Tak', 'Nie'],
            hasQuad: ['Tak', 'Nie'],
            hasSkuter: ['Tak', 'Nie'],
            hasEnergylandia: ['Tak', 'Nie'],
            hasTermy: ['Tak', 'Nie'],
            totalAmount: ['2160.00', '3280.00'],
            paidAmount: ['0.00'],
            remainingAmount: ['2160.00', '3280.00'],
          },
        }),
      });
    } else {
      // Zwróć wszystkie rezerwacje
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [otherReservation, guzikReservation],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
          filter_options: {
            campName: ['Akrobatyka', 'Wakeboard'],
            location: ['BEAVER', 'Władysławowo'],
            propertyTag: ['B1', 'W1'],
            participantCity: ['Gdańsk', 'Warszawa'],
            participantAge: ['2014', '2012'],
            participantName: ['Tomasz Guzik', 'Zofia Rębisz'],
            transportDeparture: [],
            transportReturn: [],
            promotionName: ['Rabat rodzeństwo'],
            protectionNames: [],
            status: ['Opłacone w całości', 'Częściowo opłacone', 'Nieopłacone'],
            qualificationCardStatus: [],
            contractStatus: [],
            hasOaza: ['Tak', 'Nie'],
            hasTarcza: ['Tak', 'Nie'],
            hasQuad: ['Tak', 'Nie'],
            hasSkuter: ['Tak', 'Nie'],
            hasEnergylandia: ['Tak', 'Nie'],
            hasTermy: ['Tak', 'Nie'],
            totalAmount: ['2160.00', '3280.00'],
            paidAmount: ['0.00'],
            remainingAmount: ['2160.00', '3280.00'],
          },
        }),
      });
    }
  });

  // Mock protections endpoint
  await page.route('**/api/camps/**/properties/**/protections', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 2, general_protection_id: 2, name: 'Oaza', price: 100 },
      ]),
    });
  });

  // Mock general protections
  await page.route('**/api/general-protections', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 2, name: 'Oaza', price: 100 },
      ]),
    });
  });

  // Mock general addons
  await page.route('**/api/general-addons', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Mock promotions
  await page.route('**/api/camps/**/properties/**/promotions', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Idź do admin-panel
  await page.goto('/admin-panel');
  
  // Poczekaj na załadowanie tabeli
  await page.waitForSelector('table', { timeout: 15000 });
  await page.waitForTimeout(3000);
  
  // Screenshot 1: Tabela z wszystkimi danymi
  await page.screenshot({ 
    path: path.join(screensDir, 'debug_1_tabela_wszystko.png'),
    fullPage: true 
  });
  
  // Pobierz dane pierwszego wiersza
  const rows = await page.locator('table tbody tr').all();
  console.log(`Liczba wierszy: ${rows.length}`);
  
  for (let i = 0; i < Math.min(rows.length, 3); i++) {
    const cells = await rows[i].locator('td').allTextContents();
    console.log(`=== WIERSZ ${i + 1} ===`);
    cells.forEach((cell, j) => {
      console.log(`  Kolumna ${j}: "${cell.substring(0, 50)}${cell.length > 50 ? '...' : ''}"`);
    });
  }
  
  // Znajdź pole wyszukiwania i wpisz "guzik"
  const searchInput = page.locator('input[placeholder*="Uczestnik"], input[placeholder*="Szukaj"]').first();
  await searchInput.fill('guzik');
  await searchInput.press('Enter');
  
  // Poczekaj na przeładowanie
  await page.waitForTimeout(3000);
  
  // Screenshot 2: Po wyszukaniu
  await page.screenshot({ 
    path: path.join(screensDir, 'debug_2_po_wyszukaniu_guzik.png'),
    fullPage: true 
  });
  
  // Pobierz dane wiersza po wyszukaniu
  const rowsAfter = await page.locator('table tbody tr').all();
  console.log(`\nLiczba wierszy po wyszukaniu: ${rowsAfter.length}`);
  
  if (rowsAfter.length > 0) {
    const cells = await rowsAfter[0].locator('td').allTextContents();
    console.log('=== WIERSZ GUZIK ===');
    cells.forEach((cell, j) => {
      console.log(`  Kolumna ${j}: "${cell}"`);
    });
    
    // Sprawdź czy są dane
    const hasReservationNumber = cells.some(c => c.includes('REZ-'));
    const hasAmount = cells.some(c => c.includes('2160') || c.includes('PLN'));
    const hasName = cells.some(c => c.includes('Guzik'));
    
    console.log('\n=== SPRAWDZENIE ===');
    console.log('Zawiera REZ-:', hasReservationNumber);
    console.log('Zawiera kwotę:', hasAmount);
    console.log('Zawiera Guzik:', hasName);
  }
});
