import { User } from './user';

export interface MagicLinkVerifyResponse {
  access_token: string;
  token_type: string;
  user: User;
}

