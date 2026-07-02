'use client';

import { KeyRound, ShieldCheck, UserCheck, AlertCircle, Save } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { authenticatedFetch } from '@/lib/utils/api';
import { useToast } from '@/components/ToastContainer';

interface AuthPerson {
  name: string;
  document_type: string;
  document_number: string;
  permanent: boolean;
  temporary: boolean;
}
interface CardAuthorizations {
  has_card: boolean;
  persons: AuthPerson[];
  self_return: boolean;
  pickup_note: string;
}
interface AuthorizationsResponse {
  reservation_number: string;
  card: CardAuthorizations;
  manual_note: string;
  manual_note_updated_at: string | null;
}

/**
 * Zakładka „Upoważnienia" (Trello 352). Podgląd READ-ONLY upoważnień z ZATWIERDZONEJ karty kwalifikacyjnej
 * (osoby do odbioru + samodzielny powrót) + ręczna NOTATKA RADSAS (osobna, nie nadpisuje karty).
 * Niezatwierdzonych kart nie pokazujemy. Notatka trafia też do list transportowych powrotnych.
 */
export default function AuthorizationsPanel({ reservationNumber }: { reservationNumber: string }) {
  const [data, setData] = useState<AuthorizationsResponse | null>(null);
  const [note, setNote] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const { showSuccess, showError: showErrorToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/admin/reservations/by-number/${reservationNumber}/authorizations`);
      if (!res.ok) throw new Error('blad');
      const json: AuthorizationsResponse = await res.json();
      setData(json);
      setNote(json.manual_note || '');
      setSavedNote(json.manual_note || '');
      setError(null);
    } catch {
      setError('Nie udało się pobrać upoważnień.');
    } finally {
      setLoading(false);
    }
  }, [reservationNumber]);

  useEffect(() => { load(); }, [load]);

  const saveNote = async () => {
    setSaving(true);
    setInfo(null);
    // Rozróżnienie komunikatu: była już notatka (niepusta) → aktualizacja, inaczej nowy zapis.
    const isUpdate = savedNote.trim() !== '';
    try {
      const res = await authenticatedFetch(`/api/admin/reservations/by-number/${reservationNumber}/authorizations/note`, {
        method: 'PUT',
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error('blad');
      const json = await res.json();
      setSavedNote(json.manual_note || '');
      // Toast systemowy (spójny z resztą panelu) + drobny napis inline jako potwierdzenie.
      showSuccess(isUpdate ? 'Zaktualizowano upoważnienie' : 'Zapisano upoważnienie');
      setInfo(isUpdate ? 'Zaktualizowano.' : 'Zapisano.');
    } catch {
      showErrorToast('Nie udało się zapisać upoważnienia.');
      setError('Nie udało się zapisać notatki.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500 p-2">Ładowanie upoważnień…</p>;
  if (error && !data) return <div className="bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">{error}</div>;

  const card = data?.card;
  const dirty = note !== savedNote;

  return (
    <div className="space-y-4">
      {/* Podgląd z zatwierdzonej karty kwalifikacyjnej (read-only) */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-700">Upoważnienia z karty kwalifikacyjnej</h2>
          <span className="text-[11px] text-gray-400">(tylko zatwierdzona karta — podgląd)</span>
        </div>

        {!card?.has_card ? (
          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border-l-4 border-amber-400 p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Brak zatwierdzonej karty kwalifikacyjnej. Upoważnienia z karty pojawią się dopiero gdy karta zostanie zatwierdzona przez RADSAS (podpisana SMS-em lub potwierdzona mimo to).</span>
          </div>
        ) : (
          <div className="space-y-3">
            {card.self_return && (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-2 rounded">
                <UserCheck className="w-4 h-4" /> Zgoda na samodzielny powrót dziecka
              </div>
            )}
            {card.persons.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="text-gray-500">
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-1.5 font-medium">Osoba upoważniona</th>
                    <th className="text-left py-1.5 font-medium">Dokument</th>
                    <th className="text-center py-1.5 font-medium">Stały</th>
                    <th className="text-center py-1.5 font-medium">Tymczasowy</th>
                  </tr>
                </thead>
                <tbody>
                  {card.persons.map((p, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-1.5 text-gray-800">{p.name}</td>
                      <td className="py-1.5 text-gray-600">{[p.document_type, p.document_number].filter(Boolean).join(' ') || '—'}</td>
                      <td className="py-1.5 text-center">{p.permanent ? '✓' : '—'}</td>
                      <td className="py-1.5 text-center">{p.temporary ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              !card.self_return && <p className="text-sm text-gray-500">Karta zatwierdzona, ale nie wskazano osób upoważnionych ani samodzielnego powrotu.</p>
            )}
            {card.pickup_note && (
              <p className="text-xs text-gray-500">Uwagi do odbioru: {card.pickup_note}</p>
            )}
          </div>
        )}
      </div>

      {/* Notatka ręczna RADSAS (osobna, nie nadpisuje karty) */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
          <KeyRound className="w-5 h-5 text-[#03adf0]" />
          <h2 className="text-sm font-semibold text-slate-700">Upoważnienia wpisane ręcznie (RADSAS)</h2>
        </div>
        <p className="text-xs text-gray-500 mb-2">
          Notatka wpisywana ręcznie na podstawie wiadomości od klienta (mail/SMS z dokumentem). Nie nadpisuje karty —
          pojawia się dodatkowo w listach transportowych powrotnych. Pełna odpowiedzialność za pokrycie dokumentowe po stronie RADSAS.
        </p>
        <textarea
          value={note}
          onChange={(e) => { setNote(e.target.value); setInfo(null); }}
          rows={4}
          placeholder="np. Babcia Anna Kowalska (dowód ABC123456) — upoważnienie przesłane mailem 12.06"
          className="w-full text-sm border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-[#03adf0]/30"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-gray-400">
            {data?.manual_note_updated_at ? `Ostatnia zmiana: ${new Date(data.manual_note_updated_at).toLocaleString('pl-PL')}` : 'Brak zapisanej notatki'}
            {info && <span className="ml-2 text-emerald-600">{info}</span>}
            {error && <span className="ml-2 text-red-600">{error}</span>}
          </span>
          <button
            type="button"
            onClick={saveNote}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#03adf0] hover:bg-[#0288c7] rounded disabled:opacity-40 transition-colors"
          >
            <Save className="w-4 h-4" /> {saving ? 'Zapisywanie…' : 'Zapisz notatkę'}
          </button>
        </div>
      </div>
    </div>
  );
}
