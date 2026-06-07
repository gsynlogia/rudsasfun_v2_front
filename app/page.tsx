import { headers } from 'next/headers';
import Link from 'next/link';
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

interface CampProperty {
  id: number;
  camp_id: number;
  city: string;
  start_date: string;
  end_date: string;
  tag: string | null;
  registered_count: number;
  max_participants: number;
  is_full: boolean;
  is_ended: boolean;
  visible_in_reservation: boolean;
}

interface Camp {
  id: number;
  name: string;
  properties: CampProperty[];
}

async function fetchCamps(): Promise<Camp[]> {
  const base =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000';
  try {
    // Cache 60s (revalidate in background) — lista obozów rzadko się zmienia,
    // a ten fetch dominuje TTFB strony /. Dla testów i tak akceptowalne 1-min opóźnienie.
    const r = await fetch(`${base.replace(/\/$/, '')}/api/camps/?for_reservation=1&limit=200`, {
      next: { revalidate: 60 },
    });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data?.camps) ? data.camps : [];
  } catch {
    return [];
  }
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y.slice(2)}`;
}

export const dynamic = 'force-dynamic';

export default async function Home() {
  const host = (await headers()).get('host');

  if (!isDevHost(host)) {
    redirect(HOME_REDIRECT_URL);
  }

  const camps = await fetchCamps();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 px-4 py-8">
      <div className="w-full max-w-3xl mx-auto space-y-6">
        <div className="bg-white/95 rounded-2xl shadow-xl p-8 space-y-6 text-center">
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

        <div className="bg-white/95 rounded-2xl shadow-xl p-6 space-y-3">
          <div className="flex items-baseline justify-between border-b border-slate-200 pb-2">
            <h2 className="text-lg font-semibold text-slate-800">Tematy obozów</h2>
            <span className="text-xs text-slate-500">{camps.length} tematów · klik na turnus → krok 1</span>
          </div>
          {camps.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">Brak obozów do wyświetlenia.</p>
          ) : (
            <ul className="space-y-2">
              {camps.map((camp) => (
                <li key={camp.id}>
                  <details className="group rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 open:bg-white transition">
                    <summary className="cursor-pointer select-none px-4 py-3 flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-800">{camp.name}</span>
                      <span className="text-xs text-slate-500 font-mono">
                        {camp.properties.length} turnus{camp.properties.length === 1 ? '' : camp.properties.length < 5 ? 'y' : 'ów'}
                      </span>
                    </summary>
                    <ul className="border-t border-slate-200 divide-y divide-slate-100">
                      {camp.properties.map((p) => {
                        const url = `/camps/${camp.id}/edition/${p.id}/step/1`;
                        const isFull = p.is_full;
                        return (
                          <li key={p.id}>
                            <Link
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block px-4 py-2 hover:bg-blue-50 transition flex items-center justify-between gap-3 text-sm"
                            >
                              <span className="flex items-center gap-2">
                                {p.tag && (
                                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                                    {p.tag}
                                  </span>
                                )}
                                <span className="text-slate-700">
                                  {fmtDate(p.start_date)}–{fmtDate(p.end_date)}
                                </span>
                                <span className="text-slate-500 text-xs">· {p.city}</span>
                              </span>
                              <span className="flex items-center gap-2 text-xs">
                                <span className={isFull ? 'text-red-600 font-semibold' : 'text-slate-500'}>
                                  {p.registered_count}/{p.max_participants}
                                </span>
                                {isFull && (
                                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold text-[10px]">
                                    FULL
                                  </span>
                                )}
                                {p.is_ended && (
                                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px]">
                                    minął
                                  </span>
                                )}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
