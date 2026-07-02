'use client';

import { BarChart3, RefreshCw, Calendar, FileText, CheckCircle2, CircleDollarSign, AlertCircle, Archive } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import DateRangeCalendar from '@/components/admin/DateRangeCalendar';
import StatChart from '@/components/admin/StatChart';
import StatsReloadOverlay from '@/components/admin/StatsReloadOverlay';
import StyledDropdown from '@/components/admin/StyledDropdown';
import { STAT_TYPES } from '@/lib/constants/statisticTypes';
import { authenticatedFetch } from '@/lib/utils/api';
import { daysAgo, enumerateDays, formatDayLabel } from '@/lib/utils/statsDates';

interface DayPoint { date: string; total: number; paid: number; partial: number; unpaid: number }
interface CampRow { camp_id: number; name: string; total: number; paid: number; partial: number; unpaid: number }
interface ReservationStats {
  total: number; paid: number; partial: number; unpaid: number; archived: number;
  by_day: DayPoint[]; by_camp: CampRow[]; archived_by_camp: CampRow[];
  range_from: string; range_to: string;
}
interface FiltersData {
  camps: { id: number; name: string }[];
  turnusy: { id: number; label: string }[];
  tags: string[];
  seasons: { value: string; label: string }[];
  date_min: string | null;
  date_max: string | null;
}

const COLOR_TREND = '#6366f1';
const COLOR_ARCHIVED = '#64748b'; // archiwalne (szary)

const COLOR_PAID = '#10b981';
const COLOR_PARTIAL = '#f59e0b';
const COLOR_UNPAID = '#ef4444';

// Minimalny czas trwania wskaźnika przeładowania — żeby klik „Zastosuj"/„Odśwież" ZAWSZE
// dawał widoczny feedback, nawet gdy odpowiedź z localhost przychodzi w kilkadziesiąt ms
// (rozkaz Pana 2026-06-30: ma wyraźnie przeładować i zawsze działać).
const MIN_RELOAD_MS = 400;

// Presety jak w statystyce obecności (rozkaz Pana — spójność)
const PRESETS = [
  { label: 'Dzisiaj', back: 0 }, { label: '3 dni', back: 2 }, { label: '5 dni', back: 4 },
  { label: '7 dni', back: 6 }, { label: '10 dni', back: 9 }, { label: '14 dni', back: 13 },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'Wszystkie rezerwacje' },
  { value: 'paid', label: 'Opłacone w całości' },
  { value: 'partial', label: 'Częściowo opłacone' },
  { value: 'unpaid', label: 'Nieopłacone' },
];

function formatRangeLabel(from: string, to: string): string {
  if (!from || !to) return 'Wybierz zakres';
  return from === to ? formatDayLabel(from) : `${formatDayLabel(from)} – ${formatDayLabel(to)}`;
}

/** Tabela rezerwacji wg tematu — z wierszem SUMY pod nagłówkami kolumn (reużywalna: tematy + archiwalne). */
function CampTable({ title, rows }: { title: string; rows: CampRow[] }) {
  if (rows.length === 0) return null;
  const sum = rows.reduce(
    (a, r) => ({ total: a.total + r.total, paid: a.paid + r.paid, partial: a.partial + r.partial, unpaid: a.unpaid + r.unpaid }),
    { total: 0, paid: 0, partial: 0, unpaid: 0 },
  );
  return (
    <div className="bg-white border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Temat</th>
            <th className="text-right px-4 py-2 font-medium">Wszystkie</th>
            <th className="text-right px-4 py-2 font-medium">Opłacone</th>
            <th className="text-right px-4 py-2 font-medium">Częściowo</th>
            <th className="text-right px-4 py-2 font-medium">Nieopłacone</th>
          </tr>
          {/* SUMA pod nazwami kolumn (rozkaz Pana) */}
          <tr className="bg-gray-100 text-gray-800 font-semibold border-t border-gray-200">
            <td className="text-left px-4 py-2">SUMA</td>
            <td className="text-right px-4 py-2">{sum.total}</td>
            <td className="text-right px-4 py-2 text-emerald-700">{sum.paid}</td>
            <td className="text-right px-4 py-2 text-amber-700">{sum.partial}</td>
            <td className="text-right px-4 py-2 text-red-700">{sum.unpaid}</td>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.camp_id} className="border-t border-gray-100">
              <td className="px-4 py-2">{c.name}</td>
              <td className="px-4 py-2 text-right font-semibold text-gray-800">{c.total}</td>
              <td className="px-4 py-2 text-right text-emerald-600">{c.paid}</td>
              <td className="px-4 py-2 text-right text-amber-600">{c.partial}</td>
              <td className="px-4 py-2 text-right text-red-600">{c.unpaid}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="bg-white border border-gray-200 p-4 flex items-center gap-3">
      <div className={`p-2 rounded ${accent}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

export default function StatystykaRezerwacjiPage() {
  const router = useRouter();
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [filters, setFilters] = useState<FiltersData | null>(null);
  const [rangeFrom, setRangeFrom] = useState(daysAgo(29));
  const [rangeTo, setRangeTo] = useState(daysAgo(0));
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [calendarOpen, setCalendarOpen] = useState(false);
  // filtry: '' = wszystkie
  const [campId, setCampId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [tag, setTag] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(''); // '' = wszystkie rezerwacje (domyślnie)
  const [seasons, setSeasons] = useState<Set<string>>(new Set()); // wybrane sezony (multi); pusty = wszystkie
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const calRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (from: string, to: string, excl: Set<string>, cId: string, pId: string, t: string, pStatus: string, seas: Set<string>) => {
    setLoading(true);
    const startedAt = performance.now();
    try {
      const params = new URLSearchParams({ date_from: from, date_to: to });
      if (excl.size > 0) params.set('excluded', Array.from(excl).join(','));
      if (cId) params.set('camp_id', cId);
      if (pId) params.set('property_id', pId);
      if (t) params.set('tag', t);
      if (pStatus) params.set('payment_status', pStatus);
      if (seas.size > 0) params.set('seasons', Array.from(seas).join(','));
      const res = await authenticatedFetch(`/api/admin/reservation-statistics/statistics?${params.toString()}`);
      if (res.status === 403) {
        setError('Brak dostępu — wymagane uprawnienie „Statystyki".');
        setStats(null);
        return;
      }
      if (!res.ok) throw new Error('blad');
      setError(null);
      setStats(await res.json());
    } catch {
      setError('Nie udało się pobrać statystyk rezerwacji.');
    } finally {
      // utrzymaj wskaźnik min. MIN_RELOAD_MS — wyraźny feedback nawet przy szybkiej odpowiedzi
      const elapsed = performance.now() - startedAt;
      if (elapsed < MIN_RELOAD_MS) await new Promise((r) => setTimeout(r, MIN_RELOAD_MS - elapsed));
      setLoading(false);
    }
  }, []);

  // opcje filtrów (raz)
  useEffect(() => {
    authenticatedFetch('/api/admin/reservation-statistics/filters')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setFilters(d))
      .catch(() => { /* brak filtrów — UI bez list */ });
  }, []);

  // pierwsze ładowanie
  useEffect(() => { load(rangeFrom, rangeTo, excluded, campId, propertyId, tag, paymentStatus, seasons); }, [load]);

  // zamknij kalendarz po kliknięciu poza
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (calendarOpen && calRef.current && !calRef.current.contains(e.target as Node)) setCalendarOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [calendarOpen]);

  const reload = (over: Partial<{ from: string; to: string; excl: Set<string>; cId: string; pId: string; t: string; pStatus: string; seas: Set<string> }> = {}) =>
    load(over.from ?? rangeFrom, over.to ?? rangeTo, over.excl ?? excluded, over.cId ?? campId, over.pId ?? propertyId, over.t ?? tag, over.pStatus ?? paymentStatus, over.seas ?? seasons);

  const applyRange = () => { setCalendarOpen(false); reload(); };
  const clearRange = () => {
    const f = daysAgo(29), t = daysAgo(0);
    setRangeFrom(f); setRangeTo(t); setExcluded(new Set());
    reload({ from: f, to: t, excl: new Set() });
  };
  const applyPreset = (back: number) => {
    const f = daysAgo(back), t = daysAgo(0);
    setRangeFrom(f); setRangeTo(t); setExcluded(new Set()); setCalendarOpen(false);
    reload({ from: f, to: t, excl: new Set() });
  };
  const isPresetActive = (back: number) => rangeFrom === daysAgo(back) && rangeTo === daysAgo(0) && excluded.size === 0;

  // serie wykresu „Rezerwacje wg dnia" (stacked statusy) — wszystkie dni zakresu
  const rangeDays = useMemo(() => (stats ? enumerateDays(stats.range_from, stats.range_to) : []), [stats]);
  const dayMap = new Map((stats?.by_day ?? []).map((d) => [d.date, d]));
  const dayLabels = rangeDays.map(formatDayLabel);
  const seriesPaid = rangeDays.map((d) => dayMap.get(d)?.paid ?? 0);
  const seriesPartial = rangeDays.map((d) => dayMap.get(d)?.partial ?? 0);
  const seriesUnpaid = rangeDays.map((d) => dayMap.get(d)?.unpaid ?? 0);
  const seriesTrend = rangeDays.map((d) => dayMap.get(d)?.total ?? 0); // linia trendu (wszystkie rezerwacje/dzień)

  // przycisk „Wszystkie rezerwacje" — pełny zakres od pierwszej do ostatniej rezerwacji
  const showAll = () => {
    if (!filters?.date_min || !filters?.date_max) return;
    setRangeFrom(filters.date_min); setRangeTo(filters.date_max); setExcluded(new Set()); setCalendarOpen(false);
    reload({ from: filters.date_min, to: filters.date_max, excl: new Set() });
  };

  const campOptions = [{ value: '', label: 'Wszystkie tematy' }, ...(filters?.camps ?? []).map((c) => ({ value: String(c.id), label: c.name }))];
  const turnusOptions = [{ value: '', label: 'Wszystkie turnusy' }, ...(filters?.turnusy ?? []).map((t) => ({ value: String(t.id), label: t.label }))];
  const tagOptions = [{ value: '', label: 'Wszystkie tagi' }, ...(filters?.tags ?? []).map((t) => ({ value: t, label: t }))];

  return (
    <AdminLayout>
      <AdminPageHeader title="Statystyka" />
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <nav className="text-xs text-gray-400 flex items-center gap-1.5 mb-1" aria-label="Ścieżka">
              <Link href="/admin-panel/statystyka" className="hover:text-gray-600">Statystyka</Link>
              <span className="text-gray-300">/</span>
              <span className="text-gray-600 font-medium">Statystyka rezerwacji</span>
            </nav>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#03adf0] flex-shrink-0" />
              <StyledDropdown
                size="sm"
                ariaLabel="Rodzaj statystyki"
                minWidthPx={210}
                value="statystyka-rezerwacji"
                options={STAT_TYPES.map((t) => ({ value: t.slug, label: t.label }))}
                onChange={(slug) => router.push(`/admin-panel/statystyka/${slug}`)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={showAll} disabled={!filters?.date_min}
              className="px-3 py-1.5 text-xs whitespace-nowrap bg-[#03adf0] text-white hover:bg-[#0288c7] transition-colors disabled:opacity-40"
              title="Pokaż wszystkie rezerwacje (cały okres)">
              Wszystkie rezerwacje
            </button>
            <div className="flex border border-gray-200 overflow-hidden">
              {PRESETS.map((p) => (
                <button key={p.label} onClick={() => applyPreset(p.back)}
                  className={`px-2.5 py-1.5 text-xs whitespace-nowrap transition-colors border-r border-gray-200 last:border-r-0 ${isPresetActive(p.back) ? 'bg-[#03adf0] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="relative" ref={calRef}>
              <button onClick={() => setCalendarOpen((o) => !o)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 hover:bg-gray-50 transition-colors">
                <Calendar className="w-4 h-4 text-[#03adf0]" />
                {formatRangeLabel(rangeFrom, rangeTo)}
              </button>
              {calendarOpen && (
                <div className="absolute right-0 mt-1 z-30 bg-white border border-gray-200 shadow-xl">
                  <DateRangeCalendar size="lg" rangeFrom={rangeFrom} rangeTo={rangeTo} excludedDates={excluded}
                    onRangeChange={(f, t) => { setRangeFrom(f); setRangeTo(t); }} onExcludedChange={setExcluded}
                    onApply={applyRange} onClear={clearRange} />
                </div>
              )}
            </div>
            <button onClick={() => reload()} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 transition-colors">
              <RefreshCw className="w-4 h-4" /> Odśwież
            </button>
          </div>
        </div>

        {/* Filtry: status / temat / turnus / tag */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-1.5"><span className="text-xs text-gray-500">Status:</span>
            <StyledDropdown ariaLabel="Filtr status płatności" minWidthPx={180} value={paymentStatus}
              options={PAYMENT_STATUS_OPTIONS} onChange={(v) => { setPaymentStatus(v); reload({ pStatus: v }); }} /></div>
          <div className="flex items-center gap-1.5"><span className="text-xs text-gray-500">Temat:</span>
            <StyledDropdown ariaLabel="Filtr temat" minWidthPx={170} value={campId}
              options={campOptions} onChange={(v) => { setCampId(v); reload({ cId: v }); }} /></div>
          <div className="flex items-center gap-1.5"><span className="text-xs text-gray-500">Turnus:</span>
            <StyledDropdown ariaLabel="Filtr turnus" minWidthPx={220} value={propertyId}
              options={turnusOptions} onChange={(v) => { setPropertyId(v); reload({ pId: v }); }} /></div>
          <div className="flex items-center gap-1.5"><span className="text-xs text-gray-500">Tag:</span>
            <StyledDropdown ariaLabel="Filtr tag" minWidthPx={150} value={tag}
              options={tagOptions} onChange={(v) => { setTag(v); reload({ t: v }); }} /></div>
          {/* Sezon — select z opcją „Wszystkie sezony" (prognozowanie); lista uzupełnia się automatycznie */}
          <div className="flex items-center gap-1.5"><span className="text-xs text-gray-500">Sezon:</span>
            <StyledDropdown ariaLabel="Filtr sezon" minWidthPx={170}
              value={Array.from(seasons)[0] ?? ''}
              options={[{ value: '', label: 'Wszystkie sezony' }, ...(filters?.seasons ?? []).map((s) => ({ value: s.value, label: s.label }))]}
              onChange={(v) => { const ns = v ? new Set([v]) : new Set<string>(); setSeasons(ns); reload({ seas: ns }); }} />
          </div>
        </div>

        {loading && !stats ? <p className="text-gray-500">Ładowanie…</p> : null}
        {error ? <div className="bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">{error}</div> : null}

        {stats && !error ? (
          <div className="relative">
            <StatsReloadOverlay visible={loading} />
            <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatCard icon={<FileText className="w-5 h-5 text-white" />} label="Wszystkie rezerwacje" value={String(stats.total)} accent="bg-[#03adf0]" />
              <StatCard icon={<CheckCircle2 className="w-5 h-5 text-white" />} label="Opłacone w całości" value={String(stats.paid)} accent="bg-emerald-500" />
              <StatCard icon={<CircleDollarSign className="w-5 h-5 text-white" />} label="Częściowo opłacone" value={String(stats.partial)} accent="bg-amber-500" />
              <StatCard icon={<AlertCircle className="w-5 h-5 text-white" />} label="Nieopłacone" value={String(stats.unpaid)} accent="bg-red-500" />
              <StatCard icon={<Archive className="w-5 h-5 text-white" />} label="Archiwalne" value={String(stats.archived)} accent="bg-slate-500" />
            </div>

            <StatChart kind="bar" stacked title="Rezerwacje wg dnia (słupki = status płatności, linia = trend)" unit="rezerwacji"
              labels={dayLabels} series={[
                { label: 'Opłacone', data: seriesPaid, color: COLOR_PAID },
                { label: 'Częściowo', data: seriesPartial, color: COLOR_PARTIAL },
                { label: 'Nieopłacone', data: seriesUnpaid, color: COLOR_UNPAID },
                { label: 'Trend (wszystkie)', data: seriesTrend, color: COLOR_TREND, type: 'line' },
              ]} />

            {/* Wykres kołowy podsumowujący — reaguje na wszystkie filtry */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StatChart kind="doughnut" title="Podsumowanie rezerwacji" unit="rezerwacji" labels={[]}
                centerValue={stats.total} centerLabel="rezerwacji"
                centerTooltip="Liczba rezerwacji w wybranym okresie i filtrach (segmenty: status płatności; archiwalne pokazane osobno)."
                series={[
                  { label: 'Opłacone w całości', data: [stats.paid], color: COLOR_PAID },
                  { label: 'Częściowo opłacone', data: [stats.partial], color: COLOR_PARTIAL },
                  { label: 'Nieopłacone', data: [stats.unpaid], color: COLOR_UNPAID },
                  { label: 'Archiwalne', data: [stats.archived], color: COLOR_ARCHIVED },
                ]} />
              {/* Tabela tematów (dynamiczna, z wierszem SUMY) */}
              <CampTable title="Rezerwacje wg tematu" rows={stats.by_camp} />
            </div>

            {/* Tabela archiwalnych rezerwacji wg tematu */}
            <CampTable title="Archiwalne rezerwacje wg tematu" rows={stats.archived_by_camp} />

            <p className="text-xs text-gray-400">
              Zakres utworzenia rezerwacji: {formatDayLabel(stats.range_from)} – {formatDayLabel(stats.range_to)}.
            </p>
            </div>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
