import {
  computeReminderRowColor,
  getRowColorClass,
  type LastReminderInput,
} from '@/lib/utils/computeReminderRowColor';

// Pure function — testowalna bez DOM/Next/auth (CLAUDE.md wzorzec Pure function).
//
// Logika (potwierdzone 2026-05-31 przez usera + decyzje autonomiczne D1-D4):
//  - last_reminder = null → 'red' ("nigdy nie bylo przypomnienia bo mamy 5+")
//  - channel = 'failed' → 'red' (D2: klient nic nie dostal = de facto brak reminderu)
//  - dni kalendarzowe w strefie Europe/Warsaw od daty remindera do "teraz":
//      0-2 dni  → 'blue'   (dzis / wczoraj / przedwczoraj — swieze)
//      3-4 dni  → 'orange' (uwaga, czas na ponowienie)
//      5+ dni   → 'red'    (krytyczne, dawno bez kontaktu)
//  - data przyszla (clock skew / cron error) → 'blue' (traktuj jak dzis)
//  - niepoprawna data (parsing fail) → 'none' (defensywnie, brak koloru)

function warsawDateAt(year: number, month: number, day: number, hour = 12): Date {
  // Pomocnik: data w Warsaw o danej godzinie → ISO UTC.
  // Warsaw to UTC+1 (CET zima) lub UTC+2 (CEST lato). Maj 2026 = CEST = UTC+2.
  const utcHour = hour - 2;
  return new Date(Date.UTC(year, month - 1, day, utcHour, 0, 0));
}

describe('computeReminderRowColor', () => {
  // "Teraz" referencyjne: 31 maja 2026 14:00 Warsaw (CEST) = 12:00 UTC
  const NOW_2026_05_31_14_WARSAW = warsawDateAt(2026, 5, 31, 14);

  describe('null / failed → czerwony', () => {
    it('zwraca "red" gdy lastReminder = null (nigdy nie wyslano)', () => {
      expect(computeReminderRowColor(null, NOW_2026_05_31_14_WARSAW)).toBe('red');
    });

    it('zwraca "red" gdy channel = "failed" (proba byla, ale klient nic nie dostal)', () => {
      const r: LastReminderInput = {
        at: warsawDateAt(2026, 5, 31, 13).toISOString(), // godzine temu
        channel: 'failed',
      };
      expect(computeReminderRowColor(r, NOW_2026_05_31_14_WARSAW)).toBe('red');
    });

    it('zwraca "red" gdy channel = "failed" nawet z bardzo swieza data', () => {
      const r: LastReminderInput = {
        at: NOW_2026_05_31_14_WARSAW.toISOString(),
        channel: 'failed',
      };
      expect(computeReminderRowColor(r, NOW_2026_05_31_14_WARSAW)).toBe('red');
    });
  });

  describe('0-2 dni → niebieski', () => {
    it('zwraca "blue" gdy reminder dzisiaj o tej samej porze (0 dni)', () => {
      const r: LastReminderInput = {
        at: warsawDateAt(2026, 5, 31, 14).toISOString(),
        channel: 'email',
      };
      expect(computeReminderRowColor(r, NOW_2026_05_31_14_WARSAW)).toBe('blue');
    });

    it('zwraca "blue" gdy reminder dzisiaj o 8:00 (kilka godzin temu, 0 dni kalend.)', () => {
      const r: LastReminderInput = {
        at: warsawDateAt(2026, 5, 31, 8).toISOString(),
        channel: 'sms',
      };
      expect(computeReminderRowColor(r, NOW_2026_05_31_14_WARSAW)).toBe('blue');
    });

    it('zwraca "blue" gdy reminder wczoraj (1 dzien kalend.)', () => {
      const r: LastReminderInput = {
        at: warsawDateAt(2026, 5, 30, 14).toISOString(),
        channel: 'both',
      };
      expect(computeReminderRowColor(r, NOW_2026_05_31_14_WARSAW)).toBe('blue');
    });

    it('zwraca "blue" gdy reminder przedwczoraj (2 dni kalend.)', () => {
      const r: LastReminderInput = {
        at: warsawDateAt(2026, 5, 29, 14).toISOString(),
        channel: 'email',
      };
      expect(computeReminderRowColor(r, NOW_2026_05_31_14_WARSAW)).toBe('blue');
    });

    it('zwraca "blue" gdy reminder wczoraj o 23:59 Warsaw (edge: granica polnocy)', () => {
      const r: LastReminderInput = {
        at: warsawDateAt(2026, 5, 30, 23).toISOString(), // 23:00 Warsaw 30 maja
        channel: 'sms',
      };
      const now = warsawDateAt(2026, 5, 31, 0); // 00:00 Warsaw 31 maja (godzine pozniej)
      expect(computeReminderRowColor(r, now)).toBe('blue'); // 1 dzien kalend.
    });
  });

  describe('3-4 dni → pomaranczowy', () => {
    it('zwraca "orange" gdy reminder 3 dni temu', () => {
      const r: LastReminderInput = {
        at: warsawDateAt(2026, 5, 28, 14).toISOString(),
        channel: 'email',
      };
      expect(computeReminderRowColor(r, NOW_2026_05_31_14_WARSAW)).toBe('orange');
    });

    it('zwraca "orange" gdy reminder 4 dni temu', () => {
      const r: LastReminderInput = {
        at: warsawDateAt(2026, 5, 27, 14).toISOString(),
        channel: 'both',
      };
      expect(computeReminderRowColor(r, NOW_2026_05_31_14_WARSAW)).toBe('orange');
    });
  });

  describe('5+ dni → czerwony', () => {
    it('zwraca "red" gdy reminder 5 dni temu (granica)', () => {
      const r: LastReminderInput = {
        at: warsawDateAt(2026, 5, 26, 14).toISOString(),
        channel: 'sms',
      };
      expect(computeReminderRowColor(r, NOW_2026_05_31_14_WARSAW)).toBe('red');
    });

    it('zwraca "red" gdy reminder 10 dni temu', () => {
      const r: LastReminderInput = {
        at: warsawDateAt(2026, 5, 21, 14).toISOString(),
        channel: 'email',
      };
      expect(computeReminderRowColor(r, NOW_2026_05_31_14_WARSAW)).toBe('red');
    });

    it('zwraca "red" gdy reminder 30 dni temu (miesiac)', () => {
      const r: LastReminderInput = {
        at: warsawDateAt(2026, 5, 1, 14).toISOString(),
        channel: 'both',
      };
      expect(computeReminderRowColor(r, NOW_2026_05_31_14_WARSAW)).toBe('red');
    });
  });

  describe('edge cases', () => {
    it('zwraca "blue" gdy reminder w przyszlosci (clock skew, traktuj jak 0 dni)', () => {
      const r: LastReminderInput = {
        at: warsawDateAt(2026, 6, 5, 14).toISOString(), // 5 dni w przyszlosci
        channel: 'email',
      };
      expect(computeReminderRowColor(r, NOW_2026_05_31_14_WARSAW)).toBe('blue');
    });

    it('zwraca "none" gdy data jest niepoprawna (parsing fail)', () => {
      const r: LastReminderInput = {
        at: 'not-a-date-at-all',
        channel: 'email',
      };
      expect(computeReminderRowColor(r, NOW_2026_05_31_14_WARSAW)).toBe('none');
    });

    it('zwraca "blue" gdy reminder z 31 maja 23:55 Warsaw vs now 1 czerwca 00:05 Warsaw (1 dzien)', () => {
      // Reminder o 23:55 Warsaw 31 maja
      const r: LastReminderInput = {
        at: new Date(Date.UTC(2026, 4, 31, 21, 55)).toISOString(), // 23:55 Warsaw = 21:55 UTC
        channel: 'sms',
      };
      // Now: 00:05 Warsaw 1 czerwca = 22:05 UTC 31 maja
      const now = new Date(Date.UTC(2026, 4, 31, 22, 5));
      expect(computeReminderRowColor(r, now)).toBe('blue'); // 1 dzien kalend. (30 -> 31, opps; faktycznie 31 -> 1, czyli 1 dzien)
    });

    it('traktuje ISO bez Z (assume UTC) tak samo jak z Z', () => {
      const withZ: LastReminderInput = {
        at: warsawDateAt(2026, 5, 31, 14).toISOString(), // ma "Z" na koncu
        channel: 'email',
      };
      const withoutZ: LastReminderInput = {
        at: warsawDateAt(2026, 5, 31, 14).toISOString().replace('Z', ''), // bez "Z"
        channel: 'email',
      };
      expect(computeReminderRowColor(withZ, NOW_2026_05_31_14_WARSAW)).toBe(
        computeReminderRowColor(withoutZ, NOW_2026_05_31_14_WARSAW),
      );
    });
  });
});

describe('getRowColorClass', () => {
  it('zwraca tailwind bg-sky-50 dla blue', () => {
    expect(getRowColorClass('blue')).toContain('bg-sky-50');
    expect(getRowColorClass('blue')).toContain('hover:bg-sky-100');
  });

  it('zwraca tailwind bg-orange-50 dla orange', () => {
    expect(getRowColorClass('orange')).toContain('bg-orange-50');
    expect(getRowColorClass('orange')).toContain('hover:bg-orange-100');
  });

  it('zwraca tailwind bg-red-50 dla red', () => {
    expect(getRowColorClass('red')).toContain('bg-red-50');
    expect(getRowColorClass('red')).toContain('hover:bg-red-100');
  });

  it('zwraca neutralny hover dla none (bez tla)', () => {
    const cls = getRowColorClass('none');
    expect(cls).toContain('hover:bg-gray-50');
    // Nie zawiera niebieskiego/pomaranczowego/czerwonego tla:
    expect(cls).not.toMatch(/bg-(sky|orange|red)-\d+/);
  });
});

import { computeActiveRowColor } from '@/lib/utils/computeReminderRowColor';

// Bug user 2026-06-01: oba dokumenty zatwierdzone → wiersz zielony (nie czerwony z braku reminderu).
describe('computeActiveRowColor (DOKUMENTY mode=active)', () => {
  const noReminder = null;
  const oldReminder: LastReminderInput = { at: '2026-05-01T10:00:00Z', channel: 'sms' }; // dawno → red

  it('oba approved + brak przypomnienia → green (nie red)', () => {
    expect(computeActiveRowColor('approved', 'approved', noReminder)).toBe('green');
  });

  it('oba approved + dawne przypomnienie (5+ dni) → green (override koloru reminderu)', () => {
    const now = new Date('2026-06-01T10:00:00Z');
    expect(computeActiveRowColor('approved', 'approved', oldReminder, now)).toBe('green');
  });

  it('accepted traktowane jak approved (defensywnie)', () => {
    expect(computeActiveRowColor('accepted', 'accepted', noReminder)).toBe('green');
  });

  it('tylko karta approved, umowa brak → kolor wg reminderu (tu red dla null)', () => {
    expect(computeActiveRowColor(null, 'approved', noReminder)).toBe('red');
  });

  it('oba in_verification → NIE green, kolor wg reminderu', () => {
    const now = new Date('2026-06-01T10:00:00Z');
    const recent: LastReminderInput = { at: '2026-05-31T10:00:00Z', channel: 'sms' };
    expect(computeActiveRowColor('in_verification', 'in_verification', recent, now)).toBe('blue');
  });

  it('signed_pending_admin + approved → NIE green (umowa czeka admina)', () => {
    expect(computeActiveRowColor('signed_pending_admin', 'approved', noReminder)).toBe('red');
  });
});
