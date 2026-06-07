'use client';
import { useState, useMemo } from 'react';

interface DateRangeCalendarProps {
  rangeFrom: string;       // YYYY-MM-DD
  rangeTo: string;         // YYYY-MM-DD
  excludedDates: Set<string>;
  onRangeChange: (from: string, to: string) => void;
  onExcludedChange: (excluded: Set<string>) => void;
  onApply: () => void;
  onClear: () => void;
}

const MONTH_NAMES = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
const DAY_NAMES = ['Pn','Wt','Śr','Cz','Pt','Sb','Nd'];

function toYMD(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function DateRangeCalendar({ rangeFrom, rangeTo, excludedDates, onRangeChange, onExcludedChange, onApply, onClear }: DateRangeCalendarProps) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectingStart, setSelectingStart] = useState(!rangeFrom);

  const daysInMonth = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startDay = (first.getDay() + 6) % 7; // Monday=0
    const lastDate = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= lastDate; d++) days.push(new Date(viewYear, viewMonth, d));
    return days;
  }, [viewMonth, viewYear]);

  const isInRange = (d: Date): boolean => {
    if (!rangeFrom || !rangeTo) return false;
    const ymd = toYMD(d);
    return ymd >= rangeFrom && ymd <= rangeTo;
  };

  const isExcluded = (d: Date): boolean => excludedDates.has(toYMD(d));
  const isRangeStart = (d: Date): boolean => rangeFrom === toYMD(d);
  const isRangeEnd = (d: Date): boolean => rangeTo === toYMD(d);

  const handleDayClick = (d: Date) => {
    const ymd = toYMD(d);

    // If no range set or selecting start — set start
    if (!rangeFrom || selectingStart) {
      onRangeChange(ymd, '');
      onExcludedChange(new Set());
      setSelectingStart(false);
      return;
    }

    // If start set but no end — set end
    if (rangeFrom && !rangeTo) {
      let from = rangeFrom;
      let to = ymd;
      if (from > to) [from, to] = [to, from];
      onRangeChange(from, to);
      setSelectingStart(false);
      return;
    }

    // If both set — toggle excluded day (only within range)
    if (isInRange(d)) {
      // Don't allow excluding range start/end
      if (isRangeStart(d) || isRangeEnd(d)) {
        // Click on edge — restart selection
        onRangeChange(ymd, '');
        onExcludedChange(new Set());
        setSelectingStart(false);
        return;
      }
      const next = new Set(excludedDates);
      if (next.has(ymd)) next.delete(ymd); else next.add(ymd);
      onExcludedChange(next);
    } else {
      // Click outside range — restart selection
      onRangeChange(ymd, '');
      onExcludedChange(new Set());
      setSelectingStart(false);
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const rangeInfo = rangeFrom && rangeTo
    ? `${rangeFrom.split('-').reverse().join('.')} — ${rangeTo.split('-').reverse().join('.')}`
    : rangeFrom
      ? `Od: ${rangeFrom.split('-').reverse().join('.')} (wybierz datę końcową)`
      : 'Kliknij dzień początkowy';

  const excludedCount = excludedDates.size;

  return (
    <div className="mb-3 p-3 border border-gray-200 bg-gray-50">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-200 rounded text-gray-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <span className="text-xs font-semibold text-gray-700">{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-200 rounded text-gray-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-0 mb-1">
        {DAY_NAMES.map(dn => (
          <div key={dn} className="text-center text-[10px] font-medium text-gray-400 py-0.5">{dn}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0">
        {daysInMonth.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} className="h-7" />;
          const inRange = isInRange(d);
          const excluded = isExcluded(d);
          const isStart = isRangeStart(d);
          const isEnd = isRangeEnd(d);
          const isToday = toYMD(d) === toYMD(today);

          let bg = 'hover:bg-gray-100';
          let text = 'text-gray-700';
          let border = '';

          if (isStart || isEnd) {
            bg = 'bg-[#03adf0]';
            text = 'text-white font-bold';
          } else if (inRange && !excluded) {
            bg = 'bg-[#03adf0]/15';
            text = 'text-[#03adf0] font-medium';
          } else if (inRange && excluded) {
            bg = 'bg-gray-100';
            text = 'text-gray-300 line-through';
          }

          if (isToday && !isStart && !isEnd) {
            border = 'ring-1 ring-[#03adf0]';
          }

          return (
            <button
              key={toYMD(d)}
              type="button"
              onClick={() => handleDayClick(d)}
              className={`h-7 text-xs rounded ${bg} ${text} ${border} transition-colors`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      {/* Info + buttons */}
      <div className="mt-2 pt-2 border-t border-gray-200">
        <div className="text-[10px] text-gray-500 mb-2">
          {rangeInfo}
          {excludedCount > 0 && <span className="ml-1 text-orange-600">({excludedCount} dni wykluczone)</span>}
        </div>
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClear} className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded">
            Wyczyść
          </button>
          {rangeFrom && rangeTo && (
            <button type="button" onClick={onApply} className="px-3 py-1.5 text-xs text-white bg-[#03adf0] hover:bg-[#0288c7] rounded">
              Zastosuj
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
