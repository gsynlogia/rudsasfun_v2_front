'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { magicLinkService } from '@/lib/services/MagicLinkService';
import { authService } from '@/lib/services/AuthService';
import { saveMagicLinkRedirect, loadMagicLinkRedirect, clearMagicLinkRedirect } from '@/utils/localStorage';
import HeaderTop from '@/components/HeaderTop';
import Footer from '@/components/Footer';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get redirect URL from query params
  const redirectUrl = searchParams.get('redirect') || '/';

  // Save redirect URL to localStorage when component mounts
  useEffect(() => {
    if (redirectUrl && redirectUrl !== '/') {
      // Save redirect URL to localStorage for use after magic link login
      saveMagicLinkRedirect(redirectUrl);
    }
  }, [redirectUrl]);

  // Redirect if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      if (authService.isAuthenticated()) {
        const user = await authService.verifyToken();
        if (user) {
          // User is authenticated - check for redirect URL in localStorage
          const savedRedirect = loadMagicLinkRedirect();
          
          // Use saved redirect if exists and is valid, otherwise use query param, otherwise home
          let finalRedirect = '/';
          if (savedRedirect && savedRedirect !== '/' && savedRedirect.startsWith('/')) {
            finalRedirect = savedRedirect;
          } else if (redirectUrl && redirectUrl !== '/' && redirectUrl.startsWith('/')) {
            finalRedirect = redirectUrl;
          }
          
          // Clear redirect from localStorage after reading
          clearMagicLinkRedirect();
          
          // User is authenticated, redirect to intended page or home
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
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      await magicLinkService.requestMagicLink(email);
      setSuccess(true);
      setEmail(''); // Clear email for security
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas wysyłania magic link');
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
            <p className="text-sm sm:text-base text-gray-600 mb-6 text-center">
              Wprowadź swój adres email, aby otrzymać magic link do logowania
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
                    Adres email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="twoj@email.com"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-[#03adf0] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#0288c7] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Wysyłanie...' : 'Zaloguj'}
                </button>
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

