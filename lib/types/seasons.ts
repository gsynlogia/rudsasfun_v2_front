/**
 * Typy modułu „Sezony" (lustro Pydantic: api_radsas/app/schemas/season.py).
 * Źródło prawdy = backend; tu trzymamy zgodne typy TS strict dla panelu admina.
 */

export type SeasonPeriod = 'lato' | 'zima';

export interface Season {
  id: number;
  period: SeasonPeriod;
  year: number;
  name: string;
  is_archived: boolean;
  archived_at: string | null;
  turnus_count: number;
  reservation_count: number;
  last_end_date: string | null;
}

export interface SeasonCreate {
  period: SeasonPeriod;
  year: number;
}