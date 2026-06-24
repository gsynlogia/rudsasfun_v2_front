/**
 * BUG 001/002 (Ania): returnTo MUSI zawierać aktualne filtry/wyszukiwarkę z adresu (window.location.search),
 * inaczej powrót ze szczegółów gubi filtr/wyszukiwarkę.
 */
import { buildListReturnUrl } from '@/lib/utils/listReturnUrl';

describe('buildListReturnUrl (BUG 001/002 — returnTo zachowuje filtry i wyszukiwarkę)', () => {
  it('zachowuje wyszukiwarkę ?search= ustawioną przez UI', () => {
    expect(buildListReturnUrl('?search=Kowalski', '/admin-panel/payments'))
      .toBe('/admin-panel/payments?search=Kowalski');
  });

  it('zachowuje filtry kolumn (status + tag) — bug 002', () => {
    const out = buildListReturnUrl('?status=czesciowo&filter_propertyTag=B2', '/admin-panel/payments');
    expect(out).toContain('status=czesciowo');
    expect(out).toContain('filter_propertyTag=B2');
  });

  it('dokleja sort_by/sort_dir', () => {
    const out = buildListReturnUrl('?search=X', '/admin-panel/payments', 'createdAt', 'desc');
    expect(out).toContain('search=X');
    expect(out).toContain('sort_by=createdAt');
    expect(out).toContain('sort_dir=desc');
  });

  it('pusty adres → sama ścieżka (bez ?)', () => {
    expect(buildListReturnUrl('', '/admin-panel/payments')).toBe('/admin-panel/payments');
  });

  it('działa z surowym search bez wiodącego ? (URLSearchParams toleruje)', () => {
    expect(buildListReturnUrl('search=Y', '/admin-panel/payments')).toBe('/admin-panel/payments?search=Y');
  });
});
