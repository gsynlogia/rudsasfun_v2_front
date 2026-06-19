'use client';

/**
 * Panel PRAWY „Tabor" (Nr 27) — karty taborów aktywnego połączenia.
 * Karta: typ/nazwa/numer + zajęte/wolne (w tym N wychowawców) + przewoźnik/kierowca/kierownik + badge „lista kompletna".
 * Rozwinięcie: miejsca wychowawców W1..Wn (fioletowe, kierownik na W1) + miejsca uczestników 1..N + „Wolne miejsce".
 * Akcje Edytuj/Usuń/Dokument = Nr 28-31 (podpięcie później). Wsadzanie (drag&drop) = Nr 26.
 */
import { ChevronDown, ChevronRight, Pencil, Trash2, FileText, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { Tabor, TaborCapacity, TaborParticipant } from '@/lib/types/transportLists';
import { getTaborCapacity, listTaborParticipants } from '@/lib/services/transportListsApi';

const TYPE_LABEL: Record<string, string> = {
  autokar: 'Autokar', pociag: 'Pociąg', wlasny: 'Własny', prywatny: 'Prywatny',
};

interface TaborPanelProps {
  tabors: Tabor[];
  participantNames: Map<number, string>;
  onEdit: (tabor: Tabor) => void;
}

export default function TaborPanel({ tabors, participantNames, onEdit }: TaborPanelProps) {
  if (tabors.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400" data-testid="tabor-empty">
        Brak taborów. Dodaj tabor, aby układać listy.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3" data-testid="tabor-panel">
      {tabors.map((t) => (
        <TaborCard key={t.id} tabor={t} participantNames={participantNames} onEdit={onEdit} />
      ))}
    </div>
  );
}

function TaborCard(
  { tabor, participantNames, onEdit }:
  { tabor: Tabor; participantNames: Map<number, string>; onEdit: (tabor: Tabor) => void },
) {
  const [expanded, setExpanded] = useState(false);
  const [capacity, setCapacity] = useState<TaborCapacity | null>(null);
  const [assigned, setAssigned] = useState<TaborParticipant[]>([]);

  useEffect(() => {
    let cancelled = false;
    getTaborCapacity(tabor.id).then((c) => { if (!cancelled) setCapacity(c); }).catch(() => {});
    listTaborParticipants(tabor.id).then((p) => { if (!cancelled) setAssigned(p); }).catch(() => {});
    return () => { cancelled = true; };
  }, [tabor.id]);

  const occupied = assigned.length;
  const capValue = capacity?.capacity ?? Math.max(0, tabor.seats - tabor.supervisor_seats);

  return (
    <div className="rounded-lg border border-gray-200" data-testid="tabor-card">
      <div className="flex items-start gap-2 px-3 py-2">
        <button type="button" onClick={() => setExpanded((e) => !e)} className="flex flex-1 items-start gap-2 text-left">
          {expanded ? <ChevronDown className="mt-0.5 h-4 w-4 text-gray-400" /> : <ChevronRight className="mt-0.5 h-4 w-4 text-gray-400" />}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">
                {TYPE_LABEL[tabor.type] ?? tabor.type} {tabor.name ?? ''}
              </span>
              {tabor.number && <span className="rounded bg-gray-100 px-1.5 text-xs text-gray-600">#{tabor.number}</span>}
              {tabor.document_approved && (
                <span className="flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> lista kompletna
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-gray-500">
              {occupied}/{capValue} miejsc (w tym {tabor.supervisor_seats} dla wychowawców)
              {tabor.carrier ? ` · ${tabor.carrier}` : ''}
              {tabor.driver ? ` · kierowca: ${tabor.driver}` : ''}
            </div>
          </div>
        </button>
        <span className="flex gap-1">
          <button type="button" title="Edytuj" onClick={() => onEdit(tabor)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" data-testid="tabor-edit">
            <Pencil className="h-4 w-4" />
          </button>
          <span title="Usuń (Nr 29)" className="rounded p-1 text-gray-400 hover:bg-gray-100"><Trash2 className="h-4 w-4" /></span>
          <span title="Dokument (Nr 31)"
            className={`rounded p-1 hover:bg-gray-100 ${tabor.document_approved ? 'text-emerald-600' : 'text-orange-500'}`}>
            <FileText className="h-4 w-4" />
          </span>
        </span>
      </div>

      {expanded && (
        <ul className="border-t border-gray-100 px-3 py-2 text-sm" data-testid="tabor-seats">
          {Array.from({ length: tabor.supervisor_seats }, (_, i) => (
            <li key={`w${i}`} className="flex gap-2 rounded bg-purple-50 px-2 py-1 text-purple-800">
              <span className="w-8 font-semibold">W{i + 1}</span>
              <span>{i === 0 && tabor.transport_manager ? tabor.transport_manager : 'Miejsce wychowawcy'}</span>
            </li>
          ))}
          {Array.from({ length: capValue }, (_, i) => {
            const p = assigned[i];
            return (
              <li key={`s${i}`} className="flex gap-2 px-2 py-1">
                <span className="w-8 text-gray-500">{i + 1}</span>
                {p
                  ? <span className="text-gray-800">
                      {participantNames.get(p.reservation_id) ?? `#${p.reservation_id}`}
                      {p.topic_snapshot ? <span className="italic text-gray-500"> · {p.topic_snapshot}</span> : ''}
                      {p.is_transfer ? <span className="ml-1 text-orange-500">⇄</span> : ''}
                    </span>
                  : <span className="text-gray-300">Wolne miejsce</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
