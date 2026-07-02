import { ReactNode } from 'react';

/**
 * AdminPageHeader — wspólna GRANATOWA górna belka panelu admina (rozkaz Pana 2026-06-30:
 * wszystkie widoki admina mają mieć belkę w stylu Rezerwacji / Szczegółów rezerwacji).
 *
 * Wzorzec 1:1 z belką w `ReservationsTableNew` (bg-slate-800, sticky top-0, h1 text-white):
 * tytuł po lewej, opcjonalne akcje (children) po prawej. `sticky top-0 z-20` — przykleja się
 * do góry obszaru treści (pod globalnym paskiem środowiska). `flex-shrink-0` — nie kurczy się.
 *
 * Użycie: <AdminPageHeader title="Obozy"><button>Dodaj obóz</button></AdminPageHeader>
 */
interface AdminPageHeaderProps {
  /** Tytuł sekcji (po polsku) — np. „Obozy", „Dokumenty". */
  title: string;
  /** Opcjonalne akcje po prawej (przyciski, filtry) — zachowują dotychczasową funkcjonalność. */
  children?: ReactNode;
}

export default function AdminPageHeader({ title, children }: AdminPageHeaderProps) {
  return (
    <div className="flex-shrink-0 bg-slate-800 shadow-md p-3 pr-16 sticky top-0 z-20">
      {/* pr-16: miejsce na pływający dzwonek powiadomień (AdminLayout, fixed top-11 right-3 z-50),
          żeby akcje po prawej (np. „Dodaj obóz") nie wchodziły pod dzwonek. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-white whitespace-nowrap">{title}</h1>
        {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
      </div>
    </div>
  );
}
