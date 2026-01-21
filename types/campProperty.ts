export interface CampProperty {
  id: number;
  camp_id: number;
  period: string;
  city: string;
  start_date: string;
  end_date: string;
  days_count: number;
  max_participants?: number;
  use_default_diet?: boolean;
  min_age?: number | null;
  max_age?: number | null;
  base_price?: number;
  tag?: string | null;
  registered_count?: number;
  is_full?: boolean;
  is_ended?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}