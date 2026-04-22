/// <reference types="@testing-library/jest-dom" />
/**
 * TDD — karta Trello 003 (etap 3/3): ContractForm renderuje wiersz „Rabat:"
 * z `reservationData.rabat` gdy tryb preview (brak reservationId).
 *
 * Scenariusz:
 * - Step 4 Podgląd umowy wywołuje <ContractForm previewOnly reservationData={...}/>
 *   BEZ reservationId.
 * - `buildContractPreviewFromSteps` zwraca `rabat` zbudowany z sessionStorage.
 * - ContractForm musi ustawić rabatRow z reservationData.rabat, żeby warunkowy
 *   render `{rabatRow && ...}` pokazał wiersz.
 *
 * W profilu klienta (ma reservationId) fetch z API ma pierwszeństwo — reservationData.rabat
 * jest ignorowane żeby nie nadpisać aktualnych danych z backendu.
 */
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ContractForm } from '@/components/profile/ContractForm';

// Mock authService żeby uniknąć błędów auth
jest.mock('@/lib/services/AuthService', () => ({
  authService: { getToken: () => null },
}));

const BASE_RESERVATION_DATA = {
  reservationNumber: 'W trakcie nadawania',
  tournamentName: 'Test Camp',
  tournamentDates: '01.07.2026 - 08.07.2026',
  parentName: 'Jan Kowalski',
  childName: 'Marek Kowalski',
  totalCost: '2900,00',
  deposit: '500,00',
};

describe('ContractForm — rabat w trybie preview (karta 003)', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response),
    );
  });

  it('preview (brak reservationId) + reservationData.rabat → renderuje wiersz „Rabat:"', async () => {
    render(
      <ContractForm
        previewOnly
        reservationData={{
          ...BASE_RESERVATION_DATA,
          rabat: { label: 'Kod rabatowy LATO2026', amount: -100 },
        }}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/Kod rabatowy LATO2026/)).toBeInTheDocument();
    });
  });

  it('preview (brak reservationId) + reservationData bez pola rabat → brak wiersza Rabat', async () => {
    render(
      <ContractForm
        previewOnly
        reservationData={BASE_RESERVATION_DATA}
      />,
    );
    // Pozostałe elementy renderują się, ale wiersz „Rabat:" nie powinien
    await waitFor(() => {
      expect(screen.getByText(/Jan Kowalski/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Kod rabatowy/)).not.toBeInTheDocument();
  });

  it('preview + rabat kategoria non-monetary (amount=null) → renderuje tekst ale bez kwoty', async () => {
    render(
      <ContractForm
        previewOnly
        reservationData={{
          ...BASE_RESERVATION_DATA,
          rabat: { label: 'Kod rabatowy BON120: 120 zł w sklepiku', amount: null },
        }}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/BON120/)).toBeInTheDocument();
    });
    expect(screen.getByText(/nie obniża ceny/i)).toBeInTheDocument();
  });
});
