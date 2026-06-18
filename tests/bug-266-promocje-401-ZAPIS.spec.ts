/**
 * Bug #266 (Trello YCJXoLXt) — E2E REALNY ZAPIS promocji (nie tylko ładowanie panelu).
 *
 * Cel: potwierdzić, że admin może WYBRAĆ promocję i NACISNĄĆ "Zapisz zmianę",
 * a backend faktycznie zapisuje (PATCH /api/v2/reservations/{id}/promotion-v2 → 200,
 * brak 401/403/500). Sedno: realny zapis, weryfikacja network + utrwalenie wartości.
 *
 * Działa na LOKAL i DEV (parametr env):
 *   - LOKAL: domyślnie http://localhost:3000, REZ=REZ-2026-2909
 *   - DEV:   PLAYWRIGHT_BASE_URL=https://rezerwacja-radsasfun.synlogia.dev
 *            BUG266_ENV=DEV  BUG266_REZ=REZ-2026-2912
 *
 * Zrzuty: cypress/screenshots-proof/bug-266-ZAPIS-<ENV>-<przed|po>_<ts>.png
 */
import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Zrzut przez CDP (Page.captureScreenshot) — OMIJA stabilizację layoutu Playwrighta.
 * Strona admina w Next.js dev (WATCHPACK_POLLING) re-renderuje się bez końca, przez co
 * standardowy page.screenshot()/locator.screenshot() WISI (czeka na 2 stabilne klatki, które
 * nigdy nie nadchodzą). CDP robi natychmiastowy snapshot bieżącej klatki.
 */
async function cdpScreenshot(page: Page, filePath: string, label: string): Promise<void> {
  try {
    const client = await page.context().newCDPSession(page);
    const { data } = (await client.send('Page.captureScreenshot', { format: 'png' })) as { data: string };
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    await client.detach().catch(() => {});
    console.log(`[${label}] zrzut zapisany: ${path.basename(filePath)}`);
  } catch (e) {
    console.log(`[${label}] zrzut CDP nieudany: ${String(e).slice(0, 160)}`);
  }
}

const ENV_LABEL = process.env.BUG266_ENV || 'LOKAL';
const REZ = process.env.BUG266_REZ || 'REZ-2026-2909';
const SHOTS = path.resolve(__dirname, '../../cypress/screenshots-proof');
const ADMIN_LOGIN = 'sguzik';
const ADMIN_PASS = 'Glob@l2026!';
const AUTH_TOKEN_KEY = 'radsasfun_auth_token';

function ts(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function loginAdmin(page: Page) {
  await page.goto('/admin-panel/login');
  await page.locator('input#login').fill(ADMIN_LOGIN);
  await page.locator('input#password').fill(ADMIN_PASS);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/admin-panel(?!\/login)/, { timeout: 30000 });
}

async function openPromocjeTransport(page: Page) {
  await page.goto(`/admin-panel/rezerwacja/${REZ}`);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('#tab-promocje-transport').click({ timeout: 30000 });
  await expect(page.getByText('Edycja promocji i kodu rabatowego')).toBeVisible({ timeout: 30000 });
  // Panel kończy ładowanie listy promocji.
  await expect(page.getByText(/Ładowanie listy promocji/i)).toHaveCount(0, { timeout: 30000 });
}

test(`Bug #266 [${ENV_LABEL}] — REALNY ZAPIS: wybór promocji + "Zapisz zmianę" => PATCH 200`, async ({ page }) => {
  // Zapis promocji może wystawiać aneks + wysyłać email do sandboxa → wydłuża czas. Dajemy zapas.
  test.setTimeout(120000);
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`));
  page.on('crash', () => console.log(`[${ENV_LABEL}] !!! PAGE CRASH @ ${new Date().toISOString()}`));
  page.on('close', () => console.log(`[${ENV_LABEL}] !!! PAGE CLOSE event @ ${new Date().toISOString()}`));
  page.on('pageerror', (err) => console.log(`[${ENV_LABEL}] !!! PAGEERROR @ ${new Date().toISOString()}: ${err.message}`));
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) console.log(`[${ENV_LABEL}] >> nav: ${f.url()} @ ${new Date().toISOString()}`);
  });

  await loginAdmin(page);
  await openPromocjeTransport(page);

  const promoSelect = page.getByRole('combobox', { name: /^Promocja$/i });
  await expect(promoSelect).toBeVisible({ timeout: 30000 });

  // KLUCZOWA asercja buga Joanny: NIE ma surowego "Promocje: 401".
  await expect(page.getByText(/Promocje:\s*401/i)).toHaveCount(0);

  // Zrzut PRZED zmianą (CDP — niezawodny na ciągle re-renderującej stronie admina).
  await cdpScreenshot(page, path.join(SHOTS, `bug-266-ZAPIS-${ENV_LABEL}-przed_${ts()}.png`), ENV_LABEL);

  // Odczytaj wszystkie opcje promocji (value + label).
  const options = await promoSelect.locator('option').evaluateAll((els) =>
    (els as HTMLOptionElement[]).map((o) => ({ value: o.value, label: (o.textContent || '').trim() })),
  );
  expect(options.length).toBeGreaterThan(1); // "— brak —" + >=1 realna promocja

  const currentValue = await promoSelect.inputValue();
  // Wybierz INNĄ opcję niż obecna. Preferuj pierwszą realną (value != '') różną od bieżącej;
  // jeśli już jest realna ustawiona → wybierz inną realną lub "brak".
  const realOptions = options.filter((o) => o.value !== '' && o.value !== currentValue);
  let target: { value: string; label: string };
  if (realOptions.length > 0) {
    target = realOptions[0];
  } else if (currentValue !== '') {
    // tylko jedna realna i już ustawiona → zmień na "brak"
    target = { value: '', label: '— brak —' };
  } else {
    throw new Error('Brak innej opcji promocji do wyboru');
  }

  console.log(`[${ENV_LABEL}] REZ=${REZ} currentValue="${currentValue}" -> target.value="${target.value}" (${target.label})`);

  // Jeśli rezerwacja ma kod rabatowy z trybem "nie_laczy" (np. LASTMINUTE), backend odrzuci
  // kombinację promocja+kod (400, walidacja biznesowa — NIE bug 401). Czyścimy pole kodu,
  // żeby przetestować CZYSTY zapis samej promocji (sedno buga #266 = autoryzacja PATCH).
  const codeInput = page.getByRole('textbox', { name: /^Kod rabatowy$/i });
  if (await codeInput.count()) {
    await codeInput.fill('');
  }

  // Wybierz promocję w dropdownie.
  await promoSelect.selectOption(target.value);
  await expect(promoSelect).toHaveValue(target.value);

  // Po wyborze realnej promocji mogą pojawić się WYMAGANE pola custom
  // (np. "Numer Karty Dużej Rodziny", "Imię rodzeństwa", checkbox deklaracji).
  // Bez nich backend zwróci 400 (walidacja, nie 401). Wypełniamy wszystkie widoczne pola.
  if (target.value !== '') {
    await page.waitForTimeout(500);
    const customBox = page
      .locator('text=Edycja promocji i kodu rabatowego')
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]')
      .locator('div.bg-blue-50');
    if (await customBox.count()) {
      const textInputs = customBox.locator('input[type="text"], input[type="number"], input[type="date"]');
      const nText = await textInputs.count();
      for (let i = 0; i < nText; i++) {
        await textInputs.nth(i).fill(`TEST-266-${i + 1}`);
      }
      const checks = customBox.locator('input[type="checkbox"]');
      const nCheck = await checks.count();
      for (let i = 0; i < nCheck; i++) {
        if (!(await checks.nth(i).isChecked())) await checks.nth(i).check();
      }
      console.log(`[${ENV_LABEL}] Wypełniono pola custom: text=${nText}, checkbox=${nCheck}`);
    }
  }

  // Przechwyć PATCH i kliknij "Zapisz zmianę".
  const patchPromise = page.waitForResponse(
    (res) =>
      res.url().includes(`/api/v2/reservations/`) &&
      res.url().endsWith('/promotion-v2') &&
      res.request().method() === 'PATCH',
    { timeout: 30000 },
  );

  const saveBtn = page.getByRole('button', { name: /^Zapisz zmianę$/ });
  await expect(saveBtn).toBeEnabled();
  console.log(`[${ENV_LABEL}] klikam Zapisz @ ${new Date().toISOString()}`);
  await saveBtn.click();

  const patchRes = await patchPromise;
  console.log(`[${ENV_LABEL}] PATCH response odebrany @ ${new Date().toISOString()}`);
  const patchStatus = patchRes.status();
  const patchUrl = patchRes.url();
  // UWAGA: NIE czytamy body przez patchRes.json()/.text() — odczyt body BLOKUJE do 2 min, bo
  // backend po PATCH wykonuje długie operacje (recalc total_price + aneks + email do sandboxa)
  // i domyka strumień odpowiedzi dopiero po ich zakończeniu (status przychodzi natychmiast).
  // Sednem buga #266 jest status HTTP (401 vs 200), nie treść body.
  console.log(`[${ENV_LABEL}] PATCH ${patchUrl} -> status ${patchStatus}`);

  // SEDNO: PATCH musi być 200 (nie 401/403/500).
  expect(patchStatus, `PATCH promotion-v2 status (oczekiwane 200)`).toBe(200);

  // Zrzut PO zapisie PIERWSZY (CDP — natychmiastowy snapshot), zanim cokolwiek innego.
  console.log(`[${ENV_LABEL}] przed cdpScreenshot PO @ ${new Date().toISOString()}`);
  await cdpScreenshot(page, path.join(SHOTS, `bug-266-ZAPIS-${ENV_LABEL}-po_${ts()}.png`), ENV_LABEL);
  console.log(`[${ENV_LABEL}] po cdpScreenshot PO @ ${new Date().toISOString()}`);

  // Surowy "Promocje: 401" nie może się pojawić (odczyt z DOM bez auto-waiting przez evaluate).
  const raw401Count = await page
    .evaluate(() => (document.body.innerText.match(/Promocje:\s*401/gi) || []).length)
    .catch(() => 0);
  console.log(`[${ENV_LABEL}] raw401Count=${raw401Count} @ ${new Date().toISOString()}`);
  expect(raw401Count, 'Surowy komunikat "Promocje: 401" NIE może wystąpić').toBe(0);

  const toastSeen = await page
    .evaluate(() => /Zmiana promocji\/kodu zapisana/i.test(document.body.innerText))
    .catch(() => false);
  console.log(`[${ENV_LABEL}] Toast sukcesu widoczny: ${toastSeen} @ ${new Date().toISOString()}`);

  // Utrwalenie: świeże wejście na stronę (twardy goto, nie reload w trakcie re-rendera)
  // i sprawdzenie, że wybrana promocja jest zapisana w panelu.
  await openPromocjeTransport(page);
  const promoSelectAfter = page.getByRole('combobox', { name: /^Promocja$/i });
  await expect(promoSelectAfter).toBeVisible({ timeout: 30000 });
  const valueAfterReload = await promoSelectAfter.inputValue();
  console.log(`[${ENV_LABEL}] Po świeżym wejściu value="${valueAfterReload}" (oczekiwane "${target.value}")`);
  expect(valueAfterReload, 'Wybrana promocja musi być utrwalona po odświeżeniu').toBe(target.value);

  await cdpScreenshot(page, path.join(SHOTS, `bug-266-ZAPIS-${ENV_LABEL}-po-reload_${ts()}.png`), ENV_LABEL);

  // Błędy konsoli (filtruj typowy szum).
  const meaningful = consoleErrors.filter(
    (e) => !/favicon|ResizeObserver|Download the React DevTools|hydration/i.test(e),
  );
  console.log(`[${ENV_LABEL}] Console errors (${meaningful.length}): ${JSON.stringify(meaningful).slice(0, 1200)}`);
});
