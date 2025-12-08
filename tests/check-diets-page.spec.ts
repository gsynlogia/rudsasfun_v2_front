/**
 * Test sprawdzający czy diety są widoczne na stronie /admin-panel/diets/general
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:3000';
const ADMIN_LOGIN = 'admin';
const ADMIN_PASSWORD = 'admin';

test('SPRAWDZENIE: Czy diety są widoczne na stronie /admin-panel/diets/general', async ({ page }) => {
  // Najpierw zaloguj się
  await page.goto(`${FRONTEND_URL}/admin-panel/login`);
  await page.waitForLoadState('networkidle');
  
  await page.fill('input#login', ADMIN_LOGIN);
  await page.fill('input#password', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  
  // Czekaj na przekierowanie
  await page.waitForURL(/.*admin-panel.*/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  
  // Teraz przejdź na stronę diet
  await page.goto(`${FRONTEND_URL}/admin-panel/diets/general`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000); // Czekaj na załadowanie danych
  
  // Screenshot całej strony
  await page.screenshot({ path: 'test-results/check-diets-page-full.png', fullPage: true });
  
  // Sprawdź czy jest tabela
  const table = page.locator('table');
  const hasTable = await table.count() > 0;
  console.log('Has table:', hasTable);
  
  // Sprawdź wiersze w tabeli
  const tableRows = page.locator('table tbody tr');
  const rowCount = await tableRows.count();
  console.log('Table rows count:', rowCount);
  
  // Sprawdź czy są nazwy diet
  const standardowa = page.locator('text=/Standardowa/i');
  const wegetarianska = page.locator('text=/Wegetariańska/i');
  const bezglutenowa = page.locator('text=/Bezglutenowa/i');
  
  const hasStandardowa = await standardowa.count() > 0;
  const hasWegetarianska = await wegetarianska.count() > 0;
  const hasBezglutenowa = await bezglutenowa.count() > 0;
  
  console.log('Has Standardowa:', hasStandardowa);
  console.log('Has Wegetariańska:', hasWegetarianska);
  console.log('Has Bezglutenowa:', hasBezglutenowa);
  
  // Sprawdź czy jest komunikat "Brak diet"
  const noDietsMessage = page.locator('text=/Brak diet/i');
  const hasNoDietsMessage = await noDietsMessage.count() > 0;
  console.log('Has "Brak diet" message:', hasNoDietsMessage);
  
  // Sprawdź czy jest loading
  const loading = page.locator('text=/Ładowanie/i');
  const hasLoading = await loading.count() > 0;
  console.log('Has loading:', hasLoading);
  
  // Sprawdź czy jest błąd
  const error = page.locator('text=/błąd|error/i');
  const hasError = await error.count() > 0;
  console.log('Has error:', hasError);
  
  // Screenshot tabeli
  if (hasTable) {
    await table.screenshot({ path: 'test-results/check-diets-table.png' });
  }
  
  // Sprawdź console logi i network requests
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
    if (text.includes('GeneralDiets') || text.includes('diets') || text.includes('API') || text.includes('Error') || text.includes('error')) {
      console.log('CONSOLE:', text);
    }
  });
  
  // Sprawdź network requests
  const networkRequests: string[] = [];
  page.on('request', request => {
    const url = request.url();
    if (url.includes('general-diets') || url.includes('diets')) {
      networkRequests.push(`${request.method()} ${url}`);
      console.log('NETWORK REQUEST:', request.method(), url);
    }
  });
  
  page.on('response', response => {
    const url = response.url();
    if (url.includes('general-diets') || url.includes('diets')) {
      console.log('NETWORK RESPONSE:', response.status(), url);
      response.text().then(text => {
        if (response.status() !== 200) {
          console.log('RESPONSE ERROR:', text);
        } else {
          console.log('RESPONSE OK:', text.substring(0, 200));
        }
      }).catch(() => {});
    }
  });
  
  await page.waitForTimeout(5000);
  
  // Sprawdź całą zawartość strony
  const pageContent = await page.content();
  const hasDietsInHTML = pageContent.includes('Standardowa') || pageContent.includes('Wegetariańska') || pageContent.includes('Bezglutenowa');
  console.log('Has diets in HTML:', hasDietsInHTML);
  
  // Sprawdź czy jest jakiś element z tekstem
  const allText = await page.locator('body').textContent();
  console.log('Page text sample:', allText?.substring(0, 500));
  
  console.log('All console messages:', consoleMessages);
  console.log('All network requests:', networkRequests);
});

