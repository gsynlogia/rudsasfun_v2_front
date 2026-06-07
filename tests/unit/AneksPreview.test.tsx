/**
 * Unit test komponentu AneksPreview — TD-021.
 *
 * Komponent renderuje aneks promocyjny (annex_version=2 rich payload + v1 legacy fallback).
 * Reuse z panelu admin (page.tsx) → panel klienta (Downloads.tsx) po TD-022.
 *
 * Pokrywa:
 * - 4 defensive guards z TD-022 sesja_ii (Array.isArray, typeof number, ?? fallbacks)
 * - parsing JSON (null / invalid / empty / valid)
 * - rich payload v2 (tabela PRZED/PO + price_summary)
 * - legacy v1 fallback render
 * - edge cases (changes=[], delta_percent null, unknown action, before/after null)
 *
 * Bez DB, bez fetch, bez Next runtime — pure React component test.
 */
import { render, screen } from '@testing-library/react';
import AneksPreview from '../../components/admin/AneksPreview';

describe('AneksPreview — defensive guards (TD-021)', () => {
  it('payloadJson=null → renderuje "Brak danych aneksu" zamiast crashu', () => {
    render(<AneksPreview payloadJson={null} />);
    expect(screen.getByText(/Brak danych aneksu/i)).toBeInTheDocument();
  });

  it('payloadJson=undefined → renderuje "Brak danych aneksu"', () => {
    render(<AneksPreview payloadJson={undefined} />);
    expect(screen.getByText(/Brak danych aneksu/i)).toBeInTheDocument();
  });

  it('payloadJson="" (empty string) → renderuje "Brak danych aneksu" (falsy)', () => {
    render(<AneksPreview payloadJson="" />);
    expect(screen.getByText(/Brak danych aneksu/i)).toBeInTheDocument();
  });

  it('payloadJson=invalid JSON → try/catch chroni przed crash, "Brak danych aneksu"', () => {
    render(<AneksPreview payloadJson='{"foo": "unterminated' />);
    expect(screen.getByText(/Brak danych aneksu/i)).toBeInTheDocument();
  });
});

describe('AneksPreview — rich payload v2 (annex_version=2)', () => {
  const richPayload = JSON.stringify({
    annex_version: 2,
    annex_type: 'promotion_change',
    created_at: '2026-05-24T23:19:40Z',
    admin_user_id: 1,
    admin_user_name: 'Joanna',
    change_summary: 'Skasowano Duża Rodzina',
    summary_human: 'Zmiana w promocjach',
    changes: [
      {
        field: 'legacy_promotion',
        label: 'Promocja (stary system)',
        action: 'removed',
        before: { nazwa: 'Duża Rodzina', kwota: 70.0 },
        after: null,
        source: 'legacy',
      },
    ],
    price_summary: {
      before: 2350.0,
      after: 2420.0,
      delta: 70.0,
      delta_percent: 2.98,
      direction: 'increased',
    },
  });

  it('renderuje nagłówek "Aneks promocyjny"', () => {
    render(<AneksPreview payloadJson={richPayload} reservationNumber="REZ-2026-1938" />);
    expect(screen.getByText('Aneks promocyjny')).toBeInTheDocument();
  });

  it('renderuje reservationNumber w nagłówku', () => {
    render(<AneksPreview payloadJson={richPayload} reservationNumber="REZ-2026-1938" />);
    expect(screen.getByText(/REZ-2026-1938/i)).toBeInTheDocument();
  });

  it('renderuje admin_user_name', () => {
    render(<AneksPreview payloadJson={richPayload} />);
    expect(screen.getByText(/Joanna/i)).toBeInTheDocument();
  });

  it('renderuje tabelę zmian z PRZED/PO', () => {
    render(<AneksPreview payloadJson={richPayload} />);
    expect(screen.getByText('Zmiany w umowie')).toBeInTheDocument();
    expect(screen.getByText('Pole')).toBeInTheDocument();
    expect(screen.getByText('Akcja')).toBeInTheDocument();
    expect(screen.getByText('PRZED')).toBeInTheDocument();
    expect(screen.getByText('PO')).toBeInTheDocument();
    expect(screen.getByText('Promocja (stary system)')).toBeInTheDocument();
  });

  it('renderuje sekcję "Cena umowy" z PRZED/PO/Różnica', () => {
    render(<AneksPreview payloadJson={richPayload} />);
    expect(screen.getByText('Cena umowy')).toBeInTheDocument();
    expect(screen.getByText('2350.00 zł')).toBeInTheDocument();
    expect(screen.getByText('2420.00 zł')).toBeInTheDocument();
    // delta z formatPLN ma znak +
    expect(screen.getByText(/\+70\.00 zł/)).toBeInTheDocument();
  });

  it('renderuje delta_percent gdy != 0', () => {
    render(<AneksPreview payloadJson={richPayload} />);
    expect(screen.getByText(/2\.98%/)).toBeInTheDocument();
  });
});

describe('AneksPreview — edge cases (defensive guards TD-022)', () => {
  it('changes=[] (REZ-1818 scenario) → renderuje TYLKO price_summary, brak tabeli', () => {
    const emptyChangesPayload = JSON.stringify({
      annex_version: 2,
      changes: [],
      price_summary: { before: 3090, after: 3190, delta: 100, delta_percent: 3.24, direction: 'increased' },
    });
    render(<AneksPreview payloadJson={emptyChangesPayload} />);
    expect(screen.queryByText('Zmiany w umowie')).not.toBeInTheDocument();
    expect(screen.getByText('Cena umowy')).toBeInTheDocument();
  });

  it('changes=string (zły typ) → Array.isArray guard chroni, brak crashu', () => {
    const badChangesPayload = JSON.stringify({
      annex_version: 2,
      changes: 'not an array',
      price_summary: { before: 100, after: 200, delta: 100, delta_percent: 100, direction: 'increased' },
    });
    expect(() => {
      render(<AneksPreview payloadJson={badChangesPayload} />);
    }).not.toThrow();
    // changes traktowane jak [] przez Array.isArray guard → brak tabeli
    expect(screen.queryByText('Zmiany w umowie')).not.toBeInTheDocument();
  });

  it('delta_percent=null → typeof number guard chroni, brak crashu z .toFixed', () => {
    const nullDeltaPctPayload = JSON.stringify({
      annex_version: 2,
      changes: [],
      price_summary: { before: 100, after: 200, delta: 100, delta_percent: null, direction: 'increased' },
    });
    expect(() => {
      render(<AneksPreview payloadJson={nullDeltaPctPayload} />);
    }).not.toThrow();
    // Brak % obok delta bo null
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('unknown action="weird" → fallback ?? ch.action zamiast undefined w ACTION_LABEL', () => {
    const unknownActionPayload = JSON.stringify({
      annex_version: 2,
      changes: [
        { field: 'x', label: 'Pole X', action: 'weird', before: null, after: null },
      ],
    });
    render(<AneksPreview payloadJson={unknownActionPayload} />);
    // Tabela się renderuje, w komórce Akcja widać surowy 'weird' jako fallback
    expect(screen.getByText('Pole X')).toBeInTheDocument();
    expect(screen.getByText('weird')).toBeInTheDocument();
  });

  it('before=null + after=null → describeBlock zwraca "— brak —"', () => {
    const nullBeforeAfterPayload = JSON.stringify({
      annex_version: 2,
      changes: [
        { field: 'x', label: 'Pole X', action: 'removed', before: null, after: null },
      ],
    });
    render(<AneksPreview payloadJson={nullBeforeAfterPayload} />);
    // Co najmniej 2 wystąpienia "— brak —" (jedno przed, jedno po)
    const brakElements = screen.getAllByText(/— brak —/);
    expect(brakElements.length).toBeGreaterThanOrEqual(2);
  });

  it('price_summary=undefined → conditional render, brak sekcji cenowej', () => {
    const noPricePayload = JSON.stringify({
      annex_version: 2,
      changes: [
        { field: 'x', label: 'Pole X', action: 'changed', before: { kwota: 100 }, after: { kwota: 200 } },
      ],
    });
    render(<AneksPreview payloadJson={noPricePayload} />);
    expect(screen.getByText('Zmiany w umowie')).toBeInTheDocument();
    expect(screen.queryByText('Cena umowy')).not.toBeInTheDocument();
  });
});

describe('AneksPreview — legacy v1 fallback', () => {
  it('annex_version=1 → fallback render (bez tabeli changes)', () => {
    const legacyPayload = JSON.stringify({
      annex_version: 1,
      created_at: '2026-04-01T10:00:00Z',
      change_summary: 'Stary aneks v1',
      diff: { total_price_delta: 50.0 },
    });
    render(<AneksPreview payloadJson={legacyPayload} reservationNumber="REZ-2024-100" />);
    // Nagłówek powinien być
    expect(screen.getByText('Aneks promocyjny')).toBeInTheDocument();
    // V1 nie renderuje sekcji "Zmiany w umowie" (rich payload v2)
    expect(screen.queryByText('Zmiany w umowie')).not.toBeInTheDocument();
  });

  it('brak annex_version (undefined) → fallback do v1 (version ?? 1)', () => {
    const noVersionPayload = JSON.stringify({
      created_at: '2026-04-01T10:00:00Z',
      change_summary: 'Bez wersji',
    });
    render(<AneksPreview payloadJson={noVersionPayload} />);
    expect(screen.getByText('Aneks promocyjny')).toBeInTheDocument();
  });
});
