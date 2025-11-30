/**
 * Authentication Service
 * Singleton service for managing JWT tokens and authentication state
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    login: string;
    groups: string[];
    accessible_sections?: string[];
    created_at?: string;
    updated_at?: string;
  };
}

export interface User {
  id: number;
  login: string;
  groups: string[];
  accessible_sections?: string[];
  created_at?: string;
  updated_at?: string;
}

class AuthService {
  private static instance: AuthService;
  private tokenKey = 'radsasfun_auth_token';
  private userKey = 'radsasfun_auth_user';

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Login user and store token
   */
  async login(login: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ login, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Invalid login or password' }));
      throw new Error(error.detail || 'Login failed');
    }

    const data: LoginResponse = await response.json();
    
    // Store token and user info
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.tokenKey, data.access_token);
      localStorage.setItem(this.userKey, JSON.stringify(data.user));
    }

    return data;
  }

  /**
   * Logout user
   */
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem(this.userKey);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  /**
   * Check if user has admin group
   */
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.groups?.includes('admin') || false;
  }

  /**
   * Get authorization header for API requests
   */
  getAuthHeader(): { Authorization: string } | {} {
    const token = this.getToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Verify token with backend
   */
  async verifyToken(): Promise<User | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          ...this.getAuthHeader(),
        },
      });

      if (!response.ok) {
        this.logout();
        return null;
      }

      const user: User = await response.json();
      
      // Update stored user info
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.userKey, JSON.stringify(user));
      }

      return user;
    } catch {
      this.logout();
      return null;
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();


