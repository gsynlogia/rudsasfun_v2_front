import { test, expect } from '@playwright/test';
import path from 'path';

test('Debug: wymiary i pozycje elementów', async ({ page }) => {
  const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibG9naW4iOiJzZ3V6aWsiLCJlbWFpbCI6InNndXppa0ByYWRzYXNmdW4ucGwiLCJ1c2VyX3R5cGUiOiJhZG1pbiIsImdyb3VwcyI6WyJhZG1pbiJdLCJpc19zeXN0ZW1fYWRtaW4iOmZhbHNlLCJpc19hZG1pbl91c2VyIjp0cnVlLCJpc19zdXBlcmFkbWluIjp0cnVlLCJleHAiOjE3NzA4NzMzNzV9.2KNNmD59DKxPyxnzW0iGwkEHz_6Lq_zEKxPKwxwRITY';

  await page.addInitScript((token) => {
    localStorage.setItem('radsasfun_auth_token', token);
    localStorage.setItem('radsasfun_auth_user', JSON.stringify({
      id: 1,
      login: 'sguzik',
      email: 'sguzik@radsasfun.pl',
      user_type: 'admin',
      groups: ['admin'],
      is_superadmin: true,
      is_admin_user: true,
    }));
  }, TOKEN);

  await page.goto('http://localhost:3000/admin-panel');
  await page.waitForTimeout(4000);

  // Wyszukaj "guzik"
  const searchInput = page.locator('input[placeholder*="Uczestnik"]').first();
  await searchInput.fill('guzik');
  await searchInput.press('Enter');
  await page.waitForTimeout(3000);

  // Pobierz wymiary elementów
  const firstRow = page.locator('table tbody tr').first();
  const firstCell = firstRow.locator('td').first();
  const flexDiv = firstCell.locator('div.flex.flex-col');
  const mainSpan = flexDiv.locator('span').first();
  const subDiv = flexDiv.locator('div').first();

  // BoundingBox
  const rowBox = await firstRow.boundingBox();
  const cellBox = await firstCell.boundingBox();
  const flexDivBox = await flexDiv.boundingBox();
  const mainSpanBox = await mainSpan.boundingBox();
  const subDivBox = await subDiv.boundingBox();

  console.log('=== WYMIARY ELEMENTÓW ===');
  console.log(`firstRow    : ${JSON.stringify(rowBox)}`);
  console.log(`firstCell   : ${JSON.stringify(cellBox)}`);
  console.log(`flexDiv     : ${JSON.stringify(flexDivBox)}`);
  console.log(`mainSpan    : ${JSON.stringify(mainSpanBox)}`);
  console.log(`subDiv      : ${JSON.stringify(subDivBox)}`);

  // Wysokość wiersza
  const rowHeight = rowBox?.height || 0;
  const cellHeight = cellBox?.height || 0;
  const flexDivHeight = flexDivBox?.height || 0;
  const mainSpanHeight = mainSpanBox?.height || 0;
  const subDivHeight = subDivBox?.height || 0;

  console.log(`\n=== ANALIZA WYSOKOŚCI ===`);
  console.log(`Row height: ${rowHeight}px`);
  console.log(`Cell height: ${cellHeight}px`);
  console.log(`FlexDiv height: ${flexDivHeight}px`);
  console.log(`MainSpan height: ${mainSpanHeight}px`);
  console.log(`SubDiv height: ${subDivHeight}px`);
  console.log(`MainSpan + SubDiv = ${mainSpanHeight + subDivHeight}px`);

  // Sprawdź pozycje Y
  const rowY = rowBox?.y || 0;
  const cellY = cellBox?.y || 0;
  const mainSpanY = mainSpanBox?.y || 0;
  const subDivY = subDivBox?.y || 0;

  console.log(`\n=== POZYCJE Y ===`);
  console.log(`Row Y: ${rowY}px`);
  console.log(`Cell Y: ${cellY}px`);
  console.log(`MainSpan Y: ${mainSpanY}px (offset from row: ${mainSpanY - rowY}px)`);
  console.log(`SubDiv Y: ${subDivY}px (offset from row: ${subDivY - rowY}px)`);

  // Sprawdź czy mainSpan jest powyżej widocznego obszaru wiersza
  if (mainSpanY < rowY) {
    console.log(`\n!!! PROBLEM: mainSpan Y (${mainSpanY}) < row Y (${rowY}) !!!`);
    console.log(`MainSpan jest powyżej górnej krawędzi wiersza o ${rowY - mainSpanY}px`);
  }

  // Sprawdź overflow na wierszu
  const rowOverflow = await firstRow.evaluate((el) => {
    const s = window.getComputedStyle(el);
    return { overflow: s.overflow, overflowY: s.overflowY, maxHeight: s.maxHeight, height: s.height };
  });
  console.log(`\n=== ROW OVERFLOW ===`);
  console.log(JSON.stringify(rowOverflow, null, 2));

  // Sprawdź thead
  const thead = page.locator('table thead');
  const theadBox = await thead.boundingBox();
  console.log(`\n=== THEAD ===`);
  console.log(`Thead box: ${JSON.stringify(theadBox)}`);
  console.log(`Thead bottom: ${(theadBox?.y || 0) + (theadBox?.height || 0)}px`);
  console.log(`Row Y: ${rowY}px`);
  
  if (theadBox && rowBox) {
    const theadBottom = theadBox.y + theadBox.height;
    if (mainSpanY < theadBottom) {
      console.log(`\n!!! PROBLEM: mainSpan Y (${mainSpanY}) jest za thead bottom (${theadBottom}) !!!`);
    }
  }

  // Screenshot
  const ss = path.join(process.cwd(), '..', 'screens_pg', 'debug_dimensions.png');
  await page.screenshot({ path: ss, fullPage: false });

  console.log('\n=== TEST COMPLETED ===');
});
