// Panel klienta: podpis umowy i karty kwalifikacyjnej kodem SMS. Kod czytany tam, gdzie widzi go tester:
// lokalnie z dziennika SMS w bazie, na DEV z wirtualnego telefonu (sms-rezerwacja-radsasfun.synlogia.dev).
import { pause, sql } from './config.mjs';

const DOCUMENTS = [
  { type: 'contract', path: 'umowa', label: 'umowa', smsText: 'podpisania umowy' },
  { type: 'qualification_card', path: 'karta-kwalifikacyjna', label: 'karta', smsText: 'podpisania karty kwalifikacyjnej' },
];
const CODE_WAIT_MS = 30000;
const CODE_POLL_MS = 1500;

async function latestSmsId(ctx) {
  if (ctx.env.sms) return (await (await fetch(`${ctx.env.sms}/api/sms/latest?limit=1`)).json())[0]?.id || 0;
  return sql(ctx.env, 'SELECT COALESCE(MAX(id), 0) AS id FROM sms_log')[0].id;
}

async function smsSince(ctx, reservationId, sinceId) {
  if (ctx.env.sms) {
    const items = await (await fetch(`${ctx.env.sms}/api/sms/latest?after_id=${sinceId}&limit=20`)).json();
    return items.filter((m) => m.reservation_id === reservationId).map((m) => m.message);
  }
  return sql(ctx.env, `SELECT message_text AS message FROM sms_log WHERE reservation_id = ${Number(reservationId)}
    AND id > ${Number(sinceId)} ORDER BY id`).map((m) => m.message);
}

async function waitForCode(page, ctx, reservationId, sinceId, doc) {
  const deadline = Date.now() + CODE_WAIT_MS;
  while (Date.now() < deadline) {
    const texts = await smsSince(ctx, reservationId, sinceId);
    const match = texts.map((t) => t.match(new RegExp(`${doc.smsText}: (\\d{4})`))).find(Boolean);
    if (match) return match[1];
    await pause(page, CODE_POLL_MS);
  }
  throw new Error(`${doc.label}: brak SMS z kodem w ${ctx.env.sms ? 'wirtualnym telefonie' : 'sms_log'}`);
}

async function checkByLabel(page, text) {
  const box = page.locator(`xpath=//label[contains(., "${text}")]//input[@type="checkbox"] | //label[contains(., "${text}")]/preceding-sibling::input[@type="checkbox"][1]`).first();
  if (await box.count() && await box.isVisible() && !(await box.isChecked())) await box.check().catch(() => {});
}

async function fillCard(page, s) {
  const dob = page.locator('#child-dob-field input');
  if (await dob.count()) await dob.first().fill(`${s.birthYear}-05-10`);
  const noPesel = page.locator('#child-no-pesel-section input[type=checkbox]');
  if (await noPesel.count() && !(await noPesel.first().isChecked())) await noPesel.first().check();
  for (const text of ['Brak drugiego rodzica', 'Zgodnie z kalendarzem', 'Potwierdzam zapoznanie']) await checkByLabel(page, text);
}

function verifiedAt(ctx, reservationId, type) {
  const [row] = sql(ctx.env, `SELECT sms_verified_at FROM signed_documents WHERE reservation_id = ${Number(reservationId)}
    AND document_type = '${type}' ORDER BY id DESC LIMIT 1`);
  return row?.sms_verified_at || null;
}

async function signOne(page, ctx, s, number, reservationId, doc) {
  await page.goto(`${ctx.env.base}/profil/aktualne-rezerwacje/${number}/${doc.path}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const sign = page.locator('button:visible', { hasText: /podpisz/i }).first();
  await sign.waitFor({ timeout: 60000 });
  if (doc.type === 'qualification_card') await fillCard(page, s);
  const sinceId = await latestSmsId(ctx);
  await sign.click();
  const code = await waitForCode(page, ctx, reservationId, sinceId, doc);
  await page.locator('input[maxlength="4"]:visible, input[placeholder*="_"]:visible').last().fill(code);
  await page.locator('button:visible', { hasText: /^\s*Potwierdź\s*$/i }).last().click();
  await pause(page, 6000);
  const verified = verifiedAt(ctx, reservationId, doc.type);
  if (!verified) {
    await page.screenshot({ path: `${ctx.out}/${s.id}_${doc.label}_bez_podpisu.png`, fullPage: true });
    throw new Error(`${doc.label}: kod ${code} wpisany, ale dokument nie jest podpisany`);
  }
  return { code, verified };
}

/** Podpis umowy i karty; zwraca kody i czasy podpisu z bazy. */
export async function signDocuments(page, ctx, s, number, reservationId) {
  const result = { ok: false };
  for (const doc of DOCUMENTS) {
    result[doc.label] = await signOne(page, ctx, s, number, reservationId, doc);
    console.log(`  ${doc.label}: podpisana kodem ${result[doc.label].code}`);
  }
  result.ok = true;
  return result;
}