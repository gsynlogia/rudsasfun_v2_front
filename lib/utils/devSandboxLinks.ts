/**
 * devSandboxLinks — adresy testowych skrzynek (SMS + e-mail) dla danego środowiska.
 *
 * PO CO TO JEST: na lokalu i na DEV system NIE wysyła wiadomości do prawdziwych klientów —
 * maile i SMS-y lądują w „atrapach" skrzynek, które można podejrzeć w przeglądarce.
 * Każde środowisko ma własną atrapę i własną bazę (lokal czyta swoją, DEV swoją),
 * więc adres MUSI zależeć od tego, gdzie akurat jesteśmy.
 *
 * DLACZEGO PO NAZWIE HOSTA, a nie po zmiennej środowiskowej: zmienne `NEXT_PUBLIC_*` są
 * wpisywane do paczki w chwili budowania. Ta sama paczka jedzie na lokal i na DEV, więc
 * pokazywałaby wszędzie ten sam adres. Nazwę hosta znamy dopiero przy renderze — i ona nie kłamie.
 * Ta sama zasada co `isProdHost` w app/layout.tsx.
 *
 * Adresy zweryfikowane 2026-07-17 (curl → HTTP 200 + tytuły stron „Telefon dev — SMS-y" /
 * „Skrzynka emaili — dev"). Proxy (NPM) jest już skonfigurowane lokalnie i na OVH.
 */

/** Adresy atrap skrzynek dla jednego środowiska. */
export interface SandboxLinks {
  /** Podgląd SMS-ów testowych. */
  smsUrl: string;
  /** Podgląd maili testowych. */
  emailUrl: string;
}

/** Skrzynki lokalne — kontenery phone_dev_synlogia (:4070) i email_inbox_dev_synlogia (:4080) za dev-npm. */
const LOCAL_LINKS: SandboxLinks = {
  smsUrl: 'https://phone.radsas.syn.test',
  emailUrl: 'https://email.radsas.syn.test',
};

/** Skrzynki DEV — osobna maszyna (OVH) i osobna baza. */
const DEV_LINKS: SandboxLinks = {
  smsUrl: 'https://sms-rezerwacja-radsasfun.synlogia.dev',
  emailUrl: 'https://emails-rezerwacja-radsasfun.synlogia.dev',
};

/** Hosty, pod którymi front chodzi lokalnie. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', 'radsas.syn.test']);

/** Hosty DEV (OVH, za Tailscale). */
const DEV_HOSTS = new Set(['rezerwacja-radsasfun.synlogia.dev']);

/**
 * Zwraca adresy atrap skrzynek dla podanego hosta albo `null`, gdy ich BYĆ NIE MOŻE.
 *
 * `null` dostaje produkcja (tam nie ma atrap — wiadomości idą do prawdziwych klientów)
 * oraz każdy nieznany host: wolimy nie pokazać linku niż wysłać kogoś pod zgadnięty adres.
 *
 * @param host wartość nagłówka `host` (może zawierać port, może być `null`)
 */
export function resolveSandboxLinks(host: string | null): SandboxLinks | null {
  if (!host) return null;

  const hostname = host.split(':')[0].toLowerCase();

  if (LOCAL_HOSTS.has(hostname)) return LOCAL_LINKS;
  if (DEV_HOSTS.has(hostname)) return DEV_LINKS;

  // Produkcja i wszystko inne — bez linków.
  return null;
}
