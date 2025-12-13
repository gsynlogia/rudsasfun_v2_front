import { ValidationErrorDetail } from './validationErrorDetail';

export interface ValidationErrorResponse {
  error: string;
  details: ValidationErrorDetail[];
}

