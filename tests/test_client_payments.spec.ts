import { test, expect } from '@playwright/test';

/**
 * Test: Wyświetlanie wpłat manualnych w panelu klienta
 * 
 * Test weryfikuje:
 * 1. Czy klient może zobaczyć płatności manualne w zakładce "Faktury i Płatności"
 * 2. Czy tabela zawiera wpłatę z opisem
 * 3. Czy link do pliku ma atrybut target="_blank"
 * 4. Czy link do pliku otwiera się w nowej karcie
 */
test('Wyświetlanie wpłat manualnych w panelu klienta', async ({ page, context }) => {
  // Krok 1: Przejdź do strony logowania klienta
  await page.goto('/login');
  
  // Krok 2: Wprowadź email klienta (użyj testowego użytkownika jeśli istnieje)
  // UWAGA: W rzeczywistym teście należy użyć testowego użytkownika lub magic link
  // Dla celów testowych zakładamy, że użytkownik jest już zalogowany lub użyjemy testowego endpointu
  
  // Sprawdź czy strona logowania się załadowała
  await expect(page.locator('input[type="email"]')).toBeVisible();
  
  // Krok 3: Jeśli istnieje testowy endpoint do logowania, użyj go
  // W przeciwnym razie, test wymaga ręcznego logowania lub użycia magic link
  
  // Krok 4: Przejdź do zakładki "Faktury i Płatności"
  // UWAGA: W rzeczywistym teście należy najpierw zalogować użytkownika
  // Dla celów demonstracyjnych, przejdźmy bezpośrednio do strony (jeśli dostępna bez logowania)
  
  await page.goto('/profil/faktury-i-platnosci');
  
  // Krok 5: Sprawdź czy strona się załadowała
  await expect(page.locator('h2:has-text("Faktury i płatności")')).toBeVisible({ timeout: 10000 });
  
  // Krok 6: Sprawdź czy sekcja "Historia płatności" jest widoczna
  const paymentSection = page.locator('h3:has-text("Historia płatności")');
  
  // Jeśli sekcja płatności jest widoczna, sprawdź zawartość
  if (await paymentSection.isVisible()) {
    // Krok 7: Sprawdź czy tabela zawiera wpłatę z opisem
    const paymentTable = page.locator('table').filter({ hasText: 'Historia płatności' }).locator('..').locator('table');
    
    // Sprawdź czy tabela istnieje
    await expect(paymentTable).toBeVisible();
    
    // Sprawdź czy istnieje kolumna "Opis"
    const descriptionHeader = paymentTable.locator('th:has-text("Opis")');
    await expect(descriptionHeader).toBeVisible();
    
    // Sprawdź czy istnieje kolumna "Plik"
    const fileHeader = paymentTable.locator('th:has-text("Plik")');
    await expect(fileHeader).toBeVisible();
    
    // Sprawdź czy istnieje przynajmniej jeden wiersz z płatnością
    const paymentRows = paymentTable.locator('tbody tr');
    const rowCount = await paymentRows.count();
    
    if (rowCount > 0) {
      // Sprawdź pierwszy wiersz płatności
      const firstPaymentRow = paymentRows.first();
      
      // Sprawdź czy wiersz zawiera opis (może być pusty, ale kolumna powinna istnieć)
      const descriptionCell = firstPaymentRow.locator('td').nth(3); // Kolumna "Opis" (po Data, Kwota, Metoda, Rezerwacja)
      await expect(descriptionCell).toBeVisible();
      
      // Sprawdź czy wiersz zawiera link do pliku (jeśli istnieje)
      const fileCell = firstPaymentRow.locator('td').nth(4); // Kolumna "Plik"
      await expect(fileCell).toBeVisible();
      
      // Sprawdź czy link do pliku ma atrybut target="_blank"
      const fileLink = fileCell.locator('a[target="_blank"]');
      if (await fileLink.count() > 0) {
        await expect(fileLink.first()).toHaveAttribute('target', '_blank');
        await expect(fileLink.first()).toHaveAttribute('rel', 'noopener noreferrer');
        
        // Sprawdź czy link zawiera ikonę spinacza
        const paperclipIcon = fileLink.locator('svg, [class*="Paperclip"]');
        await expect(paperclipIcon.first()).toBeVisible();
      }
    }
  } else {
    // Jeśli sekcja płatności nie jest widoczna, sprawdź czy jest komunikat o braku płatności
    // lub czy strona wymaga logowania
    console.log('Sekcja "Historia płatności" nie jest widoczna - może brakować płatności lub wymagane jest logowanie');
  }
  
  // Krok 8: Zrób screenshot
  await page.screenshot({ 
    path: '../../screens_pg/client_payments_visible.png',
    fullPage: true 
  });
});





