'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

import Footer from '@/components/Footer';
import HeaderTop from '@/components/HeaderTop';
import { authService } from '@/lib/services/AuthService';
import { magicLinkService } from '@/lib/services/MagicLinkService';
import { sendAuthTelemetry } from '@/lib/services/AuthTelemetryService';
import { DEFAULT_POST_LOGIN_REDIRECT } from '@/lib/auth-constants';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [useMagicLink, setUseMagicLink] = useState(() =>
    typeof window !== 'undefined' ? window.location.hash !== '#pass' : true
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Tryb z hasła: URL z #pass → formularz hasła; bez hasha → Magic Link. Przy #pass chowamy zielony alert.
  useEffect(() => {
    const syncFromHash = () => {
      const isPass = window.location.hash === '#pass';
      setUseMagicLink(!isPass);
      if (isPass) setSuccess(false);
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  // Email z paska adresu (?email=...) — po odświeżeniu formularz ma uzupełniony adres
  useEffect(() => {
    const e = searchParams?.get('email');
    if (e != null && e !== '') setEmail(e);
  }, [searchParams]);

  // Get redirect URL from query params; default = strona rezerwacji klienta
  const redirectUrl = searchParams?.get('redirect') || DEFAULT_POST_LOGIN_REDIRECT;
  const registerUrl = redirectUrl && redirectUrl !== '/' && redirectUrl.startsWith('/')
    ? `/register?redirect=${encodeURIComponent(redirectUrl)}`
    : '/register';

  // Redirect if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      if (authService.isAuthenticated()) {
        const user = await authService.verifyToken();
        if (user) {
          // User is authenticated, redirect to intended page or default
          const finalRedirect = redirectUrl && redirectUrl !== '/' && redirectUrl.startsWith('/')
            ? redirectUrl
            : DEFAULT_POST_LOGIN_REDIRECT;
          router.replace(finalRedirect);
        } else {
          authService.logout();
        }
      }
    };
    checkAuth();
  }, [router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sendAuthTelemetry({
      email: email || undefined,
      event_type: 'login_submit_clicked',
      auth_method: useMagicLink ? 'magic_link' : 'password',
      details: 'Użytkownik nacisnął przycisk Zaloguj (niezależnie od metody).',
    });
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      if (useMagicLink) {
        await magicLinkService.requestMagicLink(email, redirectUrl);
        setSuccess(true);
        const params = new URLSearchParams(window.location.search);
        params.set('email', email);
        window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}#send-link`);
      } else {
        const data = await magicLinkService.loginPassword(email, password);
        authService.storeMagicLinkAuth(data.access_token, data.user);
        const finalRedirect = redirectUrl && redirectUrl !== '/' && redirectUrl.startsWith('/')
          ? redirectUrl
          : data.redirect_url || DEFAULT_POST_LOGIN_REDIRECT;
        router.replace(finalRedirect);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd logowania';
      if (message.includes('nie istnieje')) {
        const params = new URLSearchParams();
        if (email) params.set('email', email);
        if (redirectUrl && redirectUrl !== '/' && redirectUrl.startsWith('/')) params.set('redirect', redirectUrl);
        router.replace(`/register${params.toString() ? `?${params.toString()}` : ''}`);
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full" style={{ overflow: 'visible', position: 'relative' }}>
      <HeaderTop />

      <main className="max-w-container mx-auto px-3 sm:px-6 py-8 sm:py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center">
              Logowanie
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mb-4 text-center">
              Zaloguj się linkiem (Magic Link) lub wybierz logowanie hasłem
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mb-6">
              <p className="text-xs sm:text-sm text-yellow-800">
                <strong>Uwaga:</strong> Tylko poniższy adres e-mail będzie służył do obsługi i wglądu w rezerwacje. Loguj się zawsze tym samym adresem.
              </p>
            </div>

            {success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800 mb-3">
                  <strong>Email wysłany!</strong> Sprawdź swoją skrzynkę pocztową i kliknij w link, aby się zalogować.
                </p>
                <p className="text-sm text-green-800">
                  Jeśli nie przyszedł mail, nie przejmuj się — możesz zalogować się za pomocą hasła.{' '}
                  <a
                    href={`/login?email=${encodeURIComponent(email)}${redirectUrl !== '/' && redirectUrl.startsWith('/') ? `&redirect=${encodeURIComponent(redirectUrl)}` : ''}#pass`}
                    onClick={() => {
                      sendAuthTelemetry({
                        email: email || undefined,
                        event_type: 'switched_to_password_mode',
                        auth_method: 'password',
                        details: 'Użytkownik z ekranu sukcesu (Magic Link wysłany) kliknął link do logowania hasłem.',
                      });
                    }}
                    className="font-medium underline hover:text-green-900 focus:outline-none focus:underline"
                  >
                    Zaloguj się hasłem
                  </a>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Adres e-mail
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => {
                      if (email.trim()) {
                        if (useMagicLink) {
                          sendAuthTelemetry({
                            email: email.trim(),
                            event_type: 'magic_link_email_filled',
                            auth_method: 'magic_link',
                            details: 'Użytkownik wprowadził adres e-mail, ale jeszcze nie kliknął zaloguj (tryb Magic Link).',
                          });
                        } else {
                          sendAuthTelemetry({
                            email: email.trim(),
                            event_type: 'password_mode_email_filled',
                            auth_method: 'password',
                            details: 'Użytkownik wpisał e-mail w trybie hasła.',
                          });
                        }
                      }
                    }}
                    required
                    disabled={loading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="twoj@email.com"
                  />
                </div>
                {!useMagicLink && (
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Hasło
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => {
                        if (password.length > 0) {
                          sendAuthTelemetry({
                            email: email || undefined,
                            event_type: 'password_mode_password_filled',
                            auth_method: 'password',
                            details: 'Użytkownik wpisał hasło w trybie hasła (nie wysyłamy hasła!).',
                          });
                          if (email.trim()) {
                            sendAuthTelemetry({
                              email: email.trim(),
                              event_type: 'password_form_ready_unsubmitted',
                              auth_method: 'password',
                              details: 'Użytkownik wpisał e-mail i hasło, ale nie kliknął Zaloguj.',
                            });
                          }
                        }
                      }}
                      required={!useMagicLink}
                      disabled={loading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Hasło"
                    />
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email || (!useMagicLink && !password)}
                  className="w-full bg-[#03adf0] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#0288c7] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading
                    ? (useMagicLink ? 'Wysyłanie...' : 'Logowanie...')
                    : useMagicLink
                      ? 'Wyślij link logowania'
                      : 'Zaloguj'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nextMagicLink = !useMagicLink;
                    setUseMagicLink(nextMagicLink);
                    setError(null);
                    setPassword('');
                    sendAuthTelemetry({
                      email: email || undefined,
                      event_type: nextMagicLink ? 'switched_to_magic_link' : 'switched_to_password_mode',
                      auth_method: nextMagicLink ? 'magic_link' : 'password',
                      details: nextMagicLink
                        ? 'Użytkownik przełączył na Magic Link.'
                        : 'Użytkownik kliknął logowanie przez e-mail i hasło, ale jeszcze nic nie wpisał.',
                    });
                    const base = window.location.pathname + (window.location.search || '');
                    if (nextMagicLink) {
                      window.history.replaceState(null, '', base);
                    } else {
                      window.history.replaceState(null, '', base + '#pass');
                    }
                  }}
                  className="w-full mt-2 text-sm text-gray-600 hover:text-[#03adf0] underline"
                >
                  {useMagicLink
                    ? 'Zaloguj się hasłem'
                    : 'Zaloguj się bez hasła (Magic Link)'}
                </button>

                <div className="text-center pt-2">
                  <p className="text-sm text-gray-600">
                    Nie masz konta?{' '}
                    <button
                      type="button"
                      onClick={() => router.push(registerUrl)}
                      className="text-[#03adf0] hover:text-[#0288c7] font-medium underline"
                    >
                      Zarejestruj się
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
          <p className="text-sm text-gray-600">Ładowanie...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';
