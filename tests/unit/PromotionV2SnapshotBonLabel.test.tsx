/// <reference types="@testing-library/jest-dom" />
/**
 * TDD — karta Trello 009: PromotionV2Snapshot nie renderuje frazy
 * „świadczenie niecenowe" po prawej stronie kafla dla kategorii != obniza_cene.
 *
 * Szymon 2026-04-20: „tu nie ma być żadnego tekstu (wystarczy że jest Bon)".
 * Badge „Bon"/„Darmowa atrakcja"/„Darmowy gadżet" renderowany jest w środku kafla
 * (linia 112 — kategoriaLabel) i ma zostać. Fraza po prawej znika.
 *
 * Dla kategorii obniza_cene nadal widoczna kwota „-X zł" po prawej (regresja).
 */
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import PromotionV2Snapshot from '@/components/profile/PromotionV2Snapshot';

const SNAPSHOT_BASE = {
  promotion_system_version: 'v2',
  promotion_v2_id: null as number | null,
  promotion_v2_snapshot: null,
  promotion_v2_custom_values: null,
  applied_promotion_discount: 0,
  total_price: 2900,
};

function mockFetchOnce(payload: unknown) {
  (global as any).fetch = jest.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(payload) } as Response),
  );
}

describe('PromotionV2Snapshot — brak frazy „świadczenie niecenowe" (karta 009)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('kategoria nie_obniza_ceny (bon) — brak frazy, badge „Bon" zostaje', async () => {
    mockFetchOnce({
      ...SNAPSHOT_BASE,
      promo_code_id: 42,
      promo_code_snapshot: {
        kod: 'GOLDRABAT2026',
        kategoria: 'nie_obniza_ceny',
        opis: '120 zł do wykorzystania w sklepiku Radsas Fun',
      },
      applied_promo_code_discount: 0,
    });

    render(<PromotionV2Snapshot reservationId={1} />);

    await waitFor(() => expect(screen.getByText('GOLDRABAT2026')).toBeInTheDocument());
    expect(screen.getByText('Bon')).toBeInTheDocument();
    expect(screen.queryByText('świadczenie niecenowe')).not.toBeInTheDocument();
  });

  it('kategoria atrakcja — brak frazy, badge „Darmowa atrakcja" zostaje', async () => {
    mockFetchOnce({
      ...SNAPSHOT_BASE,
      promo_code_id: 43,
      promo_code_snapshot: {
        kod: 'SKUTER2026',
        kategoria: 'atrakcja',
        opis: 'Przejażdżka skuterem wodnym',
      },
      applied_promo_code_discount: 0,
    });

    render(<PromotionV2Snapshot reservationId={2} />);

    await waitFor(() => expect(screen.getByText('SKUTER2026')).toBeInTheDocument());
    expect(screen.getByText('Darmowa atrakcja')).toBeInTheDocument();
    expect(screen.queryByText('świadczenie niecenowe')).not.toBeInTheDocument();
  });

  it('kategoria gadzet — brak frazy, badge „Darmowy gadżet" zostaje', async () => {
    mockFetchOnce({
      ...SNAPSHOT_BASE,
      promo_code_id: 44,
      promo_code_snapshot: {
        kod: 'KOSZULKA2026',
        kategoria: 'gadzet',
        opis: 'Koszulka obozowa',
      },
      applied_promo_code_discount: 0,
    });

    render(<PromotionV2Snapshot reservationId={3} />);

    await waitFor(() => expect(screen.getByText('KOSZULKA2026')).toBeInTheDocument());
    expect(screen.getByText('Darmowy gadżet')).toBeInTheDocument();
    expect(screen.queryByText('świadczenie niecenowe')).not.toBeInTheDocument();
  });

  it('kategoria obniza_cene — kwota „-X zł" widoczna (regresja)', async () => {
    mockFetchOnce({
      ...SNAPSHOT_BASE,
      promo_code_id: 45,
      promo_code_snapshot: {
        kod: 'LATO2026',
        kategoria: 'obniza_cene',
        opis: 'Rabat 100 zł',
      },
      applied_promo_code_discount: 100,
    });

    render(<PromotionV2Snapshot reservationId={4} />);

    await waitFor(() => expect(screen.getByText('LATO2026')).toBeInTheDocument());
    expect(screen.getByText('-100.00 zł')).toBeInTheDocument();
    expect(screen.queryByText('świadczenie niecenowe')).not.toBeInTheDocument();
  });
});
