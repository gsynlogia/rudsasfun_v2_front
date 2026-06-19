'use client';

/**
 * Modal „Dodaj połączenie tagów" (P1) — 1:1 z makietą Figma.
 * Dwie kolumny: 🚌 Przyjazd do ośrodka (data = start turnusu) / 🏠 Powrót z ośrodka (data = koniec turnusu).
 * Każdy tag z DATĄ. Tag już użyty w połączeniu danego kierunku → wyszarzony „(W użyciu)". Zaznaczenie
 * w jednym kierunku BLOKUJE drugą kolumnę (U7: nie mieszamy przyjazdu z powrotem). Nazwa = tagi złączone „+".
 * Dane realne z bazy (camp_properties); mock makiety ignorowany.
 */
import { X, MapPin, Home } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { Connection, Direction, TagDetail } from '@/lib/types/transportLists';
import { getTagsDetailed, createConnection } from '@/lib/services/transportListsApi';

interface Props {
  defaultDirection: Direction;
  onClose: () => void;
  onCreated: (conn: Connection) => void;
}

/** ISO „2026-06-28" → „28.06.2026" (pl). Pusta gdy brak. */
function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}.${m}.${y}` : iso;
}

export default function AddConnectionModal({ defaultDirection, onClose, onCreated }: Props) {
  const [tagsDetail, setTagsDetail] = useState<TagDetail[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [direction, setDirection] = useState<Direction | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getTagsDetailed().then(setTagsDetail).catch(() => setTagsDetail([])); }, []);

  const name = useMemo(() => [...selected].join('+'), [selected]);

  const toggle = (tag: string, dir: Direction, used: boolean) => {
    if (used) return;
    if (direction && direction !== dir) return; // blokada mieszania kierunku
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      if (next.size === 0) setDirection(null); else setDirection(dir);
      return next;
    });
  };

  async function handleSave() {
    setError(null);
    if (selected.size === 0 || direction == null) { setError('Wybierz co najmniej jeden turnus.'); return; }
    // data połączenia = najwcześniejsza data wybranych tagów (start dla przyjazdu, koniec dla powrotu)
    const dates = tagsDetail
      .filter((t) => selected.has(t.tag))
      .map((t) => (direction === 'arrival' ? t.start_date : t.end_date))
      .filter(Boolean)
      .sort();
    setSaving(true);
    try {
      const conn = await createConnection({
        name, tags: [...selected].join(','), direction, date: dates[0] ?? null,
      });
      onCreated(conn);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd tworzenia połączenia');
      setSaving(false);
    }
  }

  const column = (dir: Direction) => {
    const isArrival = dir === 'arrival';
    const blocked = direction != null && direction !== dir;
    return (
      <div className={`flex-1 rounded-lg border p-3 ${blocked ? 'opacity-50' : 'border-gray-200'}`}
        data-testid={`column-${dir}`}>
        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
          {isArrival ? <MapPin className="h-4 w-4 text-sky-600" /> : <Home className="h-4 w-4 text-sky-600" />}
          {isArrival ? 'Przyjazd do ośrodka' : 'Powrót z ośrodka'}
        </div>
        <div className="flex flex-col gap-1.5">
          {tagsDetail.map((t) => {
            const used = isArrival ? t.used_arrival : t.used_return;
            const dateIso = isArrival ? t.start_date : t.end_date;
            const isSel = selected.has(t.tag) && direction === dir;
            return (
              <button key={t.tag} type="button" disabled={used || blocked}
                onClick={() => toggle(t.tag, dir, used)}
                data-testid={`tag-${dir}-${t.tag}`}
                className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm transition-colors ${
                  used
                    ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                    : isSel
                      ? 'border-sky-600 bg-sky-600 text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                <span className="font-medium">{t.tag}{used ? ' (W użyciu)' : ''}</span>
                <span className={`text-xs ${isSel ? 'text-white/90' : 'text-gray-500'}`}>{fmtDate(dateIso)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="connection-modal">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Dodaj połączenie tagów</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex gap-3 overflow-y-auto">
          {column('arrival')}
          {column('return')}
        </div>

        <p className="mt-3 text-sm text-gray-500">
          {name
            ? <>Nazwa połączenia: <span className="font-semibold">{name}</span> · kierunek: {direction === 'arrival' ? 'Przyjazd' : 'Powrót'}</>
            : 'Wybierz turnusy z jednej kolumny (kierunku).'}
        </p>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Anuluj</button>
          <button type="button" onClick={handleSave} disabled={saving || selected.size === 0} data-testid="connection-save"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {saving ? 'Tworzenie…' : 'Dodaj połączenie'}
          </button>
        </div>
      </div>
    </div>
  );
}
