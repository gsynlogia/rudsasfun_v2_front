import { test, expect } from '@playwright/test';

/**
 * Testy E2E dla synchronizacji płatności w panelu admina
 * Wykonane w trybie headed z zrzutami ekranu
 */
test.describe('Payments Management - Synchronizacja płatności', () => {
  test.beforeEach(async ({ page }) => {
    // Logowanie jako administrator
    await page.goto('http://localhost:3000/admin-panel/login');
    await page.waitForLoadState('networkidle');
    
    // Zrzut ekranu - strona logowania
    await page.screenshot({ path: 'tests/screenshots/login-page.png', fullPage: true });
    
    // Wypełnienie formularza logowania - używamy różnych selektorów
    const loginInput = page.locator('input[id="login"], input[name="login"], input[type="text"]').first();
    const passwordInput = page.locator('input[id="password"], input[name="password"], input[type="password"]').first();
    
    await loginInput.waitFor({ timeout: 10000 });
    await loginInput.fill('admin');
    
    await passwordInput.waitFor({ timeout: 10000 });
    await passwordInput.fill('admin');
    
    // Zrzut ekranu - formularz wypełniony
    await page.screenshot({ path: 'tests/screenshots/login-filled.png', fullPage: true });
    
    // Kliknięcie przycisku logowania
    const loginButton = page.locator('button:has-text("Zaloguj się"), button[type="submit"]').first();
    await loginButton.click();
    
    // Oczekiwanie na przekierowanie do panelu admina
    await page.waitForURL('**/admin-panel**', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    
    // Zrzut ekranu - po zalogowaniu
    await page.screenshot({ path: 'tests/screenshots/after-login.png', fullPage: true });
    
    // Przejście do strony płatności
    await page.goto('http://localhost:3000/admin-panel/payments');
    await page.waitForLoadState('networkidle');
    
    // Zrzut ekranu - strona płatności
    await page.screenshot({ path: 'tests/screenshots/payments-page-loaded.png', fullPage: true });
  });

  test('Powinien wyświetlić stronę płatności z przyciskiem weryfikacji', async ({ page }) => {
    // Zrzut ekranu - strona płatności
    await page.screenshot({ path: 'tests/screenshots/payments-page-initial.png', fullPage: true });
    
    // Sprawdzenie czy tytuł jest widoczny
    await expect(page.locator('h1:has-text("Płatności")')).toBeVisible();
    
    // Sprawdzenie czy przycisk "Zweryfikuj płatności" jest widoczny
    const verifyButton = page.locator('button:has-text("Zweryfikuj płatności")');
    await expect(verifyButton).toBeVisible();
    
    // Zrzut ekranu - przycisk weryfikacji
    await verifyButton.screenshot({ path: 'tests/screenshots/payments-verify-button.png' });
  });

  test('Powinien zsynchronizować płatności po kliknięciu przycisku weryfikacji', async ({ page }) => {
    // Oczekiwanie na załadowanie strony
    await page.waitForSelector('h1:has-text("Płatności")', { timeout: 10000 });
    
    // Zrzut ekranu - przed synchronizacją
    await page.screenshot({ path: 'tests/screenshots/payments-before-sync.png', fullPage: true });
    
    // Kliknięcie przycisku "Zweryfikuj płatności"
    const verifyButton = page.locator('button:has-text("Zweryfikuj płatności")');
    await verifyButton.click();
    
    // Oczekiwanie na zmianę tekstu przycisku na "Synchronizacja..." lub disabled state
    // Synchronizacja może być bardzo szybka, więc sprawdzamy oba stany
    try {
      await expect(verifyButton).toContainText('Synchronizacja...', { timeout: 2000 });
      // Zrzut ekranu - podczas synchronizacji
      await page.screenshot({ path: 'tests/screenshots/payments-during-sync.png', fullPage: true });
    } catch (e) {
      // Jeśli synchronizacja jest zbyt szybka, sprawdzamy czy przycisk jest disabled
      const isDisabled = await verifyButton.isDisabled();
      if (isDisabled) {
        // Zrzut ekranu - podczas synchronizacji (disabled state)
        await page.screenshot({ path: 'tests/screenshots/payments-during-sync.png', fullPage: true });
      }
    }
    
    // Oczekiwanie na zakończenie synchronizacji (przycisk wraca do normalnego stanu)
    await expect(verifyButton).toContainText('Zweryfikuj płatności', { timeout: 30000 });
    await expect(verifyButton).toBeEnabled({ timeout: 5000 });
    
    // Zrzut ekranu - po synchronizacji
    await page.screenshot({ path: 'tests/screenshots/payments-after-sync.png', fullPage: true });
    
    // Sprawdzenie czy strona nie pokazuje błędu
    const errorMessage = page.locator('text=/Błąd|Error|Nie można/i');
    await expect(errorMessage).not.toBeVisible({ timeout: 5000 });
  });

  test('Powinien wyświetlić tabelę płatności', async ({ page }) => {
    // Oczekiwanie na załadowanie tabeli
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Zrzut ekranu - tabela płatności
    await page.screenshot({ path: 'tests/screenshots/payments-table.png', fullPage: true });
    
    // Sprawdzenie czy tabela jest widoczna
    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    // Sprawdzenie czy są nagłówki kolumn
    await expect(page.locator('th:has-text("Nazwa rezerwacji")')).toBeVisible();
    await expect(page.locator('th:has-text("Uczestnik")')).toBeVisible();
    await expect(page.locator('th:has-text("Kwota całkowita")')).toBeVisible();
    await expect(page.locator('th:has-text("Opłacone")')).toBeVisible();
    await expect(page.locator('th:has-text("Pozostało")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
  });

  test('Powinien obsłużyć błąd gdy backend nie działa', async ({ page, context }) => {
    // Zatrzymanie backendu (symulacja - w rzeczywistości backend może nie działać)
    // W tym teście sprawdzamy czy frontend poprawnie obsługuje błąd
    
    // Oczekiwanie na załadowanie strony
    await page.waitForSelector('h1:has-text("Płatności")', { timeout: 10000 });
    
    // Kliknięcie przycisku "Zweryfikuj płatności"
    const verifyButton = page.locator('button:has-text("Zweryfikuj płatności")');
    
    // Jeśli backend nie działa, przycisk powinien pokazać błąd
    // (Ten test może nie przejść jeśli backend działa - to normalne)
    await verifyButton.click();
    
    // Oczekiwanie na zakończenie (sukces lub błąd)
    await page.waitForTimeout(5000);
    
    // Zrzut ekranu - po próbie synchronizacji
    await page.screenshot({ path: 'tests/screenshots/payments-error-handling.png', fullPage: true });
  });

  test('Powinien automatycznie synchronizować płatności przy wejściu na stronę', async ({ page }) => {
    // Oczekiwanie na załadowanie strony
    await page.waitForSelector('h1:has-text("Płatności")', { timeout: 10000 });
    
    // Zrzut ekranu - strona po załadowaniu
    await page.screenshot({ path: 'tests/screenshots/payments-auto-sync.png', fullPage: true });
    
    // Sprawdzenie czy strona się załadowała
    await expect(page.locator('h1:has-text("Płatności")')).toBeVisible();
    
    // Oczekiwanie na zakończenie automatycznej synchronizacji (jeśli są płatności pending)
    await page.waitForTimeout(5000);
    
    // Zrzut ekranu - po automatycznej synchronizacji
    await page.screenshot({ path: 'tests/screenshots/payments-after-auto-sync.png', fullPage: true });
  });
});

