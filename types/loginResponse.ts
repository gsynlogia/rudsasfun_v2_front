import { User } from './user';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

