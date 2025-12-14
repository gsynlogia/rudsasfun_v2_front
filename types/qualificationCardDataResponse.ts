export interface QualificationCardDataResponse {
  id: number;
  reservation_id: number;
  participant_birth_date: string | null;
  participant_birth_place: string | null;
  participant_pesel: string | null;
  participant_street: string | null;
  participant_postal_code: string | null;
  participant_city_address: string | null;
  parent1_first_name: string | null;
  parent1_last_name: string | null;
  parent1_street: string | null;
  parent1_postal_code: string | null;
  parent1_city: string | null;
  parent1_phone: string | null;
  parent1_email: string | null;
  parent2_first_name: string | null;
  parent2_last_name: string | null;
  parent2_street: string | null;
  parent2_postal_code: string | null;
  parent2_city: string | null;
  parent2_phone: string | null;
  parent2_email: string | null;
  is_completed: number;
  created_at: string;
  updated_at: string;
}

export interface QualificationCardDataUpdate {
  participant_birth_date?: string | null;
  participant_birth_place?: string | null;
  participant_pesel?: string | null;
  participant_street?: string | null;
  participant_postal_code?: string | null;
  participant_city_address?: string | null;
  parent1_first_name?: string | null;
  parent1_last_name?: string | null;
  parent1_street?: string | null;
  parent1_postal_code?: string | null;
  parent1_city?: string | null;
  parent1_phone?: string | null;
  parent1_email?: string | null;
  parent2_first_name?: string | null;
  parent2_last_name?: string | null;
  parent2_street?: string | null;
  parent2_postal_code?: string | null;
  parent2_city?: string | null;
  parent2_phone?: string | null;
  parent2_email?: string | null;
}

