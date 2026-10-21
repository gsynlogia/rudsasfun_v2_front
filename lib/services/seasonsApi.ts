/**
 * API client modułu „Sezony" (prefix /api/seasons) — lista, dodanie i archiwizacja sezonów (Obozy).
 */
import type { Season, SeasonCreate } from '@/lib/types/seasons';
import { authenticatedApiCall } from '@/utils/api-auth';

const BASE = '/api/seasons';

export function listSeasons(): Promise<Season[]> {
  return authenticatedApiCall<Season[]>(BASE);
}

export function createSeason(data: SeasonCreate): Promise<Season> {
  return authenticatedApiCall<Season>(BASE, { method: 'POST', body: JSON.stringify(data) });
}

export function archiveSeason(seasonId: number): Promise<Season> {
  return authenticatedApiCall<Season>(`${BASE}/${seasonId}/archive`, { method: 'POST' });
}