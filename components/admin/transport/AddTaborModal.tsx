'use client';

/**
 * Modal „Dodaj / Edytuj Tabor" (Nr 28) — formularz taboru (AddTaborModal z makiety).
 * Typ (Autokar/Pociąg/Własny/Prywatny), nazwa, numer, miejsca, miejsca wychowawców (kierownik → min 1),
 * przewoźnik, kierowca+tel, kierownik+tel, informacje dodatkowe. Zapis: createTabor/updateTabor.
 */
import { X } from 'lucide-react';
import { useState } from 'react';

import type { Tabor, TaborType } from '@/lib/types/transportLists';
import { createTabor, updateTabor } from '@/lib/services/transportListsApi';

const TYPES: { value: TaborType; label: string }[] = [
  { value: 'autokar', label: 'Autokar' },
  { value: 'pociag', label: 'Pociąg' },
  { value: 'wlasny', label: 'Własny' },
  { value: 'prywatny', label: 'Prywatny' },
];

interface Props {
  connectionId: number;
  tabor: Tabor | null; // null = nowy
  onClose: () => void;
  onSaved: () => void;
}

export default function AddTaborModal({ connectionId, tabor, onClose, onSaved }: Props) {
  const [type, setType] = useState<TaborType>(tabor?.type ?? 'autokar');
  const [name, setName] = useState(tabor?.name ?? '');
  const [number, setNumber] = useState(tabor?.number ?? '');
  const [seats, setSeats] = useState(tabor?.seats ?? 50);
  const [supervisorSeats, setSupervisorSeats] = useState(tabor?.supervisor_seats ?? 0);
  const [carrier, setCarrier] = useState(tabor?.carrier ?? '');
  const [carrierPhone, setCarrierPhone] = useState(tabor?.carrier_phone ?? '');
  const [driver, setDriver] = useState(tabor?.driver ?? '');
  const [driverPhone, setDriverPhone] = useState(tabor?.driver_phone ?? '');
  const [manager, setManager] = useState(tabor?.transport_manager ?? '');
  const [managerPhone, setManagerPhone] = useState(tabor?.manager_phone ?? '');
  const [supervisors, setSupervisors] = useState<string[]>(tabor?.supervisors ?? []);
  const [info, setInfo] = useState(tabor?.additional_info ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kierownik transportu zajmuje min 1 miejsce wychowawcy (auto-wymuszenie).
  const effectiveSupervisor = manager.trim() && supervisorSeats < 1 ? 1 : supervisorSeats;
  // Miejsca wychowawców „z palca" poza kierownikiem (kierownik zajmuje W1).
  const extraSupervisorSlots = Math.max(0, effectiveSupervisor - 1);

  async function handleSave() {
    setError(null);
    if (supervisorSeats > seats) { setError('Miejsca dla wychowawców nie mogą przekraczać liczby miejsc.'); return; }
    setSaving(true);
    const body = {
      type, name: name || null, number: number || null, seats, supervisor_seats: effectiveSupervisor,
      carrier: carrier || null, carrier_phone: carrierPhone || null,
      driver: driver || null, driver_phone: driverPhone || null,
      transport_manager: manager || null, manager_phone: managerPhone || null,
      supervisors: supervisors.slice(0, extraSupervisorSlots),
      additional_info: info || null,
    };
    try {
      if (tabor) await updateTabor(tabor.id, body);
      else await createTabor({ connection_id: connectionId, ...body });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd zapisu taboru');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="tabor-modal">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{tabor ? 'Edytuj tabor' : 'Dodaj tabor'}</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">Typ taboru</label>
          <div className="flex gap-2">
            {TYPES.map((t) => (
              <button key={t.value} type="button" onClick={() => setType(t.value)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-sm ${
                  type === t.value ? 'border-sky-600 bg-sky-50 text-sky-700' : 'border-gray-300 text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nazwa"><input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Numer"><input className={INPUT} value={number} onChange={(e) => setNumber(e.target.value)} /></Field>
          <Field label="Ilość miejsc">
            <input type="number" min={1} className={INPUT} value={seats}
              onChange={(e) => setSeats(Math.max(1, Number(e.target.value) || 1))} />
          </Field>
          <Field label="Miejsca dla wychowawców">
            <input type="number" min={0} className={INPUT} value={supervisorSeats}
              onChange={(e) => setSupervisorSeats(Math.max(0, Number(e.target.value) || 0))} />
          </Field>
          <Field label="Przewoźnik"><input className={INPUT} value={carrier} onChange={(e) => setCarrier(e.target.value)} /></Field>
          <Field label="Telefon przewoźnika"><input className={INPUT} data-testid="carrier-phone-input" value={carrierPhone} onChange={(e) => setCarrierPhone(e.target.value)} /></Field>
          <Field label="Kierowca"><input className={INPUT} value={driver} onChange={(e) => setDriver(e.target.value)} /></Field>
          <Field label="Telefon kierowcy"><input className={INPUT} value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} /></Field>
          <Field label="Kierownik transportu"><input className={INPUT} data-testid="manager-input" value={manager} onChange={(e) => setManager(e.target.value)} /></Field>
          <Field label="Telefon kierownika"><input className={INPUT} value={managerPhone} onChange={(e) => setManagerPhone(e.target.value)} /></Field>
        </div>
        {extraSupervisorSlots > 0 && (
          <Field label={`Wychowawcy „z palca" (poza kierownikiem) — ${extraSupervisorSlots} miejsc`}>
            <div className="flex flex-col gap-1" data-testid="supervisors-list">
              {Array.from({ length: extraSupervisorSlots }, (_, i) => (
                <input key={i} className={INPUT} data-testid={`supervisor-input-${i}`}
                  value={supervisors[i] ?? ''} placeholder={`Wychowawca ${i + 2}`}
                  onChange={(e) => setSupervisors((s) => {
                    const n = [...s]; n[i] = e.target.value; return n;
                  })} />
              ))}
            </div>
          </Field>
        )}
        <Field label="Informacje dodatkowe">
          <textarea className={INPUT} rows={2} value={info} onChange={(e) => setInfo(e.target.value)} />
        </Field>
        {manager.trim() && supervisorSeats < 1 && (
          <p className="mt-1 text-xs text-amber-600">Kierownik zajmuje 1 miejsce wychowawcy — ustawiono automatycznie.</p>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Anuluj</button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {saving ? 'Zapisywanie…' : 'Zapisz'}
          </button>
        </div>
      </div>
    </div>
  );
}

const INPUT = 'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
