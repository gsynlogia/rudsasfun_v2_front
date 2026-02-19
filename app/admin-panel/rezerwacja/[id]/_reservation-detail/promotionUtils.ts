/**
 * Funkcje pomocnicze dla promocji i uzasadnień (strona szczegółów rezerwacji).
 */

export function getPromotionType(promotionName?: string | null): string {
  if (!promotionName) return 'other';
  const nameLower = String(promotionName).toLowerCase();
  if (nameLower.includes('duża rodzina') || nameLower.includes('duza rodzina')) return 'duza_rodzina';
  if (nameLower.includes('rodzeństwo razem') || nameLower.includes('rodzenstwo razem')) return 'rodzenstwo_razem';
  if (nameLower.includes('obozy na maxa') || nameLower.includes('obozy na max')) return 'obozy_na_maxa';
  if (nameLower.includes('first minute') || nameLower.includes('wczesna rezerwacja')) return 'first_minute';
  if (nameLower.includes('bon') && (
    nameLower.includes('brązowy') || nameLower.includes('brazowy') ||
    nameLower.includes('srebrny') ||
    nameLower.includes('złoty') || nameLower.includes('zloty') ||
    nameLower.includes('platynowy')
  )) return 'bonowych';
  if (nameLower.includes('bonowych') || nameLower.includes('bonowa')) return 'bonowych';
  return 'other';
}

export function requiresJustification(promotionName?: string | null): boolean {
  const type = getPromotionType(promotionName);
  return ['duza_rodzina', 'rodzenstwo_razem', 'obozy_na_maxa', 'first_minute', 'bonowych'].includes(type);
}

export function hasJustificationData(justification: Record<string, unknown> | null | undefined): boolean {
  return Boolean(
    justification &&
    typeof justification === 'object' &&
    Object.keys(justification).length > 0 &&
    Object.values(justification).some((val) =>
      val !== null && val !== undefined && val !== '' &&
      (Array.isArray(val) ? val.length > 0 : true),
    ),
  );
}

export function formatJustificationForDisplay(just: Record<string, unknown> | null | undefined): string {
  if (!just || typeof just !== 'object') return '';
  const parts: string[] = [];
  if (just.card_number) parts.push(`Numer karty dużej rodziny: ${String(just.card_number)}`);
  if (just.sibling_first_name || just.sibling_last_name) {
    const siblingName = [just.sibling_first_name, just.sibling_last_name].filter(Boolean).map(String).join(' ');
    if (siblingName) parts.push(`Rodzeństwo: ${siblingName}`);
  }
  if (just.first_camp_date) parts.push(`Data pierwszego obozu: ${String(just.first_camp_date)}`);
  if (just.first_camp_name) parts.push(`Nazwa pierwszego obozu: ${String(just.first_camp_name)}`);
  if (just.reason) parts.push(`Powód wyboru promocji: ${String(just.reason)}`);
  if (just.years) {
    const yearsStr = Array.isArray(just.years) ? (just.years as unknown[]).join(', ') : String(just.years);
    if (yearsStr) parts.push(`Lata uczestnictwa: ${yearsStr}`);
  }
  const knownFields = ['card_number', 'sibling_first_name', 'sibling_last_name', 'first_camp_date', 'first_camp_name', 'reason', 'years'];
  const otherFields = Object.keys(just).filter((key) => !knownFields.includes(key));
  otherFields.forEach((key) => {
    const value = just[key];
    if (value !== null && value !== undefined && value !== '') {
      parts.push(`${key}: ${String(value)}`);
    }
  });
  return parts.join('\n');
}

export function formatJustificationToLogText(just: Record<string, unknown> | null | undefined): string {
  if (!just || typeof just !== 'object') return '(brak)';
  const parts: string[] = [];
  if (just.card_number) parts.push(`Numer karty dużej rodziny: ${String(just.card_number)}`);
  if (just.sibling_first_name || just.sibling_last_name) {
    const name = [just.sibling_first_name, just.sibling_last_name].filter(Boolean).map(String).join(' ');
    if (name) parts.push(`Rodzeństwo: ${name}`);
  }
  if (just.first_camp_date) parts.push(`Data pierwszego obozu: ${String(just.first_camp_date)}`);
  if (just.first_camp_name) parts.push(`Nazwa pierwszego obozu: ${String(just.first_camp_name)}`);
  if (just.reason) parts.push(`Powód wyboru promocji: ${String(just.reason)}`);
  if (just.years) {
    const y = just.years;
    const yearsStr = Array.isArray(y) ? (y as unknown[]).join(', ') : String(y);
    if (yearsStr) parts.push(`Lata uczestnictwa: ${yearsStr}`);
  }
  return parts.length ? parts.join('. ') : '(brak)';
}

/** Filtruje uzasadnienie tylko do pól dla danego typu promocji (do zapisu). */
export function filterJustificationForSave(
  promotionName: string | null | undefined,
  draft: Record<string, unknown>,
): Record<string, unknown> {
  const type = getPromotionType(promotionName);
  const out: Record<string, unknown> = {};
  if (type === 'duza_rodzina' && draft.card_number !== null && draft.card_number !== undefined) out.card_number = draft.card_number;
  else if (type === 'rodzenstwo_razem') {
    if (draft.sibling_first_name !== null && draft.sibling_first_name !== undefined) out.sibling_first_name = draft.sibling_first_name;
    if (draft.sibling_last_name !== null && draft.sibling_last_name !== undefined) out.sibling_last_name = draft.sibling_last_name;
  } else if (type === 'obozy_na_maxa') {
    if (draft.first_camp_date !== null && draft.first_camp_date !== undefined) out.first_camp_date = draft.first_camp_date;
    if (draft.first_camp_name !== null && draft.first_camp_name !== undefined) out.first_camp_name = draft.first_camp_name;
  } else if (type === 'first_minute' || type === 'bonowych' || type === 'other') {
    if (draft.reason !== null && draft.reason !== undefined) out.reason = draft.reason;
    if (type === 'bonowych' && draft.years !== null && draft.years !== undefined) out.years = draft.years;
  }
  return out;
}

/** Zwraca uzasadnienie tylko dla bieżącej promocji (z obiektu zapisanego). */
export function getJustificationForCurrentPromotion(
  promotionName: string | null | undefined,
  currentJustification: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!currentJustification || typeof currentJustification !== 'object') return {};
  const type = getPromotionType(promotionName);
  const filtered: Record<string, unknown> = {};
  if (type === 'duza_rodzina' && currentJustification.card_number !== null && currentJustification.card_number !== undefined) filtered.card_number = currentJustification.card_number;
  else if (type === 'rodzenstwo_razem') {
    if (currentJustification.sibling_first_name !== null && currentJustification.sibling_first_name !== undefined) filtered.sibling_first_name = currentJustification.sibling_first_name;
    if (currentJustification.sibling_last_name !== null && currentJustification.sibling_last_name !== undefined) filtered.sibling_last_name = currentJustification.sibling_last_name;
  } else if (type === 'obozy_na_maxa') {
    if (currentJustification.first_camp_date !== null && currentJustification.first_camp_date !== undefined) filtered.first_camp_date = currentJustification.first_camp_date;
    if (currentJustification.first_camp_name !== null && currentJustification.first_camp_name !== undefined) filtered.first_camp_name = currentJustification.first_camp_name;
  } else {
    if (currentJustification.reason !== null && currentJustification.reason !== undefined) filtered.reason = currentJustification.reason;
    if (type === 'bonowych' && currentJustification.years !== null && currentJustification.years !== undefined) filtered.years = currentJustification.years;
  }
  return filtered;
}

/** Walidacja draftu uzasadnienia – zwraca błąd lub null. */
export function validateJustificationDraft(
  promotionName: string | null | undefined,
  just: Record<string, unknown>,
): string | null {
  const type = getPromotionType(promotionName);
  if (!requiresJustification(promotionName)) {
    return hasJustificationData(just) ? null : 'Uzupełnij krótkie uzasadnienie.';
  }
  if (type === 'duza_rodzina') {
    if (!just.card_number || String(just.card_number).trim() === '') return 'Numer karty dużej rodziny jest wymagany.';
  } else if (type === 'rodzenstwo_razem') {
    if (!just.sibling_first_name || String(just.sibling_first_name).trim() === '') return 'Imię rodzeństwa jest wymagane.';
    if (!just.sibling_last_name || String(just.sibling_last_name).trim() === '') return 'Nazwisko rodzeństwa jest wymagane.';
  } else if (type === 'obozy_na_maxa') {
    if ((!just.first_camp_date || String(just.first_camp_date).trim() === '') &&
        (!just.first_camp_name || String(just.first_camp_name).trim() === '')) {
      return 'Wypełnij datę lub nazwę pierwszego obozu.';
    }
  } else if (type === 'first_minute') {
    if (!just.reason || String(just.reason).trim() === '') return 'Powód wyboru promocji First Minute jest wymagany.';
  } else if (type === 'bonowych') {
    if (!just.years || String(just.years).trim() === '') return 'Lata uczestnictwa są wymagane.';
  } else {
    if (!just.reason || String(just.reason).trim() === '') return 'Uzasadnienie jest wymagane.';
  }
  return null;
}