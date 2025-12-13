import { CampProperty } from './campProperty';

export interface Camp {
  id: number;
  name: string;
  period?: string;
  city?: string;
  start_date?: string;
  end_date?: string;
  days_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
  properties?: CampProperty[] | null;
}

