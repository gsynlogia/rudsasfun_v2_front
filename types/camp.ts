import { CampProperty } from './campProperty';

export interface Camp {
  id: number;
  name: string;
  description?: string;
  period?: string;
  created_at?: string | null;
  updated_at?: string | null;
  // Optional properties from CampProperty (when camp is returned with property data)
  start_date?: string;
  end_date?: string;
  city?: string;
  days_count?: number;
  // Optional properties array (when camp is returned with multiple properties)
  properties?: CampProperty[] | null;
}
