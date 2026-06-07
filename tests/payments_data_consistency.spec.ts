import { test, expect } from '@playwright/test';

/**
 * Test sprawdzający zgodność danych wpłat między:
 * - Tabela /admin-panel/payments (kolumny Wpłata 1/2/3, Data wpłaty 1/2/3)
 * - Szczegóły płatności /admin-panel/rezerwacja/{id}/payments (sekcja Wpłaty)
 * 
 * KRYTYCZNE: Dane w szczegółach płatności są READ-ONLY i są źródłem prawdy!
 */

const ADMIN_EMAIL = 'admin@radsas-fun.pl';
const ADMIN_PASSWORD = 'Radsas2008!';
const TEST_RESERVATION = 'REZ-2025-031'; // Rezerwacja do testowania

test.describe('Zgodność danych płatności', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/admin-panel/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/admin-panel(?!\/login)/);
  });

  test('Porównaj dane wpłat z tabeli z szczegółami płatności', async ({ page }) => {
    // 1. Pobierz dane ze szczegółów płatności (READ-ONLY - źródło prawdy)
    await page.goto(`/admin-panel/rezerwacja/${TEST_RESERVATION}/payments`);
    await page.waitForSelector('table');
    
    // Pobierz wszystkie wpłaty z tabeli szczegółów (sekcja Wpłaty)
    const detailPaymentsTable = page.locator('h2:has-text("Wpłaty")').locator('..').locator('table');
    const detailRows = await detailPaymentsTable.locator('tbody tr').all();
    
    const detailPayments: Array<{date: string, amount: string, method: string}> = [];
    
    for (const row of detailRows) {
      const cells = await row.locator('td').all();
      if (cells.length >= 3) {
        const date = await cells[0].textContent() || '-';
        const amount = await cells[1].textContent() || '-';
        const method = await cells[2].textContent() || '-';
        
        // Skip "Brak wpłat" row
        if (!date.includes('Brak wpłat')) {
          detailPayments.push({ date: date.trim(), amount: amount.trim(), method: method.trim() });
        }
      }
    }
    
    console.log('=== SZCZEGÓŁY PŁATNOŚCI (READ-ONLY - źródło prawdy) ===');
    console.log(`Rezerwacja: ${TEST_RESERVATION}`);
    console.log(`Liczba wpłat: ${detailPayments.length}`);
    detailPayments.forEach((p, i) => {
      console.log(`  Wpłata ${i+1}: ${p.date} | ${p.amount} | ${p.method}`);
    });
    
    // Posortuj wpłaty po dacie (od najstarszej) - to samo sortowanie co w PaymentsManagement
    const sortedDetailPayments = [...detailPayments].sort((a, b) => {
      // Parse Polish date format DD.MM.YYYY, HH:MM
      const parsePolishDate = (dateStr: string) => {
        const match = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (match) {
          return new Date(`${match[3]}-${match[2]}-${match[1]}`).getTime();
        }
        return 0;
      };
      return parsePolishDate(a.date) - parsePolishDate(b.date);
    });
    
    console.log('\n=== PO SORTOWANIU (najstarsza pierwsza) ===');
    sortedDetailPayments.forEach((p, i) => {
      console.log(`  Wpłata ${i+1}: ${p.date} | ${p.amount} | ${p.method}`);
    });
    
    // 2. Teraz przejdź do tabeli płatności i znajdź tę rezerwację
    // Użyj wyszukiwarki żeby znaleźć tę rezerwację
    await page.goto(`/admin-panel/payments?search=${TEST_RESERVATION}`);
    await page.waitForSelector('table');
    await page.waitForTimeout(2000); // Poczekaj na załadowanie danych
    
    // Znajdź wiersz z naszą rezerwacją
    const tableRow = page.locator(`tr:has-text("${TEST_RESERVATION}")`).first();
    const rowExists = await tableRow.count() > 0;
    
    if (!rowExists) {
      console.log('\n=== TABELA PŁATNOŚCI ===');
      console.log(`Nie znaleziono rezerwacji ${TEST_RESERVATION} w tabeli!`);
      
      // Screenshot for debugging
      await page.screenshot({ path: `screens_pg/payments_table_${TEST_RESERVATION}.png`, fullPage: true });
      return;
    }
    
    // Pobierz dane z kolumn Wpłata 1/2/3 i Data wpłaty 1/2/3
    // Musimy najpierw sprawdzić jakie kolumny są widoczne
    const headers = await page.locator('thead th').allTextContents();
    console.log('\n=== NAGŁÓWKI TABELI ===');
    console.log(headers.join(' | '));
    
    // Znajdź indeksy kolumn
    const findColumnIndex = (name: string) => headers.findIndex(h => h.includes(name));
    
    const payment1AmountIdx = findColumnIndex('Wpłata 1');
    const payment1DateIdx = findColumnIndex('Data wpłaty 1');
    const payment2AmountIdx = findColumnIndex('Wpłata 2');
    const payment2DateIdx = findColumnIndex('Data wpłaty 2');
    const payment3AmountIdx = findColumnIndex('Wpłata 3');
    const payment3DateIdx = findColumnIndex('Data wpłaty 3');
    
    const cells = await tableRow.locator('td').allTextContents();
    
    console.log('\n=== TABELA PŁATNOŚCI ===');
    console.log(`Rezerwacja: ${TEST_RESERVATION}`);
    
    const tablePayments: Array<{amount: string, date: string}> = [];
    
    if (payment1AmountIdx >= 0 && payment1AmountIdx < cells.length) {
      const amount = cells[payment1AmountIdx] || '-';
      const date = payment1DateIdx >= 0 ? cells[payment1DateIdx] || '-' : '-';
      console.log(`  Wpłata 1: ${date} | ${amount}`);
      tablePayments.push({ amount, date });
    }
    
    if (payment2AmountIdx >= 0 && payment2AmountIdx < cells.length) {
      const amount = cells[payment2AmountIdx] || '-';
      const date = payment2DateIdx >= 0 ? cells[payment2DateIdx] || '-' : '-';
      console.log(`  Wpłata 2: ${date} | ${amount}`);
      tablePayments.push({ amount, date });
    }
    
    if (payment3AmountIdx >= 0 && payment3AmountIdx < cells.length) {
      const amount = cells[payment3AmountIdx] || '-';
      const date = payment3DateIdx >= 0 ? cells[payment3DateIdx] || '-' : '-';
      console.log(`  Wpłata 3: ${date} | ${amount}`);
      tablePayments.push({ amount, date });
    }
    
    // 3. Porównaj dane
    console.log('\n=== PORÓWNANIE ===');
    let hasErrors = false;
    
    for (let i = 0; i < 3; i++) {
      const expectedPayment = sortedDetailPayments[i];
      const actualPayment = tablePayments[i];
      
      if (expectedPayment && actualPayment) {
        // Normalizuj kwotę do porównania (usuń "PLN", spacje, zamień , na .)
        const normalizeAmount = (s: string) => s.replace(/[^\d.,]/g, '').replace(',', '.').trim();
        const normalizeDate = (s: string) => s.split(',')[0].trim(); // Weź tylko datę bez czasu
        
        const expectedAmount = normalizeAmount(expectedPayment.amount);
        const actualAmount = normalizeAmount(actualPayment.amount);
        const expectedDate = normalizeDate(expectedPayment.date);
        const actualDate = normalizeDate(actualPayment.date);
        
        const amountMatch = expectedAmount === actualAmount || actualPayment.amount === '-';
        const dateMatch = expectedDate === actualDate || actualPayment.date === '-';
        
        if (!amountMatch || !dateMatch) {
          console.log(`  ❌ Wpłata ${i+1}: NIEZGODNOŚĆ`);
          console.log(`     Oczekiwana kwota: ${expectedPayment.amount} (${expectedAmount})`);
          console.log(`     Aktualna kwota: ${actualPayment.amount} (${actualAmount})`);
          console.log(`     Oczekiwana data: ${expectedPayment.date} (${expectedDate})`);
          console.log(`     Aktualna data: ${actualPayment.date} (${actualDate})`);
          hasErrors = true;
        } else {
          console.log(`  ✓ Wpłata ${i+1}: OK`);
        }
      } else if (expectedPayment && !actualPayment) {
        console.log(`  ❌ Wpłata ${i+1}: Brak danych w tabeli (oczekiwano: ${expectedPayment.amount})`);
        hasErrors = true;
      } else if (!expectedPayment && actualPayment && actualPayment.amount !== '-') {
        console.log(`  ❌ Wpłata ${i+1}: Nadmiarowe dane w tabeli (${actualPayment.amount})`);
        hasErrors = true;
      } else {
        console.log(`  ✓ Wpłata ${i+1}: OK (brak wpłaty)`);
      }
    }
    
    // Screenshot
    await page.screenshot({ path: `screens_pg/payments_comparison_${TEST_RESERVATION}.png`, fullPage: true });
    
    if (hasErrors) {
      console.log('\n⚠️ WYKRYTO NIEZGODNOŚCI! Dane w tabeli nie odpowiadają szczegółom płatności.');
    } else {
      console.log('\n✓ Dane są zgodne.');
    }
  });
  
  test('Wylistuj wszystkie kolumny w tabeli płatności', async ({ page }) => {
    await page.goto('/admin-panel/payments');
    await page.waitForSelector('table');
    await page.waitForTimeout(2000);
    
    const headers = await page.locator('thead th').allTextContents();
    
    console.log('=== WSZYSTKIE KOLUMNY W TABELI PŁATNOŚCI ===');
    headers.forEach((h, i) => {
      console.log(`  ${i+1}. ${h}`);
    });
    
    // Policz kolumny związane z wpłatami
    const paymentColumns = headers.filter(h => h.includes('Wpłata') || h.includes('wpłata') || h.includes('Data wpłaty'));
    console.log(`\nLiczba kolumn związanych z wpłatami: ${paymentColumns.length}`);
    paymentColumns.forEach(h => console.log(`  - ${h}`));
    
    await page.screenshot({ path: 'screens_pg/payments_table_columns.png', fullPage: true });
  });
});
