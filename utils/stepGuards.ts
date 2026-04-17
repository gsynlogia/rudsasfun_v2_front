/**
 * Step Guards
 * Walidacja minimalna czy poprzednie kroki rezerwacji są wypełnione.
 *
 * Używane przy wejściu na stronę /step/N — jeśli user ręcznie zmieni URL na /step/5
 * nie przechodząc przez poprzednie kroki, guard redirectuje go do pierwszego
 * niewypełnionego kroku.
 *
 * Walidacja fundamentalna (podstawowe pola wymagane), nie pełna — pełna walidacja
 * jest w komponencie przy kliknięciu „Dalej" i działa nadal niezależnie.
 */
import { loadStep1FormData, loadStep2FormData, loadStep3FormData, loadStep4FormData } from './sessionStorage';

export type StepNumber = 1 | 2 | 3 | 4 | 5;

const nonEmpty = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0;

export function isStep1Filled(): boolean {
  const d = loadStep1FormData();
  if (!d) return false;
  const p0 = d.parents?.[0];
  if (!p0 || !nonEmpty(p0.firstName) || !nonEmpty(p0.lastName) || !nonEmpty(p0.phoneNumber) || !nonEmpty(p0.email)) {
    return false;
  }
  const pa = d.participantData;
  if (!pa || !nonEmpty(pa.firstName) || !nonEmpty(pa.lastName) || !nonEmpty(pa.age) || !nonEmpty(pa.gender) || !nonEmpty(pa.city)) {
    return false;
  }
  return true;
}

export function isStep2Filled(): boolean {
  const d = loadStep2FormData();
  if (!d) return false;
  const t = d.transportData;
  if (!t || !nonEmpty(t.departureType) || !nonEmpty(t.returnType)) return false;
  // `zbiorowy` wymaga miasta; `wlasny` nie
  if (t.departureType === 'zbiorowy' && !nonEmpty(t.departureCity)) return false;
  if (t.returnType === 'zbiorowy' && !nonEmpty(t.returnCity)) return false;
  if (!nonEmpty(d.selectedSource)) return false;
  return true;
}

export function isStep3Filled(): boolean {
  const d = loadStep3FormData();
  if (!d) return false;
  // Step 3 jest wypełniony gdy user świadomie odpowiedział na pytanie o fakturę (wantsInvoice).
  // Jeśli nie chce faktury — wystarczy wantsInvoice=false.
  // Jeśli chce fakturę — wymagamy invoiceType + odpowiednich danych.
  if (d.wantsInvoice === undefined || d.wantsInvoice === null) return false;
  if (d.wantsInvoice) {
    if (d.invoiceType === 'private') {
      const p = d.privateData;
      if (!p || !nonEmpty(p.firstName) || !nonEmpty(p.lastName) || !nonEmpty(p.email)
          || !nonEmpty(p.street) || !nonEmpty(p.postalCode) || !nonEmpty(p.city)) return false;
    } else if (d.invoiceType === 'company') {
      const c = d.companyData;
      if (!c || !nonEmpty(c.companyName) || !nonEmpty(c.nip) || !nonEmpty(c.street)
          || !nonEmpty(c.postalCode) || !nonEmpty(c.city)) return false;
    } else {
      return false;
    }
  }
  return true;
}

export function isStep4Filled(): boolean {
  const d = loadStep4FormData();
  if (!d) return false;
  return d.consent1 === true && d.consent2 === true && d.consent3 === true && d.consent4 === true;
}

/**
 * Zwraca numer pierwszego niewypełnionego kroku (1..4).
 * Sprawdza tylko kroki POPRZEDZAJĄCE `currentStep`.
 * Zwraca `null` jeśli wszystkie poprzednie kroki są wypełnione.
 */
export function firstUnfilledStepBefore(currentStep: StepNumber): StepNumber | null {
  if (currentStep > 1 && !isStep1Filled()) return 1;
  if (currentStep > 2 && !isStep2Filled()) return 2;
  if (currentStep > 3 && !isStep3Filled()) return 3;
  if (currentStep > 4 && !isStep4Filled()) return 4;
  return null;
}
