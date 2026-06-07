'use client';

import { ArrowLeft, Link2, Copy, Loader2, UserCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import { authService } from '@/lib/services/AuthService';
import { authenticatedApiCall } from '@/utils/api-auth';

const COPY_LINK_WARNING = (
  <>
    Link należy wkleić w <strong>trybie incognito</strong> lub w <strong>innym profilu przeglądarki</strong>.
    <br /><br />
    Użycie tego linku w nowym oknie tego samego profilu przeglądarki spowoduje wylogowanie z panelu administracyjnego i zalogowanie na profil klienta. Gdy będziesz chciał ponownie wprowadzać zmiany jako administrator, będziesz musiał wylogować się z profilu klienta i zalogować ponownie jako admin.
  </>
);

interface GenerateMagicLinkResponse {
  link_local: string;
  link_production: string;
  user_id: number;
  user_email: string;
  reservation_number: string;
  /** 'local' | 'production' – wyświetl tylko link dla tego środowiska */
  environment: 'local' | 'production';
}

export default function MagicLinkSuperFunctionPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reservationNumber, setReservationNumber] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateMagicLinkResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'link' | null>(null);
  const [copyWarningOpen, setCopyWarningOpen] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!authService.isAuthenticated()) {
        router.push('/admin-panel/login');
        return;
      }
      const user = await authService.verifyToken();
      if (!user) {
        router.push('/admin-panel/login');
        return;
      }
      const canAccess =
        user.id === 0 ||
        user.user_type === 'admin' ||
        !!(user.groups && user.groups.includes('admin'));
      if (!canAccess) {
        router.push('/admin-panel/settings');
        return;
      }
      setIsAuthorized(true);
      setLoading(false);
    };
    checkAccess();
  }, [router]);

  const handleGenerate = async () => {
    const nr = reservationNumber.trim();
    if (!nr) {
      setError('Podaj numer rezerwacji.');
      return;
    }
    setError(null);
    setResult(null);
    setGenerating(true);
    try {
      const data = await authenticatedApiCall<GenerateMagicLinkResponse>(
        '/api/admin/super-functions/generate-magic-link',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservation_number: nr }),
        }
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się wygenerować linku.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!magicLink) return;
    navigator.clipboard.writeText(magicLink).then(() => {
      setCopied('link');
      setTimeout(() => setCopied(null), 2000);
      setCopyWarningOpen(true);
    });
  };

  const magicLink =
    result?.environment === 'local' ? result?.link_local : result?.link_production;
  const linkLabel =
    result?.environment === 'local' ? 'Link (localhost)' : 'Link (produkcja)';

  if (loading) {
    return (
      <AdminLayout>
        <div className="w-full flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
            <p className="mt-4 text-sm text-gray-600">Sprawdzanie autoryzacji...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="w-full max-w-2xl">
        <div className="mb-6">
          <Link
            href="/admin-panel/settings/super-functions"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
            style={{ cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Powrót do super funkcji</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Magic link do profilu klienta
          </h1>
          <p className="text-sm text-gray-600">
            Podaj numer rezerwacji. Zostanie wygenerowany link logowania do profilu klienta. <strong>Klient nie otrzymuje żadnego e-maila.</strong>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div>
            <label htmlFor="reservation_number" className="block text-sm font-medium text-gray-700 mb-1">
              Numer rezerwacji
            </label>
            <input
              id="reservation_number"
              type="text"
              placeholder="np. REZ-2026-637 lub 637"
              value={reservationNumber}
              onChange={(e) => setReservationNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-[#03adf0]"
              disabled={generating}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#03adf0] text-white font-medium rounded-lg hover:bg-[#0288c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generowanie...
              </>
            ) : (
              <>
                <Link2 size={18} />
                Generuj link
              </>
            )}
          </button>

          {result && magicLink && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              <p className="text-sm text-gray-700">
                <strong>Klient:</strong> {result.user_email || `ID ${result.user_id}`} · Rezerwacja: {result.reservation_number}
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                <a
                  href={`/client-view/${result.user_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"
                >
                  <UserCircle size={18} />
                  Otwórz podgląd profilu klienta
                </a>
                <p className="text-xs text-gray-500 sm:max-w-xs">
                  Otwiera profil klienta w nowej karcie. Zostajesz zalogowany w panelu admina.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{linkLabel} (dla klienta)</p>
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                  {COPY_LINK_WARNING}
                </p>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300"
                  title="Kopiuj link dla klienta"
                >
                  <Copy size={16} />
                  {copied === 'link' ? 'Skopiowano' : 'Kopiuj link'}
                </button>
              </div>
            </div>
          )}

          {copyWarningOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              role="dialog"
              aria-modal="true"
              aria-labelledby="copy-warning-title"
            >
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-red-600" aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 id="copy-warning-title" className="text-lg font-semibold text-gray-900 mb-2">
                      Ważne
                    </h2>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {COPY_LINK_WARNING}
                    </p>
                    <button
                      type="button"
                      onClick={() => setCopyWarningOpen(false)}
                      className="mt-4 w-full px-4 py-2 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Rozumiem
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
