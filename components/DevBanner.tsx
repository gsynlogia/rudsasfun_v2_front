'use client';

/**
 * DevBanner — globalny pasek "Wersja developerska — dane testowe".
 * Renderowany raz w root layout, widoczny na KAŻDEJ stronie (rezerwacja, admin, profil, druk)
 * gdy `NEXT_PUBLIC_APP_ENV !== 'production'`.
 *
 * Nie używa `fixed` — pozostaje w normalnym flow, nie zasłania żadnych elementów `fixed`
 * z wewnętrznych layoutów (AdminLayout notification icon, slide-out panel itd.).
 */
export default function DevBanner() {
  if (process.env.NEXT_PUBLIC_APP_ENV === 'production') return null;
  return (
    <div className="bg-red-600 text-white text-center text-xs font-medium py-1">
      Wersja developerska — dane testowe
    </div>
  );
}
