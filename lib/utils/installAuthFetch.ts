import { getApiBaseUrlRuntime } from '@/utils/api-config';

const TOKEN_KEY = 'radsasfun_auth_token';

/**
 * Dołącza token zalogowanego użytkownika do wszystkich zapytań wysyłanych do naszego API.
 * Panel ma kilkadziesiąt zwykłych wywołań fetch bez tokena; serwer traktował je jak anonimowe,
 * więc po włączeniu kontroli uprawnień (ACL) te ekrany dostawałyby odmowę.
 * Token idzie wyłącznie pod adres API, nigdy na inne hosty.
 */
export function installAuthFetch(): void {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith(`${getApiBaseUrlRuntime()}/api/`)) {
      return nativeFetch(input, init);
    }
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    let token: string | null = null;
    try {
      token = window.localStorage.getItem(TOKEN_KEY);
    } catch {
      token = null;
    }
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return nativeFetch(input, { ...init, headers });
  };
}
