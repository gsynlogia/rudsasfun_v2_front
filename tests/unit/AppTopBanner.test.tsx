/// <reference types="@testing-library/jest-dom" />
/**
 * AppTopBanner — globalny pasek środowiska (najwyższy poziom, sticky top, pełna szerokość).
 *
 * Widoczność (dev vs prod) jest decyzją root layoutu (app/layout.tsx: `{isDev && <AppTopBanner/>}`,
 * logika hostname-based isProdHost — runtime SSR, odporna na zapiekane NEXT_PUBLIC_* z buildu Della).
 * Ten komponent jest „głupi": dostaje treść + wariant i renderuje pasek. Testujemy rendering+wariant.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import AppTopBanner from '@/components/AppTopBanner';

describe('AppTopBanner — pasek środowiska', () => {
  it('renderuje przekazany komunikat', () => {
    render(<AppTopBanner message="Wersja developerska — dane testowe" />);
    expect(screen.getByText(/Wersja developerska — dane testowe/i)).toBeInTheDocument();
  });

  it('domyślny wariant = dev (czerwony) + sticky top + pełna szerokość', () => {
    render(<AppTopBanner message="X" />);
    const el = screen.getByRole('status');
    expect(el).toHaveClass('bg-red-600');
    expect(el).toHaveClass('sticky');
    expect(el).toHaveClass('top-0');
    expect(el).toHaveClass('w-full');
  });

  it('wariant prod = inny kolor (skalowalność pod produkcję)', () => {
    render(<AppTopBanner message="Komunikat serwisowy" variant="prod" />);
    const el = screen.getByRole('status');
    expect(el).toHaveClass('bg-slate-800');
    expect(el).not.toHaveClass('bg-red-600');
  });

  describe('linki do testowych skrzynek (SMS + e-mail)', () => {
    const links = {
      smsUrl: 'https://phone.radsas.syn.test',
      emailUrl: 'https://email.radsas.syn.test',
    };

    it('renderuje SMS i e-mail w nawiasie, każdy do NOWEJ karty', () => {
      render(<AppTopBanner message="Wersja developerska — dane testowe" sandboxLinks={links} />);

      const sms = screen.getByRole('link', { name: 'SMS' });
      expect(sms).toHaveAttribute('href', links.smsUrl);
      expect(sms).toHaveAttribute('target', '_blank');
      expect(sms).toHaveAttribute('rel', expect.stringContaining('noopener'));

      const email = screen.getByRole('link', { name: 'e-mail' });
      expect(email).toHaveAttribute('href', links.emailUrl);
      expect(email).toHaveAttribute('target', '_blank');
      expect(email).toHaveAttribute('rel', expect.stringContaining('noopener'));

      // nawias wokół linków
      expect(screen.getByRole('status')).toHaveTextContent(/\(\s*SMS\s*,\s*e-mail\s*\)/);
    });

    it('bez sandboxLinks → pasek nadal ostrzega, ale BEZ linków (prod/nieznany host)', () => {
      render(<AppTopBanner message="Wersja developerska — dane testowe" />);
      expect(screen.getByText(/Wersja developerska/i)).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });
});
