/// <reference types="@testing-library/jest-dom" />
/**
 * TDD test for AdminPromotionV2EditPanel — panel admina do zmiany promocji/kodu rabatowego
 * w konkretnej rezerwacji (karta Trello 001).
 *
 * Panel po zapisie woła PATCH /api/v2/reservations/{id}/promotion-v2 z nowymi wartościami.
 * Backend (już gotowy) automatycznie wystawia aneks dla rezerwacji z umową 'accepted'.
 *
 * ZAKAZ w testach: wysyłka SMS i email. Wszystko mockowane (fetch zwraca stuby).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import AdminPromotionV2EditPanel from '@/components/admin/AdminPromotionV2EditPanel';

const PROMOTIONS_FIXTURE = [
  { id: 1, nazwa: 'Rodzeństwo razem', kwota7: 50, kwota10: 70, wymaga_uzasadnienia: false, custom_fields: [] },
  { id: 2, nazwa: 'Duża rodzina', kwota7: 100, kwota10: 150, wymaga_uzasadnienia: false, custom_fields: [] },
];

const CODES_FIXTURE = [
  { id: 10, kod: 'LATO2026', kategoria: 'obniza_cene', kwota7: 10, kwota10: 20, promocja_mode: 'obniza_promocje_50', status: 'aktywny' },
  { id: 11, kod: '2KOTY', kategoria: 'gadzet', kwota7: 0, kwota10: 0, promocja_mode: 'laczy', status: 'aktywny' },
];

function mockFetch(responses: Record<string, any>) {
  return jest.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const key = `${method} ${url}`;
    const stub = responses[key] ?? responses[url];
    if (!stub) return Promise.reject(new Error(`No mock for ${key}`));
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(stub),
    } as Response);
  });
}

describe('AdminPromotionV2EditPanel', () => {
  beforeEach(() => {
    (global as any).fetch = mockFetch({
      'GET /api/v2/promotions/': PROMOTIONS_FIXTURE,
      'GET /api/v2/promo-codes/': CODES_FIXTURE,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders promotion select and code select after loading lists', async () => {
    render(
      <AdminPromotionV2EditPanel
        reservationId={1234}
        authToken="fake-token"
        currentPromotionId={null}
        currentPromoCodeId={null}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /promocja/i })).toBeInTheDocument();
    });
    expect(screen.getByText('Rodzeństwo razem')).toBeInTheDocument();
    expect(screen.getByText(/LATO2026/)).toBeInTheDocument();
  });

  it('calls PATCH /api/v2/reservations/{id}/promotion-v2 with selected ids on save', async () => {
    const patchMock = jest.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) } as Response),
    );
    (global as any).fetch = jest.fn((url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'PATCH' && url.includes('/api/v2/reservations/1234/promotion-v2')) {
        return patchMock(url, init);
      }
      if (url === '/api/v2/promotions/') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PROMOTIONS_FIXTURE) } as Response);
      }
      if (url === '/api/v2/promo-codes/') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(CODES_FIXTURE) } as Response);
      }
      return Promise.reject(new Error(`Unexpected ${method} ${url}`));
    });

    const onSaved = jest.fn();
    render(
      <AdminPromotionV2EditPanel
        reservationId={1234}
        authToken="fake-token"
        currentPromotionId={null}
        currentPromoCodeId={null}
        onSaved={onSaved}
      />,
    );
    await waitFor(() => expect(screen.getByRole('combobox', { name: /promocja/i })).toBeInTheDocument());

    const promoSelect = screen.getByRole('combobox', { name: /promocja/i }) as HTMLSelectElement;
    fireEvent.change(promoSelect, { target: { value: '1' } });

    const codeSelect = screen.getByRole('combobox', { name: /kod rabatowy/i }) as HTMLSelectElement;
    fireEvent.change(codeSelect, { target: { value: '11' } }); // kategoria=gadzet (laczy) → brak konfliktu

    fireEvent.click(screen.getByRole('button', { name: /zapisz zmianę/i }));

    await waitFor(() => expect(patchMock).toHaveBeenCalledTimes(1));
    const [, init] = patchMock.mock.calls[0];
    expect(init.method).toBe('PATCH');
    const body = JSON.parse(init.body as string);
    expect(body.promotion_v2_id).toBe(1);
    expect(body.promo_code_id).toBe(11);
    expect(onSaved).toHaveBeenCalled();
  });

  it('shows error message when save fails', async () => {
    (global as any).fetch = jest.fn((url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'PATCH') {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ detail: 'Konflikt promocji i kodu' }),
        } as Response);
      }
      if (url === '/api/v2/promotions/') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PROMOTIONS_FIXTURE) } as Response);
      }
      if (url === '/api/v2/promo-codes/') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(CODES_FIXTURE) } as Response);
      }
      return Promise.reject(new Error(`Unexpected ${method} ${url}`));
    });

    render(
      <AdminPromotionV2EditPanel
        reservationId={1234}
        authToken="fake-token"
        currentPromotionId={null}
        currentPromoCodeId={null}
      />,
    );
    await waitFor(() => expect(screen.getByRole('combobox', { name: /promocja/i })).toBeInTheDocument());

    const promoSelect = screen.getByRole('combobox', { name: /promocja/i }) as HTMLSelectElement;
    fireEvent.change(promoSelect, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /zapisz zmianę/i }));

    await waitFor(() => {
      expect(screen.getByText(/Konflikt promocji i kodu/)).toBeInTheDocument();
    });
  });
});
