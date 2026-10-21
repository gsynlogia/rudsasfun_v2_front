'use client';

import { Archive, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import UniversalModal from '@/components/admin/UniversalModal';
import { useToast } from '@/components/ToastContainer';
import { archiveSeason, createSeason, listSeasons } from '@/lib/services/seasonsApi';
import type { Season, SeasonPeriod } from '@/lib/types/seasons';
import { SEASON_PERIOD_OPTIONS } from '@/lib/utils/seasons';

interface SeasonsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Po archiwizacji lista obozów musi pobrać nowe znaczniki season_archived turnusów. */
  onArchived: () => void;
}

const YEAR_PATTERN = /^[0-9]{4}$/;
const BUTTON = 'flex items-center gap-2 min-h-10 px-4 py-2 text-sm font-medium transition-colors duration-200 disabled:opacity-50';

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/** Obozy → Sezony: lista sezonów z liczbami, dodanie sezonu, archiwizacja zakończonego sezonu. */
export default function SeasonsModal({ isOpen, onClose, onArchived }: SeasonsModalProps) {
  const { showSuccess, showError } = useToast();
  const [seasons, setSeasons] = useState<Season[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toArchive, setToArchive] = useState<Season | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setSeasons(await listSeasons());
    } catch (err) {
      setLoadError(errorMessage(err, 'Nie udało się pobrać sezonów'));
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setToArchive(null);
    void load();
  }, [isOpen, load]);

  const handleCreate = async (period: SeasonPeriod, year: number) => {
    setBusy(true);
    try {
      const created = await createSeason({ period, year });
      showSuccess(`Dodano sezon ${created.name}`);
      await load();
    } catch (err) {
      showError(errorMessage(err, 'Nie udało się dodać sezonu'));
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async (season: Season) => {
    setBusy(true);
    try {
      const archived = await archiveSeason(season.id);
      showSuccess(`Zarchiwizowano sezon ${archived.name}`);
      setToArchive(null);
      await load();
      onArchived();
    } catch (err) {
      showError(errorMessage(err, 'Nie udało się zarchiwizować sezonu'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <UniversalModal isOpen={isOpen} title="Sezony" onClose={onClose}>
      <div className="space-y-5">
        {loadError && <p role="alert" className="text-sm text-red-700">{loadError}</p>}
        {!loadError && seasons === null && (
          <div className="h-24 animate-pulse bg-gray-100" aria-hidden="true" />
        )}
        {seasons && seasons.length === 0 && <p className="text-sm text-gray-500">Brak sezonów</p>}
        {seasons && seasons.length > 0 && (
          <SeasonsTable seasons={seasons} busy={busy} onArchive={setToArchive} />
        )}
        {toArchive && (
          <ArchiveConfirm
            season={toArchive}
            busy={busy}
            onConfirm={() => void handleArchive(toArchive)}
            onCancel={() => setToArchive(null)}
          />
        )}
        <AddSeasonForm busy={busy} onAdd={handleCreate} onInvalid={showError} />
      </div>
    </UniversalModal>
  );
}

interface SeasonsTableProps {
  seasons: Season[];
  busy: boolean;
  onArchive: (season: Season) => void;
}

function SeasonsTable({ seasons, busy, onArchive }: SeasonsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600 border-b">
            <th className="py-2 pr-3 font-medium">Sezon</th>
            <th className="py-2 pr-3 font-medium">Turnusy</th>
            <th className="py-2 pr-3 font-medium">Rezerwacje</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2"><span className="sr-only">Akcje</span></th>
          </tr>
        </thead>
        <tbody>
          {seasons.map((season) => (
            <tr key={season.id} className="border-b last:border-b-0">
              <td className="py-2 pr-3 font-medium text-gray-900">{season.name}</td>
              <td className="py-2 pr-3">{season.turnus_count}</td>
              <td className="py-2 pr-3">{season.reservation_count}</td>
              <td className="py-2 pr-3">{season.is_archived ? 'Archiwum' : 'Bieżący'}</td>
              <td className="py-2 text-right">
                {!season.is_archived && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onArchive(season)}
                    className={`${BUTTON} ml-auto border-2 border-gray-300 bg-white text-gray-800 hover:border-[#03adf0]`}
                    style={{ borderRadius: 0, cursor: 'pointer' }}
                  >
                    <Archive className="w-4 h-4" aria-hidden="true" />
                    Archiwizuj
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ArchiveConfirmProps {
  season: Season;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ArchiveConfirm({ season, busy, onConfirm, onCancel }: ArchiveConfirmProps) {
  return (
    <div role="alertdialog" aria-label={`Archiwizacja sezonu ${season.name}`} className="border-2 border-amber-400 bg-amber-50 p-4 space-y-3">
      <p className="text-sm font-medium text-gray-900">Archiwizować sezon {season.name}?</p>
      <p className="text-sm text-gray-700">
        Rezerwacje tego sezonu przejdą do „Archiwalne”, a jego turnusy znikną z oferty dla klientów.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={`${BUTTON} bg-[#03adf0] text-white hover:bg-[#0288c7]`}
          style={{ borderRadius: 0, cursor: 'pointer' }}
        >
          <Archive className="w-4 h-4" aria-hidden="true" />
          Archiwizuj
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className={`${BUTTON} border-2 border-gray-300 bg-white text-gray-800`}
          style={{ borderRadius: 0, cursor: 'pointer' }}
        >
          Anuluj
        </button>
      </div>
    </div>
  );
}

interface AddSeasonFormProps {
  busy: boolean;
  onAdd: (period: SeasonPeriod, year: number) => Promise<void>;
  onInvalid: (message: string) => void;
}

function AddSeasonForm({ busy, onAdd, onInvalid }: AddSeasonFormProps) {
  const [period, setPeriod] = useState<SeasonPeriod>('zima');
  const [year, setYear] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!YEAR_PATTERN.test(year)) {
      onInvalid('Podaj rok, np. 2027');
      return;
    }
    void onAdd(period, Number(year));
  };

  return (
    <form onSubmit={handleSubmit} className="border-t pt-4 flex flex-wrap items-end gap-3">
      <fieldset>
        <legend className="block text-sm font-medium text-gray-700 mb-2">Okres</legend>
        <div className="flex gap-2">
          {SEASON_PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={period === option.value}
              onClick={() => setPeriod(option.value)}
              className={`${BUTTON} border-2 ${
                period === option.value
                  ? 'border-[#03adf0] bg-[#03adf0] text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-[#03adf0]'
              }`}
              style={{ borderRadius: 0, cursor: 'pointer' }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="season-year" className="block text-sm font-medium text-gray-700 mb-2">Rok</label>
        <input
          id="season-year"
          type="number"
          step={1}
          value={year}
          onChange={(event) => setYear(event.target.value)}
          className="w-28 min-h-10 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className={`${BUTTON} bg-[#03adf0] text-white hover:bg-[#0288c7]`}
        style={{ borderRadius: 0, cursor: 'pointer' }}
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        Dodaj sezon
      </button>
    </form>
  );
}