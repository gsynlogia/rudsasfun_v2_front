/// <reference types="@testing-library/jest-dom" />
/**
 * TDD test for AdminPromotionV2EditPanel — panel admina do zmiany promocji/kodu rabatowego
 * w konkretnej rezerwacji (karta Trello 001).
 *
 * Panel po zapisie woła PATCH /api/v2/reservations/{id}/promotion-v2 z nowymi wartościami.
 * Backend (już gotowy) automatycznie wystawia aneks dla rezerwacji z umową 'accepted'.
 *
 * Bug #266 (Trello YCJXoLXt): panel używał surowego `fetch` z ręcznym nagłówkiem
 * Authorization z propa `authToken`. Gdy token admina wygasł — dropdown był pusty i
 * pokazywał się surowy komunikat "Promocje: 401". Naprawa: wszystkie wywołania HTTP
 * przeniesione na `authenticatedFetch` z `@/lib/utils/api`, który bierze świeży token z
 * AuthService i przy 401 robi logout + redirect na /admin-panel/login.
 * Dlatego testy mockują `@/lib/utils/api`, NIE globalny `fetch`.
 *
 * ZAKAZ w testach: wysyłka SMS i email. Wszystko mockowane (authenticatedFetch zwraca stuby).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import AdminPromotionV2EditPanel from '@/components/admin/AdminPromotionV2EditPanel';

// Mock warstwy auth/HTTP — komponent woła `authenticatedFetch` z @/lib/utils/api.
// Mockujemy tę funkcję bezpośrednio, żeby testować logikę panelu w izolacji od
// AuthService / window.location / globalnego fetch.
const mockAuthenticatedFetch = jest.fn();
jest.mock('@/lib/utils/api', () => ({
  authenticatedFetch: (...args: unknown[]) => mockAuthenticatedFetch(...args),
}));

// Mock toast context — rejestruje wywołania, żebyśmy mogli asertować że toast
// jest wywoływany przy sukcesie/błędzie zapisu.
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
jest.mock('@/components/ToastContainer', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showToast: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn(),
  }),
}));

const PROMOTIONS_FIXTURE = [
  { id: 1, nazwa: 'Rodzeństwo razem', kwota7: 50, kwota10: 70, wymaga_uzasadnienia: false, custom_fields: [] },
  { id: 2, nazwa: 'Duża rodzina', kwota7: 100, kwota10: 150, wymaga_uzasadnienia: false, custom_fields: [] },
];

const CODES_FIXTURE = [
  { id: 10, kod: 'LATO2026', kategoria: 'obniza_cene', kwota7: 10, kwota10: 20, promocja_mode: 'obniza_promocje_50', status: 'aktywny' },
  { id: 11, kod: '2KOTY', kategoria: 'gadzet', kwota7: 0, kwota10: 0, promocja_mode: 'laczy', status: 'aktywny' },
];

const SNAPSHOT_EMPTY = {
  promotion_system_version: 'legacy',
  promotion_v2_id: null,
  promotion_v2_snapshot: null,
  promo_code_id: null,
  promo_code_snapshot: null,
  applied_promotion_discount: 0,
  applied_promo_code_discount: 0,
  total_price: 3000,
  admin_promo_code_override: null,
  admin_code_discount_override: null,
};

// Buduje stub Response (ok=true, status=200) z zadanym JSON-em.
function okResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload),
  } as Response;
}

// Domyślny router odpowiedzi: dopasowuje po metodzie + fragmencie URL.
// `authenticatedFetch` wywoływane jest z RELATYWNYM endpointem (bez prefiksu API).
function routeDefault(
  endpoint: string,
  init?: RequestInit,
  overrides?: { snapshot?: unknown },
): Promise<Response> {
  const method = init?.method ?? 'GET';
  if (method === 'GET' && endpoint === '/api/v2/promotions/') return Promise.resolve(okResponse(PROMOTIONS_FIXTURE));
  if (method === 'GET' && endpoint === '/api/v2/promo-codes/') return Promise.resolve(okResponse(CODES_FIXTURE));
  if (method === 'GET' && endpoint.includes('/api/v2/reservations/1234/promotion-v2')) {
    return Promise.resolve(okResponse(overrides?.snapshot ?? SNAPSHOT_EMPTY));
  }
  return Promise.reject(new Error(`No mock for ${method} ${endpoint}`));
}

describe('AdminPromotionV2EditPanel', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockShowSuccess.mockClear();
    mockShowError.mockClear();
    mockAuthenticatedFetch.mockReset();
  });

  it('renders promotion select and code select after loading lists', async () => {
    mockAuthenticatedFetch.mockImplementation((endpoint: string, init?: RequestInit) => routeDefault(endpoint, init));

    render(<AdminPromotionV2EditPanel reservationId={1234} />);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /promocja/i })).toBeInTheDocument();
    });
    expect(screen.getByText('Rodzeństwo razem')).toBeInTheDocument();
    expect(screen.getByText(/LATO2026/)).toBeInTheDocument();
  });

  it('calls authenticatedFetch with RELATIVE endpoints (no API prefix, no manual auth header)', async () => {
    mockAuthenticatedFetch.mockImplementation((endpoint: string, init?: RequestInit) => routeDefault(endpoint, init));

    render(<AdminPromotionV2EditPanel reservationId={1234} />);
    await waitFor(() => expect(screen.getByRole('combobox', { name: /promocja/i })).toBeInTheDocument());

    const calledEndpoints = mockAuthenticatedFetch.mock.calls.map((c) => c[0] as string);
    expect(calledEndpoints).toContain('/api/v2/promotions/');
    expect(calledEndpoints).toContain('/api/v2/promo-codes/');
    expect(calledEndpoints).toContain('/api/v2/reservations/1234/promotion-v2');
    // Żaden endpoint nie zawiera ręcznego prefiksu http (authenticatedFetch dodaje API_BASE_URL sam).
    calledEndpoints.forEach((ep) => expect(ep.startsWith('http')).toBe(false));
    // Żadne wywołanie GET nie przekazuje ręcznego nagłówka Authorization.
    mockAuthenticatedFetch.mock.calls.forEach((c) => {
      const init = c[1] as RequestInit | undefined;
      const headers = (init?.headers ?? {}) as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });
  });

  it('does NOT show raw "Promocje: 401" — 401 handled by authenticatedFetch (logout+redirect)', async () => {
    // Symulacja: token wygasł. authenticatedFetch z @/lib/utils/api przy 401 sam robi
    // authService.logout() + redirect; tu mock zwraca odrzucenie (jak po przekierowaniu),
    // a kluczowe: panel NIE renderuje surowego "Promocje: 401".
    mockAuthenticatedFetch.mockImplementation((endpoint: string) => {
      // authenticatedFetch po 401 przekierowuje — w teście symulujemy że promise
      // nigdy nie rozwiązuje się normalnym Response z body (redirect przerywa flow).
      // Zwracamy odrzucenie "redirect", żeby catch ustawił generyczny błąd, NIE "Promocje: 401".
      return Promise.reject(new Error('redirecting to login'));
    });

    render(<AdminPromotionV2EditPanel reservationId={1234} />);

    await waitFor(() => {
      // Loader znika (finally), panel nie wisi w "Ładowanie…".
      expect(screen.queryByText(/Ładowanie listy promocji/i)).not.toBeInTheDocument();
    });
    // Najważniejsze: NIE ma surowego komunikatu "Promocje: 401".
    expect(screen.queryByText(/Promocje:\s*401/i)).not.toBeInTheDocument();
  });

  it('calls PATCH /api/v2/reservations/{id}/promotion-v2 with selected ids on save', async () => {
    const patchMock = jest.fn(() => Promise.resolve(okResponse({})));
    mockAuthenticatedFetch.mockImplementation((endpoint: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'PATCH' && endpoint.includes('/api/v2/reservations/1234/promotion-v2')) {
        return patchMock(endpoint, init);
      }
      return routeDefault(endpoint, init);
    });

    const onSaved = jest.fn();
    render(<AdminPromotionV2EditPanel reservationId={1234} onSaved={onSaved} />);
    await waitFor(() => expect(screen.getByRole('combobox', { name: /promocja/i })).toBeInTheDocument());

    const promoSelect = screen.getByRole('combobox', { name: /promocja/i }) as HTMLSelectElement;
    fireEvent.change(promoSelect, { target: { value: '1' } });

    const codeInput = screen.getByLabelText(/kod rabatowy/i) as HTMLInputElement;
    fireEvent.change(codeInput, { target: { value: '2KOTY' } }); // kategoria=gadzet (laczy) → brak konfliktu

    fireEvent.click(screen.getByRole('button', { name: /zapisz zmianę/i }));

    await waitFor(() => expect(patchMock).toHaveBeenCalledTimes(1));
    const [, init] = patchMock.mock.calls[0];
    expect(init.method).toBe('PATCH');
    const body = JSON.parse(init.body as string);
    expect(body.promotion_v2_id).toBe(1);
    expect(body.promo_code_id).toBe(11);
    expect(onSaved).toHaveBeenCalled();
    await waitFor(() => expect(mockShowSuccess).toHaveBeenCalled());
  });

  it('pre-fills form with current promotion and code from snapshot', async () => {
    const SNAPSHOT_WITH_DATA = {
      ...SNAPSHOT_EMPTY,
      promotion_v2_id: 2,
      promo_code_id: 10,
      applied_promotion_discount: 100,
      applied_promo_code_discount: 20,
      total_price: 2880,
    };
    mockAuthenticatedFetch.mockImplementation((endpoint: string, init?: RequestInit) =>
      routeDefault(endpoint, init, { snapshot: SNAPSHOT_WITH_DATA }));

    render(<AdminPromotionV2EditPanel reservationId={1234} />);

    await waitFor(() => {
      const promoSelect = screen.getByRole('combobox', { name: /promocja/i }) as HTMLSelectElement;
      expect(promoSelect.value).toBe('2'); // Duża rodzina (id=2 z fixture)
    });
    const codeInput = screen.getByLabelText(/kod rabatowy/i) as HTMLInputElement;
    expect(codeInput.value).toBe('LATO2026');
  });

  it('pre-fills customValues from snapshot (promotion_v2_custom_values)', async () => {
    const PROMOTION_WITH_CHECKBOX = [
      {
        id: 3,
        nazwa: 'Obozy na maxa',
        kwota7: 50,
        kwota10: 100,
        wymaga_uzasadnienia: true,
        custom_fields: [
          { id: 10, label: 'Deklaracja dwóch obozów', field_type: 'checkbox', required: true },
        ],
      },
    ];
    const SNAPSHOT_WITH_CUSTOM = {
      ...SNAPSHOT_EMPTY,
      promotion_v2_id: 3,
      promotion_v2_custom_values: { 'Deklaracja dwóch obozów': true },
      applied_promotion_discount: 50,
      total_price: 2950,
    };
    mockAuthenticatedFetch.mockImplementation((endpoint: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'GET' && endpoint === '/api/v2/promotions/') return Promise.resolve(okResponse(PROMOTION_WITH_CHECKBOX));
      if (method === 'GET' && endpoint === '/api/v2/promo-codes/') return Promise.resolve(okResponse(CODES_FIXTURE));
      if (method === 'GET' && endpoint.includes('/api/v2/reservations/1234/promotion-v2')) {
        return Promise.resolve(okResponse(SNAPSHOT_WITH_CUSTOM));
      }
      return Promise.reject(new Error(`No mock for ${method} ${endpoint}`));
    });

    render(<AdminPromotionV2EditPanel reservationId={1234} />);

    await waitFor(() => {
      expect(screen.getByText(/Deklaracja dwóch obozów/)).toBeInTheDocument();
    });
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('rejects save when typed code does not match any known code', async () => {
    const patchMock = jest.fn();
    mockAuthenticatedFetch.mockImplementation((endpoint: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'PATCH') return patchMock(endpoint, init);
      return routeDefault(endpoint, init);
    });

    render(<AdminPromotionV2EditPanel reservationId={1234} />);
    await waitFor(() => expect(screen.getByLabelText(/kod rabatowy/i)).toBeInTheDocument());

    const codeInput = screen.getByLabelText(/kod rabatowy/i) as HTMLInputElement;
    fireEvent.change(codeInput, { target: { value: 'FAKE_CODE_XYZ' } });
    fireEvent.click(screen.getByRole('button', { name: /zapisz zmianę/i }));

    await waitFor(() => {
      expect(screen.getByText(/Nieznany kod rabatowy/i)).toBeInTheDocument();
    });
    expect(patchMock).not.toHaveBeenCalled();
  });

  it('shows error message when save fails', async () => {
    mockAuthenticatedFetch.mockImplementation((endpoint: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'PATCH') {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ detail: 'Konflikt promocji i kodu' }),
        } as Response);
      }
      return routeDefault(endpoint, init);
    });

    render(<AdminPromotionV2EditPanel reservationId={1234} />);
    await waitFor(() => expect(screen.getByRole('combobox', { name: /promocja/i })).toBeInTheDocument());

    const promoSelect = screen.getByRole('combobox', { name: /promocja/i }) as HTMLSelectElement;
    fireEvent.change(promoSelect, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /zapisz zmianę/i }));

    await waitFor(() => {
      expect(screen.getByText(/Konflikt promocji i kodu/)).toBeInTheDocument();
    });
    expect(mockShowError).toHaveBeenCalled();
  });
});
