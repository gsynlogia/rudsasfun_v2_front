export interface User {
  id: number;
  login: string;
  email?: string;
  user_type?: string;
  groups: string[];
  accessible_sections?: string[];
  created_at?: string;
  updated_at?: string;
}

