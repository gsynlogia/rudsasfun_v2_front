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
});
