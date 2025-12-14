import { CertificateResponse } from './certificateResponse';

export interface CertificateListResponse {
  certificates: CertificateResponse[];
  total: number;
}
