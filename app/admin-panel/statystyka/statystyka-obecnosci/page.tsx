'use client';

import { BarChart3, Users, UserCog, RefreshCw, Clock, LogIn, Activity, Calendar, Radio } from 'lucide-react';
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

interface DayPoint { date: string; count: number }
interface PresenceBucket {
  sessions_count: number;
  unique_users: number;
  total_seconds: number;
  avg_seconds: number;
  currently_active: number;
  by_hour_per_day: Record<string, number[]>;  // { 'YYYY-MM-DD': [24] } — rozkład godzin OSOBNO per dzień
  by_day: DayPoint[];
}
interface PresenceStats {
  client: PresenceBucket;
  staff: PresenceBucket;
  range_from: string;
  range_to: string;
  gap_seconds: number;
}

// Kolory serii (spójne z resztą panelu: klienci niebiescy, pracownicy zieloni)
const COLOR_CLIENT = '#03adf0';
const COLOR_STAFF = '#10b981';

// Minimalny czas trwania wskaźnika przeładowania — wyraźny feedback po „Zastosuj"/„Odśwież"
// nawet przy szybkiej odpowiedzi z localhost (rozkaz Pana 2026-06-30).
const MIN_RELOAD_MS = 400;

// Szybkie presety zakresu — „ostatnie N dni" = od (dziś − (N−1)) do dziś. back = N−1.
const PRESETS = [
  { label: 'Dzisiaj', back: 0 },
  { label: '3 dni', back: 2 },
  { label: '5 dni', back: 4 },
  { label: '7 dni', back: 6 },
  { label: '10 dni', back: 9 },
  { label: '14 dni', back: 13 },
];

/** Sekundy → po polsku: „0 s", „5 min", „1 godz 20 min". */
function formatDuration(seconds: number): string {
  if (!seconds || seconds < 60) return `${Math.max(0, Math.round(seconds))} s`;
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h} godz ${m} min` : `${h} godz`;
}

function formatRangeLabel(from: string, to: string): string {
  if (!from || !to) return 'Wybierz zakres';
  return from === to ? formatDayLabel(from) : `${formatDayLabel(from)} – ${formatDayLabel(to)}`;
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

export default function StatystykaPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PresenceStats | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(''); // dzień dla wykresu „Godziny ruchu"
  const [rangeFrom, setRangeFrom] = useState(daysAgo(6));
  const [rangeTo, setRangeTo] = useState(daysAgo(0));
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const calRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (from: string, to: string, excl: Set<string>) => {
    setLoading(true);
    const startedAt = performance.now();
    try {
      const params = new URLSearchParams({ date_from: from, date_to: to });
      if (excl.size > 0) params.set('excluded', Array.from(excl).join(','));
      const res = await authenticatedFetch(`/api/admin/presence/statistics?${params.toString()}`);
      if (res.status === 403) {
        setError('Brak dostępu — wymagane uprawnienie „Statystyki" (skontaktuj się z administratorem).');
        setStats(null);
        return;
      }
      if (!res.ok) throw new Error('blad');
      setError(null);
      setStats(await res.json());
    } catch {
      setError('Nie udało się pobrać statystyk.');
    } finally {
      // utrzymaj wskaźnik min. MIN_RELOAD_MS — wyraźny feedback nawet przy szybkiej odpowiedzi
      const elapsed = performance.now() - startedAt;
      if (elapsed < MIN_RELOAD_MS) await new Promise((r) => setTimeout(r, MIN_RELOAD_MS - elapsed));
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(rangeFrom, rangeTo, excluded); }, [load]); // pierwsze ładowanie

  // zamknij kalendarz po kliknięciu poza nim
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (calendarOpen && calRef.current && !calRef.current.contains(e.target as Node)) setCalendarOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [calendarOpen]);

  const applyRange = () => { setCalendarOpen(false); load(rangeFrom, rangeTo, excluded); };
  const clearRange = () => {
    const f = daysAgo(6), t = daysAgo(0);
    setRangeFrom(f); setRangeTo(t); setExcluded(new Set());
    load(f, t, new Set());
  };
  // szybki preset „ostatnie N dni" (back = N−1; Dzisiaj = 0)
  const applyPreset = (back: number) => {
    const f = daysAgo(back), t = daysAgo(0);
    setRangeFrom(f); setRangeTo(t); setExcluded(new Set()); setCalendarOpen(false);
    load(f, t, new Set());
  };
  const isPresetActive = (back: number) => rangeFrom === daysAgo(back) && rangeTo === daysAgo(0) && excluded.size === 0;

  // Serie dla wykresu „Godziny ruchu" — dla WYBRANEGO dnia (selectedDay), nie zagregowane
  const hourLabels = Array.from({ length: 24 }, (_, h) => `${h}:00`);
  const hourClient = stats?.client.by_hour_per_day[selectedDay] ?? Array<number>(24).fill(0);
  const hourStaff = stats?.staff.by_hour_per_day[selectedDay] ?? Array<number>(24).fill(0);

  const dayMap = (b: DayPoint[] | undefined) => new Map((b ?? []).map((d) => [d.date, d.count]));
  const clientDays = dayMap(stats?.client.by_day);
  const staffDays = dayMap(stats?.staff.by_day);
  // WSZYSTKIE dni z wybranego zakresu (ciągła oś — też dni z 0 wizyt), zgodnie z kalendarzem
  const rangeDays = useMemo(() => (stats ? enumerateDays(stats.range_from, stats.range_to) : []), [stats]);
  const dayLabels = rangeDays.map(formatDayLabel);
  const dayClient = rangeDays.map((d) => clientDays.get(d) ?? 0);
  const dayStaff = rangeDays.map((d) => staffDays.get(d) ?? 0);
  // opcje selecta dnia (dla wykresu godzin) — pełne daty z zakresu kalendarza
  const dayOptions = rangeDays.map((d) => ({ value: d, label: d.split('-').reverse().join('.') }));

  // po zmianie zakresu ustaw wybrany dzień na ostatni z zakresu (jeśli bieżący poza zakresem)
  useEffect(() => {
    if (rangeDays.length > 0 && !rangeDays.includes(selectedDay)) {
      setSelectedDay(rangeDays[rangeDays.length - 1]);
    }
  }, [rangeDays, selectedDay]);

  return (
    <AdminLayout>
      <AdminPageHeader title="Statystyka" />
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            {/* Breadcrumb — „Statystyka" to kategoria; bieżąca podstrona = wybrana w selekcie */}
            <nav className="text-xs text-gray-400 flex items-center gap-1.5 mb-1" aria-label="Ścieżka">
              <Link href="/admin-panel/statystyka" className="hover:text-gray-600">Statystyka</Link>
              <span className="text-gray-300">/</span>
              <span className="text-gray-600 font-medium">Statystyka obecności</span>
            </nav>
            {/* Select rodzaju statystyki (custom, ładny dropdown) — domyślnie „Statystyka obecności"; zmiana → SPA */}
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#03adf0] flex-shrink-0" />
              <StyledDropdown
                size="sm"
                ariaLabel="Rodzaj statystyki"
                minWidthPx={210}
                value="statystyka-obecnosci"
                options={STAT_TYPES.map((t) => ({ value: t.slug, label: t.label }))}
                onChange={(slug) => router.push(`/admin-panel/statystyka/${slug}`)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* szybkie presety zakresu */}
            <div className="flex border border-gray-200 overflow-hidden">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.back)}
                  className={`px-2.5 py-1.5 text-xs whitespace-nowrap transition-colors border-r border-gray-200 last:border-r-0 ${isPresetActive(p.back) ? 'bg-[#03adf0] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {/* wybór zakresu dat — profesjonalny kalendarz (ten sam co w filtrach) */}
            <div className="relative" ref={calRef}>
              <button
                onClick={() => setCalendarOpen((o) => !o)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <Calendar className="w-4 h-4 text-[#03adf0]" />
                {formatRangeLabel(rangeFrom, rangeTo)}
              </button>
              {calendarOpen && (
                <div className="absolute right-0 mt-1 z-30 bg-white border border-gray-200 shadow-xl">
                  <DateRangeCalendar
                    size="lg"
                    rangeFrom={rangeFrom}
                    rangeTo={rangeTo}
                    excludedDates={excluded}
                    onRangeChange={(f, t) => { setRangeFrom(f); setRangeTo(t); }}
                    onExcludedChange={setExcluded}
                    onApply={applyRange}
                    onClear={clearRange}
                  />
                </div>
              )}
            </div>
            <Link href="/admin-panel/online-klienci" className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 hover:bg-gray-50 transition-colors">
              <Radio className="w-4 h-4 text-green-500" /> Kto jest online
            </Link>
            <button onClick={() => load(rangeFrom, rangeTo, excluded)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 transition-colors">
              <RefreshCw className="w-4 h-4" /> Odśwież
            </button>
          </div>
        </div>

        {loading && !stats ? <p className="text-gray-500">Ładowanie…</p> : null}
        {error ? (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        {stats && !error ? (
          <div className="relative">
            <StatsReloadOverlay visible={loading} />
            <div className="space-y-6">
            {/* Karty metryk — klienci */}
            <section>
              <h2 className="text-base font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Users className="w-5 h-5" style={{ color: COLOR_CLIENT }} /> Klienci
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard icon={<LogIn className="w-5 h-5 text-white" />} label="Wizyty" value={String(stats.client.sessions_count)} accent="bg-[#03adf0]" />
                <StatCard icon={<Users className="w-5 h-5 text-white" />} label="Unikalni klienci" value={String(stats.client.unique_users)} accent="bg-[#03adf0]" />
                <StatCard icon={<Activity className="w-5 h-5 text-white" />} label="Online teraz" value={String(stats.client.currently_active)} accent="bg-[#03adf0]" />
                <StatCard icon={<Clock className="w-5 h-5 text-white" />} label="Średni czas wizyty" value={formatDuration(stats.client.avg_seconds)} accent="bg-[#03adf0]" />
                <StatCard icon={<Clock className="w-5 h-5 text-white" />} label="Łączny czas" value={formatDuration(stats.client.total_seconds)} accent="bg-[#03adf0]" />
              </div>
            </section>

            {/* Karty metryk — pracownicy */}
            <section>
              <h2 className="text-base font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <UserCog className="w-5 h-5" style={{ color: COLOR_STAFF }} /> Pracownicy
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard icon={<LogIn className="w-5 h-5 text-white" />} label="Wizyty" value={String(stats.staff.sessions_count)} accent="bg-emerald-500" />
                <StatCard icon={<Users className="w-5 h-5 text-white" />} label="Unikalni pracownicy" value={String(stats.staff.unique_users)} accent="bg-emerald-500" />
                <StatCard icon={<Activity className="w-5 h-5 text-white" />} label="Online teraz" value={String(stats.staff.currently_active)} accent="bg-emerald-500" />
                <StatCard icon={<Clock className="w-5 h-5 text-white" />} label="Średni czas wizyty" value={formatDuration(stats.staff.avg_seconds)} accent="bg-emerald-500" />
                <StatCard icon={<Clock className="w-5 h-5 text-white" />} label="Łączny czas" value={formatDuration(stats.staff.total_seconds)} accent="bg-emerald-500" />
              </div>
            </section>

            {/* Godziny ruchu — OBECNOŚĆ w godzinach wybranego dnia (sesja liczona w KAŻDEJ obejmowanej godzinie) */}
            <div>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Godziny ruchu — obecność w wybranym dniu</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Dzień:</span>
                  <StyledDropdown
                    ariaLabel="Wybór dnia statystyki godzinowej"
                    minWidthPx={150}
                    value={selectedDay}
                    options={dayOptions}
                    onChange={setSelectedDay}
                  />
                </div>
              </div>
              <StatChart kind="bar" title={`Obecność wg godzin — ${selectedDay.split('-').reverse().join('.')}`} unit="obecnych"
                labels={hourLabels} series={[
                  { label: 'Klienci', data: hourClient, color: '#03adf0' },
                  { label: 'Pracownicy', data: hourStaff, color: '#10b981' },
                ]} />
            </div>
            {/* Wizyty wg dnia — cały zakres, jako TREND (wykres liniowy) */}
            <StatChart kind="line" title="Wizyty wg dnia (trend)" unit="wizyt"
              labels={dayLabels} series={[
                { label: 'Klienci', data: dayClient, color: '#03adf0' },
                { label: 'Pracownicy', data: dayStaff, color: '#10b981' },
              ]} />

            <p className="text-xs text-gray-400">
              Zakres: {formatDayLabel(stats.range_from)} – {formatDayLabel(stats.range_to)} · wizyta kończy się po {stats.gap_seconds} s bez sygnału obecności.
            </p>
            </div>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
