// Środowisko testów e2e (lokal / DEV), przeglądarka i dostęp do bazy przez pomocnika w kontenerze backendu
// (api_radsas/scripts/e2e_helper.py — tylko odczyt, na produkcji odmawia).
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const IS_WINDOWS = process.platform === 'win32';
const DEV_HOST = process.env.E2E_DEV_HOST || 'ubuntu@100.106.222.49';
const DEV_KEY = process.env.E2E_DEV_KEY || path.join(os.homedir(), '.ssh', 'vps_develop');
const HELPER = ['python', '-m', 'scripts.e2e_helper'];

// Lokalnie backend działa w Dockerze: na Windows (Aurora) w WSL, na Macu bezpośrednio.
function localHelper(args) {
  const docker = ['docker', 'exec', '-i', 'radsas_api_radsas', ...HELPER, ...args];
  return IS_WINDOWS ? ['wsl', ['-d', process.env.E2E_WSL_DISTRO || 'Ubuntu-24.04', '--', ...docker]] : [docker[0], docker.slice(1)];
}

function devHelper(args) {
  return ['ssh', ['-i', DEV_KEY, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', DEV_HOST,
    `docker exec -i radsas-backend ${[...HELPER, ...args].join(' ')}`]];
}

export const ENVIRONMENTS = {
  local: {
    name: 'local', base: 'http://localhost:3000', api: 'http://localhost:8000', helper: localHelper,
  },
  dev: {
    name: 'dev', base: 'https://rezerwacja-radsasfun.synlogia.dev', api: 'https://api-rezerwacja-radsasfun.synlogia.dev',
    mail: 'https://emails-rezerwacja-radsasfun.synlogia.dev', sms: 'https://sms-rezerwacja-radsasfun.synlogia.dev',
    helper: devHelper,
  },
};

export const CLIENT_EMAIL = 'szymon.guzik@gmail.com';
export const CLIENT_PHONE = '735048660';

export const BROWSER = {
  chrome: process.env.E2E_CHROME || (IS_WINDOWS
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : '/Users/szymon/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  // Aurora: jeden monitor 1707×960 (skala 150%); Mac: monitor Odyssey nad ekranem MacBooka.
  position: process.env.E2E_WINDOW || (IS_WINDOWS ? '0,0' : '-1000,-1400'),
  size: process.env.E2E_SIZE || (IS_WINDOWS ? '1700,910' : '1600,1300'),
};

function runHelper(env, args, input) {
  const [command, commandArgs] = env.helper(args);
  return execFileSync(command, commandArgs, { input, maxBuffer: 32 * 1024 * 1024 }).toString();
}

/** Zapytanie SELECT do bazy środowiska (tylko odczyt); zwraca tablicę wierszy. */
export function sql(env, query) {
  return JSON.parse(runHelper(env, ['sql'], query));
}

/** Token superadmina na czas testu (bez hasła) — pomocnik odmawia na produkcji. */
export function adminSession(env) {
  return JSON.parse(runHelper(env, ['admin-session'], ''));
}

/** Wartość tekstowa do zapytania SQL (apostrofy podwojone). */
export const q = (value) => `'${String(value).replace(/'/g, "''")}'`;

export const pause = (page, ms) => page.waitForTimeout(ms);