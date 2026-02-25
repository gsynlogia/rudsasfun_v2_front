'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

import Footer from '@/components/Footer';
import HeaderTop from '@/components/HeaderTop';
import { authService } from '@/lib/services/AuthService';
import { magicLinkService } from '@/lib/services/MagicLinkService';
import { sendAuthTelemetry } from '@/lib/services/AuthTelemetryService';
import { DEFAULT_POST_LOGIN_REDIRECT } from '@/lib/auth-constants';

const MIN_PASSWORD_LENGTH = 6;

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get redirect URL from query params; default = strona rezerwacji klienta
  const redirectUrl = searchParams?.get('redirect') || DEFAULT_POST_LOGIN_REDIRECT;

  // Telemetria: otwarcie widoku rejestracji (jednorazowo)
  useEffect(() => {
    sendAuthTelemetry({
      event_type: 'register_view_opened',
      details: 'Użytkownik wszedł w proces rejestracji.',
    });
  }, []);

  // Prefill email when redirected from login (konto nie istnieje)
  useEffect(() => {
    const e = searchParams?.get('email');
    if (e != null && e !== '') setEmail(e);
  }, [searchParams]);

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
      event_type: 'register_submit_clicked',
      auth_method: 'password',
      details: 'Użytkownik nacisnął przycisk pozwalający na rejestrację.',
    });
    setError(null);
    setSuccess(false);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.`);
      return;
    }
    if (password !== passwordConfirm) {
      setError('Hasła muszą być identyczne.');
      return;
    }
    setLoading(true);
    try {
      await magicLinkService.register(email, password, passwordConfirm, redirectUrl);
      setSuccess(true);
      sendAuthTelemetry({
        email,
        event_type: 'register_success_screen_viewed',
        details: 'Wyświetlono informację, że może zalogować się Magic Linkiem z maila lub podanym hasłem.',
      });
      setEmail('');
      setPassword('');
      setPasswordConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas rejestracji');
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
              Rejestracja
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mb-6 text-center">
              Wprowadź adres e-mail oraz hasło, aby utworzyć konto i otrzymać link do logowania
            </p>

            {success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800">
                  <strong>Email wysłany!</strong> Sprawdź swoją skrzynkę pocztową i kliknij w link, aby się zalogować.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Adres e-mail <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => {
                      if (email.trim()) {
                        sendAuthTelemetry({
                          email: email.trim(),
                          event_type: 'register_email_filled',
                          auth_method: 'password',
                          details: 'Użytkownik wpisał swój adres e-mail w formularzu rejestracji.',
                        });
                      }
                    }}
                    required
                    disabled={loading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="twoj@email.com"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Hasło <span className="text-red-500">*</span>
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
                          event_type: 'register_password_filled',
                          auth_method: 'password',
                          details: 'Użytkownik wypełnił pole hasła.',
                        });
                      }
                    }}
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    disabled={loading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Min. 6 znaków"
                  />
                </div>
                <div>
                  <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-2">
                    Powtórz hasło <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="passwordConfirm"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    onBlur={() => {
                      if (passwordConfirm.length > 0) {
                        sendAuthTelemetry({
                          email: email || undefined,
                          event_type: 'register_password_repeated',
                          auth_method: 'password',
                          details: 'Użytkownik powtórzył hasło.',
                        });
                      }
                    }}
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    disabled={loading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Powtórz hasło"
                  />
                </div>

                <div className="text-sm" role="list" aria-label="Wymogi hasła">
                  <p className="text-gray-600 mb-1 sm:mb-2">Wymogi hasła:</p>
                  <ul className="space-y-1 list-none pl-0">
                    <li
                      className={
                        password.length === 0
                          ? 'text-gray-400'
                          : password.length >= MIN_PASSWORD_LENGTH
                            ? 'text-green-600'
                            : 'text-red-600'
                      }
                    >
                      {password.length >= MIN_PASSWORD_LENGTH ? '✓ ' : ''}
                      Min. {MIN_PASSWORD_LENGTH} znaków
                    </li>
                    <li
                      className={
                        passwordConfirm.length === 0
                          ? 'text-gray-400'
                          : password === passwordConfirm
                            ? 'text-green-600'
                            : 'text-red-600'
                      }
                    >
                      {password === passwordConfirm && passwordConfirm.length > 0 ? '✓ ' : ''}
                      Hasła są identyczne
                    </li>
                  </ul>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{error}</p>
                    {error.includes('już istnieje') && (
                      <p className="text-xs text-red-700 mt-2">
                        Masz już konto?{' '}
                        <button
                          type="button"
                          onClick={() => router.push('/login')}
                          className="underline font-medium hover:text-red-900"
                        >
                          Zaloguj się
                        </button>
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email || password.length < MIN_PASSWORD_LENGTH || password !== passwordConfirm}
                  className="w-full bg-[#03adf0] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#0288c7] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Wysyłanie...' : 'Zarejestruj się'}
                </button>

                <div className="text-center pt-2">
                  <p className="text-sm text-gray-600">
                    Masz już konto?{' '}
                    <button
                      type="button"
                      onClick={() => router.push('/login')}
                      className="text-[#03adf0] hover:text-[#0288c7] font-medium underline"
                    >
                      Zaloguj się
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

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
          <p className="text-sm text-gray-600">Ładowanie...</p>
        </div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';