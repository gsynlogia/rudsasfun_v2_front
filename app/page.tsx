import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

const HOME_REDIRECT_URL = 'https://radsas-fun.pl/kategoria-produktu/obozy-i-kolonie-dla-dzieci-i-mlodziezy/';

const DEV_HOSTS = new Set([
  'rezerwacja-radsasfun.synlogia.dev',
  'radsasfun.synlogia.dev',
]);

const DEV_HOST_PREFIXES = ['localhost', '127.0.0.1'];

function isDevHost(host: string | null): boolean {
  if (!host) return false;
  const hostname = host.split(':')[0].toLowerCase();
  if (DEV_HOSTS.has(host.toLowerCase()) || DEV_HOSTS.has(hostname)) return true;
  return DEV_HOST_PREFIXES.includes(hostname);
}

export const dynamic = 'force-dynamic';

export default async function Home() {
  const host = (await headers()).get('host');

  if (!isDevHost(host)) {
    redirect(HOME_REDIRECT_URL);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 px-4">
      <div className="w-full max-w-md bg-white/95 rounded-2xl shadow-xl p-8 space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">RADSASfun</h1>
          <p className="text-slate-500 text-sm mt-1">Środowisko deweloperskie</p>
          {host && <p className="text-xs text-slate-400 mt-2 font-mono">{host}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="/admin-panel"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-900 transition"
          >
            Admin panel
          </a>
          <a
            href="/login"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3 rounded-lg bg-white text-slate-800 border border-slate-300 font-medium hover:bg-slate-50 transition"
          >
            Logowanie
          </a>
        </div>
      </div>
    </main>
  );
}
