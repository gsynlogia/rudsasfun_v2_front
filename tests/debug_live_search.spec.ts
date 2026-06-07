import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Test na PRAWDZIWEJ aplikacji - porównanie tabeli przed i po wyszukaniu
 */
test.describe('Live debug: tabela przed i po wyszukaniu', () => {
  const screensDir = path.join(process.cwd(), '..', 'screens_pg');

  test.beforeAll(() => {
    if (!fs.existsSync(screensDir)) {
      fs.mkdirSync(screensDir, { recursive: true });
    }
  });

  test('Porównaj wyświetlanie tabeli', async ({ page }) => {
    // Logowanie - użyj poprawnych danych
    await page.goto('http://localhost:3000/login');
    
    // Poczekaj na formularz logowania
    await page.waitForSelector('input[type="text"], input[type="email"]', { timeout: 10000 });
    
    // Wpisz dane logowania
    await page.fill('input[type="text"], input[type="email"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    
    // Kliknij przycisk logowania
    await page.click('button[type="submit"]');
    
    // Poczekaj na przekierowanie do admin-panel
    await page.waitForURL('**/admin-panel**', { timeout: 15000 });
    
    console.log('✅ Zalogowano pomyślnie');
    
    // Poczekaj na załadowanie tabeli
    await page.waitForSelector('table tbody tr', { timeout: 20000 });
    await page.waitForTimeout(2000); // dodatkowy czas na dane
    
    // Screenshot 1: Tabela BEZ wyszukiwania
    await page.screenshot({ 
      path: path.join(screensDir, 'live_1_bez_wyszukiwania.png'),
      fullPage: true 
    });
    console.log('📸 Screenshot 1: tabela bez wyszukiwania');
    
    // Wypisz zawartość pierwszych wierszy
    const rowsBefore = await page.locator('table tbody tr').all();
    console.log(`\n=== TABELA BEZ WYSZUKIWANIA (${rowsBefore.length} wierszy) ===`);
    
    for (let i = 0; i < Math.min(rowsBefore.length, 2); i++) {
      const cells = await rowsBefore[i].locator('td').allTextContents();
      console.log(`\nWiersz ${i + 1}:`);
      cells.slice(0, 8).forEach((cell, j) => {
        const text = cell.trim().substring(0, 40);
        if (text) console.log(`  [${j}]: "${text}"`);
      });
    }
    
    // Teraz wyszukaj "guzik"
    console.log('\n🔍 Wyszukuję "guzik"...');
    
    // Znajdź pole wyszukiwania
    const searchInput = page.locator('input[placeholder*="Uczestnik"], input[placeholder*="Szukaj"], input[placeholder*="szukaj"]').first();
    await searchInput.click();
    await searchInput.fill('guzik');
    await searchInput.press('Enter');
    
    // Poczekaj na przeładowanie danych
    await page.waitForTimeout(3000);
    
    // Screenshot 2: Tabela PO wyszukaniu
    await page.screenshot({ 
      path: path.join(screensDir, 'live_2_po_wyszukaniu_guzik.png'),
      fullPage: true 
    });
    console.log('📸 Screenshot 2: tabela po wyszukaniu "guzik"');
    
    // Wypisz zawartość wierszy PO wyszukaniu
    const rowsAfter = await page.locator('table tbody tr').all();
    console.log(`\n=== TABELA PO WYSZUKANIU "guzik" (${rowsAfter.length} wierszy) ===`);
    
    for (let i = 0; i < Math.min(rowsAfter.length, 2); i++) {
      const cells = await rowsAfter[i].locator('td').allTextContents();
      console.log(`\nWiersz ${i + 1}:`);
      cells.forEach((cell, j) => {
        const text = cell.trim().substring(0, 40);
        console.log(`  [${j}]: "${text || '(PUSTE)'}"`);
      });
    }
    
    // Sprawdź konsole przeglądarki
    page.on('console', msg => {
      if (msg.text().includes('[DEBUG')) {
        console.log('CONSOLE:', msg.text());
      }
    });
    
    // Poczekaj chwilę żeby zobaczyć
    await page.waitForTimeout(5000);
  });
});
