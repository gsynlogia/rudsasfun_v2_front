'use client';

// DEPRECATED 2026-05-24 REZ-1828: Archive ikona była używana TYLKO dla tab 'documents' (ukryty w UI, patrz nizej).
// TODO TD-011: usunąć import gdy fizycznie skasujemy obsługę tab 'documents'.
import { MessageSquare, Activity, Archive } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';

const STORAGE_KEY = 'admin_reservation_right_tab';
// 2026-05-24 REZ-1828: 'documents' DEPRECATED — zastąpiony przez DocumentVersionsList
// w panelu Dokumenty (page.tsx). Tab ukryty z UI ale typ + obsługa zostają (per TD-011)
// do czasu fizycznego usunięcia po sprawdzeniu czy nieużywany.
export type ReservationRightTabId = 'notes' | 'events' | 'documents';

const TABS: { id: ReservationRightTabId; icon: typeof MessageSquare; label: string }[] = [
  { id: 'notes', icon: MessageSquare, label: 'Notatki wewnętrzne' },
  { id: 'events', icon: Activity, label: 'Zdarzenia klienta' },
  // DEPRECATED 2026-05-24 REZ-1828: tab "Wersje dokumentów z bazy" zastąpiony przez DocumentVersionsList.
  // TODO TD-011: sprawdzić czy faktycznie nieużywany (suggestedTab, deep linki #dokumenty) i usunąć w osobnej sesji.
  // { id: 'documents', icon: Archive, label: 'Wersje dokumentów z bazy' },
];

export const RIGHT_SIDEBAR_WIDTH = 320;

interface ReservationDetailRightSidebarProps {
  /** Renderuje treść dla aktywnej zakładki (notes | events | documents). */
  getContent: (tab: ReservationRightTabId) => ReactNode;
  /** Gdy ustawione (np. przy #dokumenty), prawy panel przełącza się na tę zakładkę, żeby historia wersji była od razu widoczna. */
  suggestedTab?: ReservationRightTabId | null;
}

function getStoredTab(): ReservationRightTabId {
  // 2026-05-24 REZ-1828: domyślnie 'events' (były wcześniej 'notes'). User explicit:
  // Zdarzenia mają być domyślnie zaznaczone gdy localStorage pusty. Tab 'documents'
  // ukryty z UI (DEPRECATED, patrz wyżej TABS) ale dalej akceptowany z localStorage
  // do czasu pełnego usunięcia per TD-011 — uzytkownicy z wcześniejszą sesją wracają na notes/events.
  if (typeof window === 'undefined') return 'events';
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'notes' || v === 'events') return v;
    // Migracja: jeśli ktoś miał zapisane 'documents' w localStorage — przełącz na 'events'
    if (v === 'documents') {
      try { localStorage.setItem(STORAGE_KEY, 'events'); } catch { /* ignore */ }
      return 'events';
    }
  } catch {
    /* ignore */
  }
  return 'events';
}

function setStoredTab(tab: ReservationRightTabId) {
  try {
    localStorage.setItem(STORAGE_KEY, tab);
  } catch {
    /* ignore */
  }
}

/**
 * Prawy pasek na stronie szczegółów rezerwacji – przyklejony na stałe (jak lewy sidebar),
 * pełna wysokość okna. Zakładki: Notatki wewnętrzne | Zdarzenia klienta | Wersje dokumentów z bazy.
 * Aktywna zakładka zapisywana w localStorage (admin_reservation_right_tab).
 */
export function ReservationDetailRightSidebar({
  getContent,
  suggestedTab,
}: ReservationDetailRightSidebarProps) {
  const [activeTab, setActiveTab] = useState<ReservationRightTabId>(getStoredTab);

  useEffect(() => {
    setActiveTab(getStoredTab());
  }, []);

  useEffect(() => {
    if (suggestedTab && suggestedTab !== activeTab) {
      setActiveTab(suggestedTab);
      setStoredTab(suggestedTab);
    }
  }, [suggestedTab]);

  const handleTab = (id: ReservationRightTabId) => {
    setActiveTab(id);
    setStoredTab(id);
  };

  const content = getContent(activeTab);

  return (
    <aside
      role="complementary"
      aria-label="Notatki, zdarzenia i wersje dokumentów rezerwacji"
      className="fixed top-0 right-0 z-40 flex flex-col h-screen bg-[#1d283d] border-l border-white/10 shadow-xl"
      style={{ width: RIGHT_SIDEBAR_WIDTH }}
    >
      {/* Pasek zakładek – ikony Lucide */}
      <div className="flex items-stretch border-b border-white/20 flex-shrink-0">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleTab(id)}
            title={label}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 transition-colors ${
              activeTab === id
                ? 'bg-white/15 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" aria-hidden />
            <span className="text-[10px] leading-tight hidden sm:inline truncate max-w-full">
              {id === 'notes' ? 'Notatki' : id === 'events' ? 'Zdarzenia' : 'Wersje'}
            </span>
          </button>
        ))}
      </div>
      {/* Treść aktywnej zakładki */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {content}
      </div>
    </aside>
  );
}