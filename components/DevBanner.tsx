/**
 * DevBanner — globalny pasek "Wersja developerska — dane testowe".
 * Renderowany raz w root layout, widoczny na KAŻDEJ stronie (rezerwacja, admin, profil, druk)
 * gdy hostname NIE jest produkcyjny.
 *
 * Dlaczego runtime hostname, nie env var:
 * Dell (dev synlogia.dev) robi `npm run build` → Next.js zapieka wartości `NEXT_PUBLIC_*`
 * z `.env.production` do JS bundla (build-time). Zmienna `NEXT_PUBLIC_APP_ENV=production`
 * trafiałaby do bundla także na Dellu, ukrywając banner. Hostname przychodzi z request
 * headers w SSR — runtime → działa niezależnie od buildu.
 *
 * Lista prod hostów jest w app/layout.tsx (isProdHost) i wspólna dla GTM+DevBanner.
 */
export default function DevBanner({ isDev }: { isDev: boolean }) {
  if (!isDev) return null;
  return (
    <div className="bg-red-600 text-white text-center text-xs font-medium py-1">
      Wersja developerska — dane testowe
    </div>
  );
}
