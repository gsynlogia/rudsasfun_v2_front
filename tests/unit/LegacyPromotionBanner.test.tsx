/**
 * Trello yO9Eygcf — klient (readOnly) NIE widzi komentarza "starsza wersja promocji...
 * skontaktuj się z biurem", tylko samą nazwę promocji. Admin (edycja) komentarz widzi.
 */
import { render, screen } from '@testing-library/react';
import LegacyPromotionBanner from '@/components/promotion/LegacyPromotionBanner';

const KLIENT_KOMENTARZ = /skontaktuj się z biurem/i;

describe('LegacyPromotionBanner — komentarz tylko dla admina (Trello yO9Eygcf)', () => {
  it('panel klienta (readOnly): pokazuje TYLKO nazwę promocji, BEZ komentarza', () => {
    render(<LegacyPromotionBanner kind="promotion" name="Promo Lato 2026" amount={-200} readOnly />);
    // nazwa promocji widoczna
    expect(screen.getByText('Promo Lato 2026')).toBeInTheDocument();
    // komentarz "skontaktuj się z biurem" NIE może się pojawić u klienta
    expect(screen.queryByText(KLIENT_KOMENTARZ)).toBeNull();
  });

  it('panel admina (edycja, readOnly=false): komentarz/instrukcja JEST widoczny', () => {
    render(
      <LegacyPromotionBanner kind="promotion" name="Promo Lato 2026" amount={-200} onDeleteClick={() => {}} />,
    );
    expect(screen.getByText('Promo Lato 2026')).toBeInTheDocument();
    // admin widzi instrukcję "możesz ją tylko skasować lub nadpisać..."
    expect(screen.getByText(/skasować lub nadpisać/i)).toBeInTheDocument();
  });
});
