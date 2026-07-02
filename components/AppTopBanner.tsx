/**
 * AppTopBanner — globalny pasek informacyjny przyklejony do samej góry przeglądarki.
 *
 * Element NAJWYŻSZEGO poziomu (renderowany raz w root layout, zaraz pod <body>), NIE część
 * żadnego pojedynczego widoku: pełna szerokość, `sticky top-0` (zawsze widoczny, też po przewinięciu),
 * na KAŻDYM widoku (admin, kreator, profil, druk — w druku chowany przez @media print).
 *
 * Skalowalny: wariant + treść jako propsy. Dziś używany dla wersji deweloperskiej (czerwony),
 * gotowy do użycia na produkcji (np. komunikat serwisowy) bez zmiany struktury — wystarczy podać
 * inny `variant`/`message` i sterować widocznością w layout.
 *
 * Wysokość paska jest stała (h-6 = 24px) i wystawiona jako zmienna CSS `--app-banner-h`
 * (patrz globals.css + data-app-banner na <body>), żeby ŻADEN widok nie hardcodował 24px —
 * layouty pełnoekranowe liczą `calc(100dvh - var(--app-banner-h))`.
 */
export type AppTopBannerVariant = 'dev' | 'prod' | 'info' | 'warning';

const VARIANT_CLASSES: Record<AppTopBannerVariant, string> = {
  dev: 'bg-red-600 text-white',
  prod: 'bg-slate-800 text-white',
  info: 'bg-sky-600 text-white',
  warning: 'bg-amber-400 text-slate-900',
};

interface AppTopBannerProps {
  /** Treść komunikatu (po polsku). */
  message: string;
  /** Wariant kolorystyczny — domyślnie 'dev' (czerwony). */
  variant?: AppTopBannerVariant;
}

export default function AppTopBanner({ message, variant = 'dev' }: AppTopBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      // h-6 = 24px = wartość zmiennej --app-banner-h (globals.css). sticky top-0 → zawsze na górze.
      // z-[100] nad chrome widoków (sidebar z-50, modale z-50) — pasek środowiska zawsze na wierzchu.
      className={`sticky top-0 z-[100] w-full h-6 flex items-center justify-center text-center text-xs font-medium leading-none ${VARIANT_CLASSES[variant]}`}
    >
      {message}
    </div>
  );
}
