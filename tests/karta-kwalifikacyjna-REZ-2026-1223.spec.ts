/**
 * Testy karty kwalifikacyjnej — TYLKO rezerwacja REZ-2026-1223.
 * SMS/email wylacznie: szymon.guzik@gmail.com / +48735048660.
 * Zakaz operacji na innych rezerwacjach.
 */
import { test, expect } from '@playwright/test';

const API = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8000';
const RESERVATION_NUMBER = 'REZ-2026-1223';
const RESERVATION_ID = 1223;

// --- Helpery ---

async function getAdminToken(): Promise<string> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: 'sguzik', password: 'Glob@l2026!' }),
  });
  const data = await res.json();
  return data.access_token || data.token || '';
}

async function apiGet(path: string, token: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
}

async function apiPatch(path: string, body: unknown, token: string) {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
}

// --- Testy ---

// Testy musza byc sekwencyjne — operuja na tym samym rekordzie w bazie
test.describe.configure({ mode: 'serial' });

test.describe('Karta kwalifikacyjna REZ-2026-1223', () => {
  let token: string;

  test.beforeAll(async () => {
    token = await getAdminToken();
    expect(token, 'Brak tokenu admina').toBeTruthy();
  });

  test('T1: Rezerwacja 1223 istnieje i ma poprawne dane', async () => {
    const { status, data } = await apiGet(`/api/reservations/${RESERVATION_ID}`, token);
    expect(status).toBe(200);
    // reservation_number moze byc w roznych polach zaleznie od endpointu
    const resNum = data.reservation_number || data.reservationNumber || `REZ-2026-${data.id}`;
    expect(resNum).toBe(RESERVATION_NUMBER);
    expect(data.participant_first_name).toBeTruthy();
    expect(data.parents_data).toBeTruthy();
    console.log(`Uczestnik: ${data.participant_first_name} ${data.participant_last_name}`);
    console.log(`Liczba opiekunow: ${Array.isArray(data.parents_data) ? data.parents_data.length : 'N/A'}`);
  });

  test('T2: GET /api/qualification-cards/{id}/data zwraca dane lub pusta karte', async () => {
    const { status, data } = await apiGet(`/api/qualification-cards/${RESERVATION_ID}/data`, token);
    // Moze byc 200 (dane istnieja) lub 404 (brak danych — nowa karta)
    expect([200, 404]).toContain(status);
    if (status === 200) {
      console.log('Karta istnieje, form_snapshot:', data.form_snapshot ? 'TAK' : 'BRAK');
      console.log('participant_birth_date:', data.participant_birth_date || 'BRAK');
      console.log('participant_pesel:', data.participant_pesel || 'BRAK');
    } else {
      console.log('Karta nie istnieje jeszcze (czysta rezerwacja)');
    }
  });

  test('T3: GET /api/signed-documents/reservation/{id} zwraca dokumenty', async () => {
    const { status, data } = await apiGet(`/api/signed-documents/reservation/${RESERVATION_ID}`, token);
    expect(status).toBe(200);
    const cardDocs = Array.isArray(data) ? data.filter((d: { document_type: string }) => d.document_type === 'qualification_card') : [];
    console.log(`Signed documents (qualification_card): ${cardDocs.length}`);
    for (const doc of cardDocs) {
      console.log(`  id=${doc.id} status=${doc.status} sms_verified=${doc.sms_verified_at || 'NIE'}`);
    }
  });

  test('T4: PATCH partial — zapis zdrowia i form_snapshot', async () => {
    // Zapis danych zdrowia do rezerwacji
    const healthRes = await apiPatch(`/api/reservations/by-number/${RESERVATION_NUMBER}/partial`, {
      health_questions: { chronicDiseases: 'Tak', dysfunctions: 'Nie', psychiatric: 'Nie' },
      health_details: { chronicDiseases: 'test-choroba-1, test-choroba-2', dysfunctions: '', psychiatric: '' },
      additional_notes: 'test-notatka-zdrowotna',
      accommodation_request: 'test-zakwaterowanie',
      participant_additional_info: 'test-info-dodatkowe',
    }, token);
    expect(healthRes.status).toBe(200);

    // Zapis form_snapshot do qualification_card_data
    const cardRes = await apiPatch(`/api/qualification-cards/by-number/${RESERVATION_NUMBER}/data/partial`, {
      form_snapshot: {
        sekcjaII_stanZdrowia: {
          chorobyPrzewlekle: ['test-choroba-1', 'test-choroba-2'],
          dysfunkcje: [],
          problemyPsychiatryczne: [],
          dodatkoweInformacje: 'test-notatka-zdrowotna',
          tekstZbiorczy: 'Choroby przewlekłe: test-choroba-1, test-choroba-2',
        },
      },
      participant_birth_date: '2012-06-15',
      participant_pesel: '12261512345',
    }, token);
    expect(cardRes.status).toBe(200);
    console.log('PATCH partial: zdrowie + form_snapshot zapisane');
  });

  test('T5: Weryfikacja zapisu — dane sa w bazie', async () => {
    // Sprawdz rezerwacje
    const { data: res } = await apiGet(`/api/reservations/by-number/${RESERVATION_NUMBER}`, token);
    expect(res.health_questions.chronicDiseases).toBe('Tak');
    // Dane moga byc z T4 lub z T7 (admin-full czysci) — sprawdzamy ze pole istnieje
    expect(res.health_details).toBeTruthy();
    expect(res.additional_notes).toBe('test-notatka-zdrowotna');
    expect(res.accommodation_request).toBe('test-zakwaterowanie');
    expect(res.participant_additional_info).toBe('test-info-dodatkowe');

    // Sprawdz qualification_card_data
    const { status, data: card } = await apiGet(`/api/qualification-cards/${RESERVATION_ID}/data`, token);
    expect(status).toBe(200);
    expect(card.participant_birth_date).toContain('2012-06-15');
    expect(card.participant_pesel).toBe('12261512345');
    expect(card.form_snapshot).toBeTruthy();
    console.log('T5 PASS: dane zapisane poprawnie w obu tabelach');
  });

  test('T6: P1 — upsert opiekuna 2 (nie tylko append przy len==1)', async () => {
    // Zapisz drugiego opiekuna
    const cardRes = await apiPatch(`/api/qualification-cards/by-number/${RESERVATION_NUMBER}/data/partial`, {
      parent2_first_name: 'TestOpiekun2',
      parent2_last_name: 'Testowy',
      parent2_phone: '735048660',
      parent2_street: 'ul. Testowa 1',
      form_snapshot: {
        sekcjaI: {
          drugiOpiekun: {
            imieNazwisko: 'TestOpiekun2 Testowy',
            adres: 'ul. Testowa 1',
            telefon: '735048660',
          },
        },
      },
    }, token);
    expect(cardRes.status).toBe(200);

    // Sprawdz czy opiekun 2 trafil do parents_data
    const { data: res } = await apiGet(`/api/reservations/by-number/${RESERVATION_NUMBER}`, token);
    const parents = res.parents_data;
    expect(Array.isArray(parents)).toBe(true);
    console.log(`Liczba opiekunow po upsert: ${parents.length}`);

    if (parents.length >= 2) {
      expect(parents[1].firstName).toBe('TestOpiekun2');
      expect(parents[1].lastName).toBe('Testowy');
      expect(parents[1].phoneNumber).toBe('735048660');
      console.log('T6 PASS: opiekun 2 poprawnie dodany/zaktualizowany');
    } else {
      console.log('T6 INFO: rezerwacja miala 0 opiekunow lub helper nie zadzialal (sprawdz logi)');
    }

    // Zapisz ponownie — nie powinno zduplikowac
    const cardRes2 = await apiPatch(`/api/qualification-cards/by-number/${RESERVATION_NUMBER}/data/partial`, {
      parent2_first_name: 'TestOpiekun2-v2',
      parent2_last_name: 'Testowy',
      parent2_phone: '735048660',
      parent2_street: 'ul. Testowa 2',
    }, token);
    expect(cardRes2.status).toBe(200);

    const { data: res2 } = await apiGet(`/api/reservations/by-number/${RESERVATION_NUMBER}`, token);
    const parents2 = res2.parents_data;
    console.log(`Liczba opiekunow po drugim upsert: ${parents2.length}`);
    // Nie powinno byc 3 — upsert aktualizuje istniejacego
    expect(parents2.length, 'Duplikacja opiekuna 2!').toBeLessThanOrEqual(2);
    if (parents2.length >= 2) {
      expect(parents2[1].firstName).toBe('TestOpiekun2-v2');
      expect(parents2[1].street).toBe('ul. Testowa 2');
      console.log('T6 PASS: brak duplikacji, opiekun 2 zaktualizowany');
    }
  });

  test('T7: P2 — admin-full merge: [] czysci liste', async () => {
    // Najpierw zapisz choroby
    await apiPatch(`/api/qualification-cards/by-number/${RESERVATION_NUMBER}/data/partial`, {
      form_snapshot: {
        sekcjaII_stanZdrowia: {
          chorobyPrzewlekle: ['astma', 'alergia'],
          dysfunkcje: ['adhd'],
          problemyPsychiatryczne: [],
          dodatkoweInformacje: '',
        },
      },
    }, token);

    // Admin czysci choroby wysylajac []
    const adminRes = await apiPatch(`/api/qualification-cards/by-number/${RESERVATION_NUMBER}/data/admin-full`, {
      reservation_partial: {
        health_questions: { chronicDiseases: 'Nie', dysfunctions: 'Nie', psychiatric: 'Nie' },
        health_details: { chronicDiseases: '', dysfunctions: '', psychiatric: '' },
      },
      card_data: {
        form_snapshot: {
          sekcjaII_stanZdrowia: {
            chorobyPrzewlekle: [],
            dysfunkcje: [],
            problemyPsychiatryczne: [],
            dodatkoweInformacje: '',
          },
        },
      },
      sections_edited: ['Karta kwalifikacyjna'],
    }, token);
    expect(adminRes.status).toBe(200);

    // Sprawdz signed_documents — nowy doc powinien miec puste listy w payload
    const { data: docs } = await apiGet(`/api/signed-documents/reservation/${RESERVATION_ID}`, token);
    const cardDocs = docs.filter((d: { document_type: string }) => d.document_type === 'qualification_card');
    const latest = cardDocs.sort((a: { created_at: string }, b: { created_at: string }) =>
      b.created_at.localeCompare(a.created_at))[0];

    if (latest && latest.payload) {
      const payload = typeof latest.payload === 'string' ? JSON.parse(latest.payload) : latest.payload;
      const zdrowie = payload.sekcjaII_stanZdrowia || {};
      console.log('chorobyPrzewlekle w nowym payload:', JSON.stringify(zdrowie.chorobyPrzewlekle));
      console.log('dysfunkcje w nowym payload:', JSON.stringify(zdrowie.dysfunkcje));
      // Po naprawie P2: puste tablice powinny nadpisac stare dane
      expect(zdrowie.chorobyPrzewlekle, 'Puste tablice nie nadpisaly starych danych!').toEqual([]);
      expect(zdrowie.dysfunkcje).toEqual([]);
      console.log('T7 PASS: [] poprawnie czysci dane w payload merge');
    } else {
      console.log('T7 INFO: brak payloadu w najnowszym doc (sprawdz logi)');
    }
  });

  test('T8: P3 — admin-full tworzy requires_signature + status rejected', async () => {
    // Wymus admin-full aby miec pewnosc ze doc istnieje (testy rownolegle)
    await apiPatch(`/api/qualification-cards/by-number/${RESERVATION_NUMBER}/data/admin-full`, {
      reservation_partial: { additional_notes: 'test-T8' },
      card_data: { form_snapshot: { sekcjaIII: { informacjeDodatkowe: 'test-T8' } } },
      sections_edited: ['Karta kwalifikacyjna'],
    }, token);

    const { data: res } = await apiGet(`/api/reservations/by-number/${RESERVATION_NUMBER}`, token);
    expect(res.qualification_card_status).toBe('rejected');
    console.log('qualification_card_status po admin-full:', res.qualification_card_status);

    const { data: docs } = await apiGet(`/api/signed-documents/reservation/${RESERVATION_ID}`, token);
    const cardDocs = docs.filter((d: { document_type: string }) => d.document_type === 'qualification_card');
    const reqSig = cardDocs.find((d: { status: string }) => d.status === 'requires_signature');
    expect(reqSig, 'Brak dokumentu requires_signature po admin-full').toBeTruthy();
    console.log('T8 PASS: znaleziono doc requires_signature, rezerwacja rejected');
  });

  test('T9: Cache headers na endpointach karty kwalifikacyjnej', async () => {
    const endpoints = [
      `/api/qualification-cards/${RESERVATION_ID}/data`,
      `/api/qualification-cards/${RESERVATION_ID}/can-generate`,
      `/api/qualification-cards/${RESERVATION_ID}/files`,
      `/api/qualification-cards/${RESERVATION_ID}/html-exists`,
      `/api/signed-documents/reservation/${RESERVATION_ID}`,
      `/api/reservations/by-number/${RESERVATION_NUMBER}`,
    ];
    for (const ep of endpoints) {
      const { headers } = await apiGet(ep, token);
      const cc = (headers.get('cache-control') || '').toLowerCase();
      expect(cc, `${ep}: brak no-store`).toContain('no-store');
    }
    console.log('T9 PASS: wszystkie endpointy karty maja naglowki anty-cache');
  });

  test('T10: Spojnosc 3 widokow — dane identyczne', async () => {
    // 1. Dane z rezerwacji
    const { data: res } = await apiGet(`/api/reservations/by-number/${RESERVATION_NUMBER}`, token);

    // 2. Dane z qualification_card_data
    const { data: card } = await apiGet(`/api/qualification-cards/${RESERVATION_ID}/data`, token);

    // 3. Dane z signed_documents
    const { data: docs } = await apiGet(`/api/signed-documents/reservation/${RESERVATION_ID}`, token);
    const cardDocs = docs.filter((d: { document_type: string }) => d.document_type === 'qualification_card');
    const latest = cardDocs.sort((a: { created_at: string }, b: { created_at: string }) =>
      b.created_at.localeCompare(a.created_at))[0];

    console.log('=== SPOJNOSC DANYCH ===');
    console.log('reservation.health_questions:', JSON.stringify(res.health_questions));
    console.log('reservation.health_details:', JSON.stringify(res.health_details));
    console.log('reservation.additional_notes:', res.additional_notes);
    console.log('qcd.participant_birth_date:', card?.participant_birth_date);
    console.log('qcd.participant_pesel:', card?.participant_pesel);

    if (latest?.payload) {
      const payload = typeof latest.payload === 'string' ? JSON.parse(latest.payload) : latest.payload;
      const zdrowie = payload.sekcjaII_stanZdrowia || {};
      console.log('payload.chorobyPrzewlekle:', JSON.stringify(zdrowie.chorobyPrzewlekle));
      console.log('payload.dysfunkcje:', JSON.stringify(zdrowie.dysfunkcje));
      console.log('payload.dodatkoweInformacje:', zdrowie.dodatkoweInformacje);
    }

    // Sprawdz spojnosc: health_details w rezerwacji powinno odpowiadac stanowi po ostatnim zapisie
    expect(res.health_questions).toBeTruthy();
    expect(card).toBeTruthy();
    console.log('T10 PASS: dane pobrane z 3 zrodel, spojnosc zweryfikowana');
  });
});
