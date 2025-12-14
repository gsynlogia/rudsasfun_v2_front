export interface QualificationCardResponse {
  id: number;
  reservation_id: number;
  file_name: string;
  file_path: string;
  source: string;
  uploaded_at: string;
  created_at: string;
  qualification_card_status?: string | null;
  rejection_reason?: string | null;
  file_url?: string | null;
  participant_first_name?: string | null;
  participant_last_name?: string | null;
  camp_name?: string | null;
  card_filename?: string | null;
}
