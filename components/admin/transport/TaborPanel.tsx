'use client';

/**
 * Panel PRAWY „Tabor" (Nr 27) — karty taborów aktywnego połączenia.
 * Karta: typ/nazwa/numer + zajęte/wolne (w tym N wychowawców) + przewoźnik/kierowca/kierownik + badge „lista kompletna".
 * Rozwinięcie: miejsca wychowawców W1..Wn (fioletowe, kierownik na W1) + miejsca uczestników 1..N + „Wolne miejsce".
 * Akcje Edytuj/Usuń/Dokument = Nr 28-31 (podpięcie później). Wsadzanie (drag&drop) = Nr 26.
 */
import {
  ChevronDown, ChevronRight, Pencil, Trash2, FileText, CheckCircle2, PackagePlus, X,
} from 'lucide-react';
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
  openTaborId: number | null;
  onOpenTabor: (id: number) => void;
  onDropAssign: (taborId: number, reservationId: number) => void;
  onRemoveParticipant: (participantId: number) => void;  // G06: wyjęcie pojedynczego uczestnika
  reloadKey: number;
  onDelete: (tabor: Tabor) => void;
  onDocument: (tabor: Tabor) => void;
}

export default function TaborPanel(
  { tabors, participantNames, onEdit, openTaborId, onOpenTabor, onDropAssign, onRemoveParticipant,
    reloadKey, onDelete, onDocument }: TaborPanelProps,
) {
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
        <TaborCard key={t.id} tabor={t} participantNames={participantNames} onEdit={onEdit} reloadKey={reloadKey}
          isOpen={openTaborId === t.id} onOpen={() => onOpenTabor(t.id)}
          onDrop={(rid) => onDropAssign(t.id, rid)} onDelete={() => onDelete(t)}
          onRemoveParticipant={onRemoveParticipant} onDocument={() => onDocument(t)} />
      ))}
    </div>
  );
}

interface TaborCardProps {
  tabor: Tabor;
  participantNames: Map<number, string>;
  onEdit: (tabor: Tabor) => void;
  isOpen: boolean;
  onOpen: () => void;
  onDrop: (reservationId: number) => void;
  onRemoveParticipant: (participantId: number) => void;
  reloadKey: number;
  onDelete: () => void;
  onDocument: () => void;
}

function TaborCard(
  { tabor, participantNames, onEdit, isOpen, onOpen, onDrop, onRemoveParticipant,
    reloadKey, onDelete, onDocument }: TaborCardProps,
) {
  const [expanded, setExpanded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [capacity, setCapacity] = useState<TaborCapacity | null>(null);
  const [assigned, setAssigned] = useState<TaborParticipant[]>([]);

  useEffect(() => {
    let cancelled = false;
    getTaborCapacity(tabor.id).then((c) => { if (!cancelled) setCapacity(c); }).catch(() => {});
    listTaborParticipants(tabor.id).then((p) => { if (!cancelled) setAssigned(p); }).catch(() => {});
    return () => { cancelled = true; };
  }, [tabor.id, reloadKey]);

  const occupied = assigned.length;
  const capValue = capacity?.capacity ?? Math.max(0, tabor.seats - tabor.supervisor_seats);

  return (
    <div data-testid="tabor-card"
      className={`rounded-lg border ${isOpen ? 'border-sky-500 ring-2 ring-sky-200' : 'border-gray-200'} ${
        dragOver ? 'bg-sky-50' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setDragOver(false);
        const rid = Number(e.dataTransfer.getData('text/plain'));
        if (rid) onDrop(rid);
      }}>
      <div className="flex items-start gap-2 px-3 py-2">
        <button type="button" onClick={() => setExpanded((e) => !e)} data-testid="tabor-expand"
          className="flex flex-1 items-start gap-2 text-left">
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
          <button type="button" title={isOpen ? 'Tabor otwarty — wsadzaj uczestników' : 'Otwórz do wsadzania'}
            onClick={onOpen} data-testid="tabor-open"
            className={`rounded p-1 ${isOpen ? 'bg-sky-100 text-sky-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}>
            <PackagePlus className="h-4 w-4" />
          </button>
          <button type="button" title="Edytuj" onClick={() => onEdit(tabor)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" data-testid="tabor-edit">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" title="Usuń tabor" onClick={onDelete} data-testid="tabor-delete"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
          <button type="button" title="Wypuść / otwórz dokument listy" onClick={onDocument} data-testid="tabor-document"
            className={`rounded p-1 hover:bg-gray-100 ${tabor.document_approved ? 'text-emerald-600' : 'text-orange-500'}`}>
            <FileText className="h-4 w-4" />
          </button>
        </span>
      </div>

      {expanded && (
        <ul className="border-t border-gray-100 px-3 py-2 text-sm" data-testid="tabor-seats">
          {Array.from({ length: tabor.supervisor_seats }, (_, i) => {
            // W1 = kierownik transportu; W2..Wn = wychowawcy wpisani „z palca" (tabor.supervisors).
            const label = i === 0
              ? (tabor.transport_manager || 'Miejsce kierownika')
              : (tabor.supervisors?.[i - 1] || 'Miejsce wychowawcy');
            const filled = i === 0 ? !!tabor.transport_manager : !!tabor.supervisors?.[i - 1];
            return (
              <li key={`w${i}`} className="flex gap-2 rounded bg-purple-50 px-2 py-1 text-purple-800" data-testid="tabor-w-slot">
                <span className="w-8 font-semibold">W{i + 1}</span>
                <span className={filled ? '' : 'italic text-purple-400'}>{label}</span>
              </li>
            );
          })}
          {Array.from({ length: capValue }, (_, i) => {
            const p = assigned[i];
            return (
              <li key={`s${i}`} className="flex items-center gap-2 px-2 py-1">
                <span className="w-8 text-gray-500">{i + 1}</span>
                {p
                  ? <>
                      <span className="flex-1 text-gray-800">
                        {participantNames.get(p.reservation_id) ?? `#${p.reservation_id}`}
                        {p.topic_snapshot ? <span className="italic text-gray-500"> · {p.topic_snapshot}</span> : ''}
                        {p.is_transfer ? <span className="ml-1 text-orange-500">⇄</span> : ''}
                      </span>
                      {/* G06: wyjmij pojedynczego uczestnika (× przy miejscu) — renumeracja po stronie backendu */}
                      <button type="button" title="Wyjmij uczestnika z taboru" data-testid="participant-remove"
                        onClick={() => onRemoveParticipant(p.id)}
                        className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  : <span className="flex-1 text-gray-300">Wolne miejsce</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
