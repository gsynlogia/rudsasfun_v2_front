/**
 * Serwis archiwum wersji umów.
 * Zapis snapshotu przed edycją; lista wersji; pobranie wersji do podglądu.
 */
import { authenticatedApiCall } from '@/utils/api-auth';

export interface ContractArchiveVersionItem {
  id: number;
  reservation_id: number;
  user_id: number | null;
  created_at: string | null;
}

export interface ContractArchiveVersion {
  id: number;
  reservation_id: number;
  user_id: number;
  snapshot: Record<string, unknown>;
  created_at: string | null;
}

export const contractArchiveService = {
  /** Zapisuje bieżący stan rezerwacji w archiwum (wywołać przed PATCH). */
  async create(reservationId: number, snapshot: Record<string, unknown>): Promise<{ id: number; created_at: string | null }> {
    return authenticatedApiCall<{ id: number; created_at: string | null }>(
      '/api/contract-archive',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, snapshot }),
      },
    );
  },

  /** Lista wersji umowy dla rezerwacji. */
  async list(reservationId: number): Promise<ContractArchiveVersionItem[]> {
    return authenticatedApiCall<ContractArchiveVersionItem[]>(
      `/api/contract-archive?reservation_id=${reservationId}`,
    );
  },

  /** Pobiera jedną wersję (snapshot do podglądu). */
  async get(archiveId: number): Promise<ContractArchiveVersion> {
    return authenticatedApiCall<ContractArchiveVersion>(`/api/contract-archive/${archiveId}`);
  },
};