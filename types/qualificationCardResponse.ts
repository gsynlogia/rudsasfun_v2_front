export interface QualificationCardResponse {
  reservation_id: number;
  card_filename: string;
  card_path: string;
  created_at: string;
  camp_name: string | null;
  property_name: string | null;
  participant_first_name: string | null;
  participant_last_name: string | null;
}

