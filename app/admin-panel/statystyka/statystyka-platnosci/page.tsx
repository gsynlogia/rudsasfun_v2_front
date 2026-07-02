'use client';

import { Wallet, RefreshCw, Calendar, CheckCircle2, CircleDollarSign, AlertCircle, Banknote, PiggyBank, LineChart } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import DateRangeCalendar from '@/components/admin/DateRangeCalendar';
import MultiSelectDropdown from '@/components/admin/MultiSelectDropdown';
import StatChart from '@/components/admin/StatChart';
import StatsReloadOverlay from '@/components/admin/StatsReloadOverlay';
import StyledDropdown from '@/components/admin/StyledDropdown';
import { STAT_TYPES } from '@/lib/constants/statisticTypes';
import { authenticatedFetch } from '@/lib/utils/api';
import { daysAgo, enumerateDays, formatDayLabel } from '@/lib/utils/statsDates';

interface DayStatusPoint { date: string; total: number; paid: number; partial: number; unpaid: number }
interface PaymentDay { date: string; amount: number; count: number }
interface PredictionDay { date: string; predicted: number }
interface CampRow { camp_id: number; name: string; total: number; paid: number; partial: number; unpaid: number; receivable: number }
interface Prediction {
  future: PredictionDay[]; avg_daily: number; slope: number; uses_weekday: boolean;
  total_predicted: number; outstanding: number; lookback_days: number; horizon_days: number;
}
interface PaymentStats {
  total: number; paid: number; partial: number; unpaid: number;
  receivable: number; paid_in: number; outstanding: number;
  sale_paid_full: number; sale_partial_paid: number; overpaid: number;
  amount_by_status: { paid: number; partial: number; unpaid: number };
  by_day: DayStatusPoint[]; by_camp: CampRow[];
  payments_by_day: PaymentDay[]; payments_total: number; refunds_total: number;
  prediction: Prediction;
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

const COLOR_PAID = '#10b981';
const COLOR_PARTIAL = '#f59e0b';
const COLOR_UNPAID = '#ef4444';
const COLOR_TREND = '#6366f1';
const COLOR_MOVEMENT = '#03adf0';
const COLOR_PREDICTION = '#a855f7'; // predykcja (fiolet — wizualnie odróżniona od realnych wpłat)

const MIN_RELOAD_MS = 400;

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

// Kwoty: odstępy tysięcy (1 000 / 10 000 / 100 000 / 1 000 000) + „PLN" (rozkaz Pana — kwota porządnie).
const NUM = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 });
const fmtPLN = (v: number) => `${NUM.format(Math.round(v || 0))} PLN`;

function formatRangeLabel(from: string, to: string): string {
  if (!from || !to) return 'Wybierz zakres';
  return from === to ? formatDayLabel(from) : `${formatDayLabel(from)} – ${formatDayLabel(to)}`;
}

/** Tabela należności wg tematu — z wierszem SUMY pod nagłówkami. */
function CampTable({ rows }: { rows: CampRow[] }) {
  if (rows.length === 0) return null;
  const sum = rows.reduce(
    (a, r) => ({ total: a.total + r.total, receivable: a.receivable + r.receivable, paid: a.paid + r.paid, partial: a.partial + r.partial, unpaid: a.unpaid + r.unpaid }),
    { total: 0, receivable: 0, paid: 0, partial: 0, unpaid: 0 },
  );
  return (
    <div className="bg-white border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">Należności wg tematu</h3>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Temat</th>
            <th className="text-right px-4 py-2 font-medium">Rezerwacje</th>
            <th className="text-right px-4 py-2 font-medium">Należności</th>
            <th className="text-right px-4 py-2 font-medium">Opłacone</th>
            <th className="text-right px-4 py-2 font-medium">Częściowo</th>
            <th className="text-right px-4 py-2 font-medium">Nieopłacone</th>
          </tr>
          <tr className="bg-gray-100 text-gray-800 font-semibold border-t border-gray-200">
            <td className="text-left px-4 py-2">SUMA</td>
            <td className="text-right px-4 py-2">{sum.total}</td>
            <td className="text-right px-4 py-2">{fmtPLN(sum.receivable)}</td>
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
              <td className="px-4 py-2 text-right text-gray-800">{fmtPLN(c.receivable)}</td>
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

function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className="bg-white border border-gray-200 p-4 flex items-center gap-3">
      <div className={`p-2 rounded ${accent}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-semibold text-gray-800">{value}</p>
        {sub ? <p className="text-[11px] text-gray-400">{sub}</p> : null}
      </div>
    </div>
  );
}

export default function StatystykaPlatnosciPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [filters, setFilters] = useState<FiltersData | null>(null);
  // domyślnie PEŁNY zakres (puste → backend zwraca wszystkie rezerwacje); etykieta ustawiana po /filters
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [campId, setCampId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [tag, setTag] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [seasons, setSeasons] = useState<Set<string>>(new Set());
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
      const res = await authenticatedFetch(`/api/admin/payment-statistics/statistics?${params.toString()}`);
      if (res.status === 403) {
        setError('Brak dostępu — wymagane uprawnienie „Statystyki".');
        setStats(null);
        return;
      }
      if (!res.ok) throw new Error('blad');
      setError(null);
      setStats(await res.json());
    } catch {
      setError('Nie udało się pobrać statystyk płatności.');
    } finally {
      const elapsed = performance.now() - startedAt;
      if (elapsed < MIN_RELOAD_MS) await new Promise((r) => setTimeout(r, MIN_RELOAD_MS - elapsed));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    authenticatedFetch('/api/admin/payment-statistics/filters')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setFilters(d);
        // ustaw etykietę pełnego zakresu (dane już pełne z pierwszego ładowania)
        if (d.date_min && d.date_max) { setRangeFrom(d.date_min); setRangeTo(d.date_max); }
      })
      .catch(() => { /* brak filtrów */ });
  }, []);

  useEffect(() => { load(rangeFrom, rangeTo, excluded, campId, propertyId, tag, paymentStatus, seasons); }, [load]);

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
    // „Wyczyść" = powrót do PEŁNEGO zakresu (wszystkie rezerwacje)
    const f = filters?.date_min ?? '', t = filters?.date_max ?? '';
    setRangeFrom(f); setRangeTo(t); setExcluded(new Set());
    reload({ from: f, to: t, excl: new Set() });
  };
  const applyPreset = (back: number) => {
    const f = daysAgo(back), t = daysAgo(0);
    setRangeFrom(f); setRangeTo(t); setExcluded(new Set()); setCalendarOpen(false);
    reload({ from: f, to: t, excl: new Set() });
  };
  const isPresetActive = (back: number) => rangeFrom === daysAgo(back) && rangeTo === daysAgo(0) && excluded.size === 0;

  const showAll = () => {
    if (!filters?.date_min || !filters?.date_max) return;
    setRangeFrom(filters.date_min); setRangeTo(filters.date_max); setExcluded(new Set()); setCalendarOpen(false);
    reload({ from: filters.date_min, to: filters.date_max, excl: new Set() });
  };

  // serie wykresu „Rezerwacje wg dnia" (część A — stacked statusy + trend)
  const rangeDays = useMemo(() => (stats ? enumerateDays(stats.range_from, stats.range_to) : []), [stats]);
  const dayMap = new Map((stats?.by_day ?? []).map((d) => [d.date, d]));
  const dayLabels = rangeDays.map(formatDayLabel);
  const seriesPaid = rangeDays.map((d) => dayMap.get(d)?.paid ?? 0);
  const seriesPartial = rangeDays.map((d) => dayMap.get(d)?.partial ?? 0);
  const seriesUnpaid = rangeDays.map((d) => dayMap.get(d)?.unpaid ?? 0);
  const seriesResTrend = rangeDays.map((d) => dayMap.get(d)?.total ?? 0);

  // serie wykresu „Ruch wpłat wg dnia" (część B)
  const payMap = new Map((stats?.payments_by_day ?? []).map((d) => [d.date, d]));
  const seriesPayments = rangeDays.map((d) => payMap.get(d)?.amount ?? 0);

  // serie wykresu PREDYKCJI (kontekst: ostatnie realne dni + przyszłe predykowane)
  const recentReal = (stats?.payments_by_day ?? []).slice(-14);
  const future = stats?.prediction.future ?? [];
  const predLabels = [...recentReal.map((d) => formatDayLabel(d.date)), ...future.map((d) => formatDayLabel(d.date))];
  // wykres liniowy: NaN = przerwa (linia się nie rysuje poza swoim zakresem); most łączy predykcję z ostatnim realnym punktem
  const realPart = [...recentReal.map((d) => d.amount), ...future.map(() => NaN)];
  const predPart = [...recentReal.map(() => NaN), ...future.map((d) => d.predicted)];
  if (recentReal.length > 0) predPart[recentReal.length - 1] = recentReal[recentReal.length - 1].amount;

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
              <span className="text-gray-600 font-medium">Statystyka płatności</span>
            </nav>
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#03adf0] flex-shrink-0" />
              <StyledDropdown
                size="sm"
                ariaLabel="Rodzaj statystyki"
                minWidthPx={210}
                value="statystyka-platnosci"
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

        {/* Filtry — identyczne jak statystyka rezerwacji */}
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
          {/* Sezon — WIELOKROTNY wybór (checkboxy): predykcja i statystyki budowane na WSZYSTKICH zaznaczonych
              sezonach (rozkaz Pana — np. poprzedni + obecny). Puste = wszystkie sezony. */}
          <div className="flex items-center gap-1.5"><span className="text-xs text-gray-500">Sezon:</span>
            <MultiSelectDropdown ariaLabel="Filtr sezon" minWidthPx={180} emptyLabel="Wszystkie sezony"
              values={seasons}
              options={(filters?.seasons ?? []).map((s) => ({ value: s.value, label: s.label }))}
              onChange={(ns) => { setSeasons(ns); reload({ seas: ns }); }} />
          </div>
        </div>

        {loading && !stats ? <p className="text-gray-500">Ładowanie…</p> : null}
        {error ? <div className="bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">{error}</div> : null}

        {stats && !error ? (
          <div className="relative">
            <StatsReloadOverlay visible={loading} />
            <div className="space-y-6">
              {/* Karty kwotowe — bilans należności (co POWINNO wpłynąć / wpłynęło / zostało) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <StatCard icon={<Banknote className="w-5 h-5 text-white" />} label="Wartość sprzedaży (powinno wpłynąć)" value={fmtPLN(stats.receivable)} sub={`${stats.total} rezerwacji · suma cen`} accent="bg-[#03adf0]" />
                <StatCard icon={<PiggyBank className="w-5 h-5 text-white" />} label="Wpłacono faktycznie" value={fmtPLN(stats.paid_in)} sub={stats.overpaid > 0 ? `w tym nadpłaty: ${fmtPLN(stats.overpaid)}` : 'realne wpłaty na te rezerwacje'} accent="bg-emerald-500" />
                <StatCard icon={<AlertCircle className="w-5 h-5 text-white" />} label="Pozostało do zapłaty" value={fmtPLN(stats.outstanding)} sub="ile klienci mają jeszcze wpłacić" accent="bg-red-500" />
              </div>

              {/* Karty liczbowe statusów — liczba rezerwacji + WARTOŚĆ (cena) per status (nie wpłata) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard icon={<CheckCircle2 className="w-5 h-5 text-white" />} label="Opłacone w całości" value={String(stats.paid)} sub={`wartość: ${fmtPLN(stats.amount_by_status.paid)}`} accent="bg-emerald-500" />
                <StatCard icon={<CircleDollarSign className="w-5 h-5 text-white" />} label="Częściowo opłacone" value={String(stats.partial)} sub={`wartość: ${fmtPLN(stats.amount_by_status.partial)}`} accent="bg-amber-500" />
                <StatCard icon={<AlertCircle className="w-5 h-5 text-white" />} label="Nieopłacone" value={String(stats.unpaid)} sub={`wartość: ${fmtPLN(stats.amount_by_status.unpaid)}`} accent="bg-red-500" />
              </div>

              {/* Wykres 1 — rezerwacje wg dnia (status + trend) */}
              <StatChart kind="bar" stacked title="Rezerwacje wg dnia (słupki = status płatności, linia = trend)" unit="rezerwacji"
                labels={dayLabels} series={[
                  { label: 'Opłacone', data: seriesPaid, color: COLOR_PAID },
                  { label: 'Częściowo', data: seriesPartial, color: COLOR_PARTIAL },
                  { label: 'Nieopłacone', data: seriesUnpaid, color: COLOR_UNPAID },
                  { label: 'Trend (wszystkie)', data: seriesResTrend, color: COLOR_TREND, type: 'line' },
                ]} />

              {/* Wykres 2 (kołowy kwotowy) — klikalna legenda kwotowa pod kółkiem (wyłączanie statusu przelicza środek) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StatChart kind="doughnut" title="Wartość sprzedaży — rozkład" unit="PLN" labels={[]}
                  interactiveLegend valueFormatter={fmtPLN} centerLabel="wartość sprzedaży"
                  centerTooltip="Wartość sprzedaży = Opłacone w całości + Wpłacone częściowo + Pozostało do zapłaty. Rezerwacja opłacona w całości (nawet w ratach) liczona jest jako w całości, nie częściowa. Suma trzech segmentów = pełna wartość sprzedaży."
                  series={[
                    { label: 'Opłacone w całości', data: [stats.sale_paid_full], color: COLOR_PAID },
                    { label: 'Wpłacone częściowo', data: [stats.sale_partial_paid], color: COLOR_PARTIAL },
                    { label: 'Pozostało do zapłaty', data: [stats.outstanding], color: COLOR_UNPAID },
                  ]} />
                <CampTable rows={stats.by_camp} />
              </div>

              {/* Wykres 3 — ruch wpłat wg dnia (część B, wg daty wpłaty) */}
              <StatChart kind="bar"
                title={`Ruch wpłat wg dnia (wg daty wpłaty) — suma ${fmtPLN(stats.payments_total)}${stats.refunds_total < 0 ? `, zwroty ${fmtPLN(stats.refunds_total)}` : ''}`}
                unit="PLN" valueFormatter={fmtPLN}
                labels={dayLabels} series={[
                  { label: 'Wpłaty', data: seriesPayments, color: COLOR_MOVEMENT },
                  { label: 'Trend wpłat', data: seriesPayments, color: COLOR_TREND, type: 'line' },
                ]} />

              {/* PREDYKCJA WPŁAT — baner + wykres */}
              <div className="space-y-3">
                <div className="bg-amber-50 border-l-4 border-amber-400 p-3 text-sm text-amber-800 flex items-start gap-2">
                  <LineChart className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>To jest predykcja wpłat — wyłącznie szacunek.</strong>{' '}
                    Opiera się na realnym średnim tempie ze WSZYSTKICH dotychczasowych wpłat ({stats.prediction.lookback_days} dni danych,
                    średnio {fmtPLN(stats.prediction.avg_daily)}/dzień){stats.prediction.uses_weekday ? ' z uwzględnieniem wzorca tygodniowego (mniejsze wpłaty w weekendy)' : ''},
                    ograniczona PEŁNĄ zaległością wszystkich należnych rezerwacji w wybranych filtrach/sezonach ({fmtPLN(stats.prediction.outstanding)}).
                    Liczona od dziś, niezależnie od wybranego okresu. Przewidywana suma wpłat w najbliższych {stats.prediction.horizon_days} dniach
                    to około <strong>{fmtPLN(stats.prediction.total_predicted)}</strong>.{' '}
                    <em>To NIE oznacza, że te wpłaty rzeczywiście wpłyną — to jedynie przewidywanie na podstawie dotychczasowego ruchu wpłat.</em>
                  </div>
                </div>
                <StatChart kind="line" title="Predykcja wpłat — kolejne dni (szacunek, nie gwarancja)" unit="PLN"
                  valueFormatter={fmtPLN}
                  labels={predLabels} series={[
                    { label: 'Wpłaty rzeczywiste', data: realPart, color: COLOR_MOVEMENT },
                    { label: 'Predykcja wpłat (szacunek)', data: predPart, color: COLOR_PREDICTION },
                  ]} />
              </div>

              <p className="text-xs text-gray-400">
                Zakres (rezerwacje wg utworzenia, wpłaty wg daty wpłaty): {formatDayLabel(stats.range_from)} – {formatDayLabel(stats.range_to)}.
                Predykcja liczona od dziś, niezależnie od zakresu, na podstawie ostatnich {stats.prediction.lookback_days} dni wpłat.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
