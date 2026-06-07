export interface CertificateResponse {
  id: number;
  reservation_id: number;
  file_path: string;
  file_name: string;
  uploaded_at: string;
  updated_at: string;
  file_url?: string | null;
}