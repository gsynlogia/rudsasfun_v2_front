'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  PointElement,
  LineElement,
  LineController,
  ArcElement,
  DoughnutController,
  Filler,
  Title,
  Tooltip,
  Legend,
  type TooltipItem,
} from 'chart.js';
import { useState } from 'react';
import { Chart } from 'react-chartjs-2';

// Rejestracja chart.js — Bar + Line (mixed) + Doughnut (wykres kołowy podsumowujący).
ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, PointElement, LineElement, LineController, ArcElement, DoughnutController, Filler, Title, Tooltip, Legend);

export interface ChartSeries {
  label: string;
  data: number[];
  color: string;                // hex
  type?: 'bar' | 'line';        // override typu serii (mixed) — domyślnie = kind wykresu
}

interface StatChartProps {
  title: string;
  labels: string[];
  series: ChartSeries[];
  unit: string;
  kind?: 'bar' | 'line' | 'doughnut';  // bazowy typ; bar/line: serie po labels; doughnut: segmenty = serie (data[0])
  stacked?: boolean;            // skumulowane słupki
  centerValue?: number;         // doughnut: liczba w środku (np. total rezerwacji); domyślnie suma segmentów
  centerValueText?: string;     // doughnut: GOTOWY tekst w środku (np. sformatowana kwota „7 896 110 PLN") — ma priorytet nad centerValue
  centerLabel?: string;         // doughnut: podpis pod liczbą w środku
  centerTooltip?: string;       // doughnut: dymek na najazd na liczbę w środku
  valueFormatter?: (n: number) => string;  // formatowanie wartości w tooltipach i osi Y (np. kwoty z PLN); brak = surowa liczba + unit
  interactiveLegend?: boolean;  // doughnut: własna KLIKALNA legenda kwotowa pod wykresem (wyłączanie segmentów przelicza środek)
}

/** Hex → rgba z alfą (wypełnienie pod linią). */
function fillColor(hex: string, alpha = 0.12): string {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Generyczny wykres statystyk (chart.js) — N serii, możliwy MIESZANY typ (słupki + linia trendu).
 * Dymek i legenda wbudowane. kind='bar' (rozkład, opcjonalnie stacked) | 'line' (trend).
 * Serie z `type:'line'` rysują się jako linia NAD słupkami (np. trend total na słupkach statusów).
 */
export default function StatChart({ title, labels, series, unit, kind = 'bar', stacked = false, centerValue, centerValueText, centerLabel = 'rezerwacji', centerTooltip, valueFormatter, interactiveLegend = false }: StatChartProps) {
  const [hoverCenter, setHoverCenter] = useState(false);
  // ukryte segmenty (klikalna legenda doughnut) — wyłączenie statusu przelicza środek i wykres
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const fmt = (n: number) => (valueFormatter ? valueFormatter(n) : `${n} ${unit}`);
  // Wykres kołowy (doughnut): każda seria = jeden segment (suma jej danych), kolor segmentu = series.color.
  if (kind === 'doughnut') {
    const segValues = series.map((s) => s.data.reduce((a, b) => a + b, 0));
    const visibleIdx = series.map((_, i) => i).filter((i) => !hidden.has(i));
    // dane do wykresu — gdy klikalna legenda, pokazujemy tylko widoczne segmenty
    const usedIdx = interactiveLegend ? visibleIdx : series.map((_, i) => i);
    const dData = {
      labels: usedIdx.map((i) => series[i].label),
      datasets: [{ data: usedIdx.map((i) => segValues[i]), backgroundColor: usedIdx.map((i) => series[i].color), borderWidth: 1, borderColor: '#fff' }],
    };
    // liczba/tekst w środku: priorytet centerValueText (sformatowany), potem centerValue, potem suma widocznych segmentów
    const visibleSum = usedIdx.reduce((a, i) => a + segValues[i], 0);
    const centerDisplay = interactiveLegend
      ? fmt(visibleSum)                                   // suma widocznych — reaguje na wyłączanie segmentów
      : (centerValueText ?? String(centerValue ?? visibleSum));
    const dOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: !interactiveLegend, position: 'right' as const, labels: { boxWidth: 12, font: { size: 11 } } },
        title: { display: true, text: title, align: 'start' as const, color: '#374151', font: { size: 13, weight: 'bold' as const } },
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<'doughnut'>) => `${ctx.label}: ${fmt(ctx.parsed)}`,
          },
        },
      },
    };
    const toggle = (i: number) => setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      // nie pozwól ukryć wszystkich — środek straciłby sens
      if (next.size >= series.length) return prev;
      return next;
    });
    return (
      <div className="bg-white border border-gray-200 p-4">
        <div style={{ height: 260 }} className="relative">
          <Chart type="doughnut" data={dData} options={dOptions} />
          {/* tekst w środku — TYLKO dla wykresów z liczbą (np. rezerwacje). Dla płatności (interactiveLegend)
              kwota jest POD kółkiem (rozkaz Pana — tylko statystyka płatności). */}
          {!interactiveLegend ? (
            <>
              <div className="absolute left-1/2 top-1/2 -translate-x-[calc(50%+72px)] -translate-y-1/2 flex flex-col items-center pointer-events-none px-2 text-center">
                <span className={`${centerValueText ? 'text-xl' : 'text-2xl'} font-bold text-gray-700 leading-tight`}>{centerDisplay}</span>
                <span className="text-[11px] text-gray-500 mt-0.5">{centerLabel}</span>
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-[calc(50%+72px)] w-20 -translate-y-1/2 h-14 cursor-help"
                onMouseEnter={() => setHoverCenter(true)} onMouseLeave={() => setHoverCenter(false)} />
              {hoverCenter && centerTooltip ? (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-12 z-10 bg-gray-900 text-white text-[11px] rounded px-2 py-1 shadow-lg max-w-[16rem] text-center pointer-events-none">
                  {centerTooltip}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
        {/* kwota POD kółkiem + klikalna legenda kwotowa — wyłączanie statusu przelicza sumę (rozkaz Pana, tylko płatności) */}
        {interactiveLegend ? (
          <div className="mt-3">
            <div className="flex items-center justify-between px-2 py-2 mb-1 border-b border-gray-200" title={centerTooltip}>
              <span className="text-sm font-semibold text-gray-600">{centerLabel}</span>
              <span className="text-xl font-bold text-gray-800">{centerDisplay}</span>
            </div>
            <div className="flex flex-col gap-1.5">
            {series.map((s, i) => {
              const off = hidden.has(i);
              return (
                <button key={s.label} type="button" onClick={() => toggle(i)}
                  className={`flex items-center justify-between gap-3 px-2 py-1 rounded text-sm transition-colors hover:bg-gray-50 ${off ? 'opacity-40' : ''}`}
                  title={off ? 'Kliknij, aby pokazać' : 'Kliknij, aby ukryć'}>
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
                    <span className={off ? 'line-through text-gray-400' : 'text-gray-700'}>{s.label}</span>
                  </span>
                  <span className={`font-semibold ${off ? 'line-through text-gray-400' : 'text-gray-800'}`}>{fmt(segValues[i])}</span>
                </button>
              );
            })}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const datasets = series.map((s) => {
    const t = s.type ?? kind;
    if (t === 'line') {
      return {
        type: 'line' as const, label: s.label, data: s.data, borderColor: s.color,
        backgroundColor: fillColor(s.color), tension: 0.3, fill: false,
        pointRadius: 3, pointHoverRadius: 5, borderWidth: 2.5, order: 0,
      };
    }
    return {
      type: 'bar' as const, label: s.label, data: s.data, backgroundColor: s.color,
      borderRadius: 3, maxBarThickness: 28, order: 1,
    };
  });

  const data = { labels, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'top' as const, align: 'end' as const, labels: { boxWidth: 12, font: { size: 11 } } },
      title: { display: true, text: title, align: 'start' as const, color: '#374151', font: { size: 13, weight: 'bold' as const } },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'bar' | 'line'>) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: { stacked, grid: { display: false }, ticks: { font: { size: 10 } } },
      y: {
        stacked, beginAtZero: true,
        ticks: {
          precision: 0, font: { size: 10 },
          // oś Y: gdy podano formatter kwot — pokaż z odstępami/PLN; inaczej surowa liczba
          callback: valueFormatter ? (v: string | number) => valueFormatter(Number(v)) : undefined,
        },
      },
    },
  };

  return (
    <div className="bg-white border border-gray-200 p-4">
      <div style={{ height: 260 }}>
        <Chart type={kind} data={data} options={options} />
      </div>
    </div>
  );
}
