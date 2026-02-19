'use client';

import { ReactNode, useEffect, useState } from 'react';
import { MessageSquare, Activity, Archive } from 'lucide-react';

const STORAGE_KEY = 'admin_reservation_right_tab';
export type ReservationRightTabId = 'notes' | 'events' | 'documents';

const TABS: { id: ReservationRightTabId; icon: typeof MessageSquare; label: string }[] = [
  { id: 'notes', icon: MessageSquare, label: 'Notatki wewnętrzne' },
  { id: 'events', icon: Activity, label: 'Zdarzenia klienta' },
  { id: 'documents', icon: Archive, label: 'Wersje dokumentów z bazy' },
];

export const RIGHT_SIDEBAR_WIDTH = 320;

interface ReservationDetailRightSidebarProps {
  /** Renderuje treść dla aktywnej zakładki (notes | events | documents). */
  getContent: (tab: ReservationRightTabId) => ReactNode;
}

function getStoredTab(): ReservationRightTabId {
  if (typeof window === 'undefined') return 'notes';
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'notes' || v === 'events' || v === 'documents') return v;
  } catch {
    /* ignore */
  }
  return 'notes';
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
}: ReservationDetailRightSidebarProps) {
  const [activeTab, setActiveTab] = useState<ReservationRightTabId>(getStoredTab);

  useEffect(() => {
    setActiveTab(getStoredTab());
  }, []);

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
