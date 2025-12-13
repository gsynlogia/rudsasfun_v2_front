'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

import HeaderTop from '@/components/HeaderTop';
import { authService } from '@/lib/services/AuthService';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated (verify token, not just check existence)
  useEffect(() => {
    const checkAuth = async () => {
      if (authService.isAuthenticated()) {
        // Verify token is still valid
        const user = await authService.verifyToken();
        if (user) {
          // Check if user is admin
          if (authService.isAdmin()) {
            // User is authenticated admin, redirect to admin panel
            router.replace('/admin-panel');
          } else {
            // User is client, show error message
            setError('Tylko administratorzy mogą logować się do panelu administracyjnego. Użyj magic link do logowania jako klient.');
            authService.logout();
          }
        } else {
          // Token invalid, clear it
          authService.logout();
        }
      }

      // Check for error query param
      const errorParam = searchParams.get('error');
      if (errorParam === 'admin_only') {
        setError('Tylko administratorzy mogą uzyskać dostęp do panelu administracyjnego.');
      }
    };
    checkAuth();
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authService.login(login, password);
      // Wait a bit for token to be stored
      await new Promise(resolve => setTimeout(resolve, 100));
      // Use replace instead of push to avoid back button issues
      router.replace('/admin-panel');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd logowania');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <HeaderTop fixed={true} />

      <div className="flex items-center justify-center" style={{ paddingTop: '84px', minHeight: 'calc(100vh - 84px)' }}>
        <div className="w-full max-w-md p-8 bg-white shadow-lg" style={{ borderRadius: 0 }}>
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Logowanie do panelu administracyjnego</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login" className="block text-sm font-medium text-gray-700 mb-2">
                Login
              </label>
              <input
                id="login"
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                style={{ borderRadius: 0 }}
                placeholder="Wprowadź login"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Hasło
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                style={{ borderRadius: 0 }}
                placeholder="Wprowadź hasło"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm" style={{ borderRadius: 0 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-[#03adf0] text-white font-medium hover:bg-[#0288c7] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: 0, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Logowanie...' : 'Zaloguj się'}
            </button>
          </form>

          <div className="mt-6 text-xs text-gray-500">
            <p>Domyślne dane logowania:</p>
            <p>Login: <strong>admin</strong></p>
            <p>Hasło: <strong>admin</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
          <p className="mt-4 text-sm text-gray-600">Ładowanie...</p>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}

