/**
 * Authentication Helper Functions for Testing
 * Provides utilities for logging in during tests without sending emails
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface MagicLinkResponse {
  token: string;
  login_url: string;
  expires_at: string;
}

export interface AdminLoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    login: string;
    email: string;
    user_type: string;
    groups: string[];
  };
}

/**
 * Get magic link for testing without sending email
 * @param email Email address to generate magic link for
 * @returns Magic link URL
 */
export async function getMagicLinkForTesting(email: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/test/auth/magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get magic link: ${response.status} ${errorText}`);
    }

    const data: MagicLinkResponse = await response.json();
    return data.login_url;
  } catch (error) {
    console.error('[getMagicLinkForTesting] Error:', error);
    throw error;
  }
}

/**
 * Login as admin using test endpoint
 * Returns JWT token for admin:admin user
 * @returns JWT access token
 */
export async function loginAsAdmin(): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/test/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to login as admin: ${response.status} ${errorText}`);
    }

    const data: AdminLoginResponse = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('[loginAsAdmin] Error:', error);
    throw error;
  }
}

/**
 * Set authentication token in browser storage
 * @param page Playwright page object
 * @param token JWT token
 */
export async function setAuthToken(page: any, token: string): Promise<void> {
  await page.evaluate((t: string) => {
    localStorage.setItem('token', t);
  }, token);
}

/**
 * Login as admin and set token in browser storage
 * @param page Playwright page object
 * @returns JWT access token
 */
export async function loginAsAdminAndSetToken(page: any): Promise<string> {
  const token = await loginAsAdmin();
  await setAuthToken(page, token);
  return token;
}

/**
 * Navigate to page with authentication
 * @param page Playwright page object
 * @param url URL to navigate to
 * @param useAdmin Whether to login as admin first
 */
export async function navigateWithAuth(
  page: any,
  url: string,
  useAdmin: boolean = true
): Promise<void> {
  if (useAdmin) {
    await loginAsAdminAndSetToken(page);
  }
  await page.goto(url);
}






