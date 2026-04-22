/// <reference types="@testing-library/jest-dom" />
/**
 * Regresja: pasek „Wersja developerska" zniknął z Dell (dev synlogia.dev)
 * bo logika używała `NEXT_PUBLIC_APP_ENV` (build-time env var) — Dell robi
 * `npm run build` → Next.js zapieka `.env.production:NEXT_PUBLIC_APP_ENV=production`
 * do bundla → banner nie renderuje.
 *
 * Fix: logika hostname-based (runtime). Lista PROD_HOSTS — ta sama co GTM
 * w app/layout.tsx. Na dev/local banner widoczny, na prod ukryty.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import DevBanner from '@/components/DevBanner';

describe('DevBanner — pasek wersja developerska', () => {
  it('isDev=true (synlogia.dev / localhost): banner widoczny', () => {
    render(<DevBanner isDev={true} />);
    expect(screen.getByText(/Wersja developerska/i)).toBeInTheDocument();
  });

  it('isDev=false (rezerwacja.radsas-fun.pl prod): banner ukryty', () => {
    const { container } = render(<DevBanner isDev={false} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(/Wersja developerska/i)).not.toBeInTheDocument();
  });
});
