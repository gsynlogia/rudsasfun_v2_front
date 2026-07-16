/**
 * resolveSandboxLinks — wybór adresów testowych skrzynek (SMS + e-mail) na podstawie nazwy hosta.
 *
 * Czysta funkcja (bez DOM/Next/SSR) — wołana w root layout przy renderze na serwerze.
 * Decyzja po HOŚCIE (runtime), nie po NEXT_PUBLIC_* — te są zapiekane do bundla przy buildzie
 * i ta sama paczka na lokalu i DEV pokazywałaby ten sam adres.
 *
 * Ground-truth adresów zweryfikowany curl-em 2026-07-17 (wszystkie HTTP 200):
 *   lokal: phone.radsas.syn.test / email.radsas.syn.test (dev-npm, cert mkcert)
 *   DEV:   sms-rezerwacja-radsasfun.synlogia.dev / emails-rezerwacja-radsasfun.synlogia.dev (NPM na OVH)
 */
import { resolveSandboxLinks } from '@/lib/utils/devSandboxLinks';

describe('resolveSandboxLinks — testowe skrzynki per środowisko', () => {
  describe('LOKALNIE → skrzynki lokalne', () => {
    it.each([
      'localhost:3000',
      'localhost',
      '127.0.0.1:3000',
      'radsas.syn.test',
    ])('host %s → lokalny SMS + e-mail', (host) => {
      const links = resolveSandboxLinks(host);
      expect(links).toEqual({
        smsUrl: 'https://phone.radsas.syn.test',
        emailUrl: 'https://email.radsas.syn.test',
      });
    });
  });

  describe('DEV (OVH) → skrzynki DEV-a (inna maszyna, inna baza)', () => {
    it('host rezerwacja-radsasfun.synlogia.dev → SMS + e-mail DEV-a', () => {
      expect(resolveSandboxLinks('rezerwacja-radsasfun.synlogia.dev')).toEqual({
        smsUrl: 'https://sms-rezerwacja-radsasfun.synlogia.dev',
        emailUrl: 'https://emails-rezerwacja-radsasfun.synlogia.dev',
      });
    });

    it('DEV NIE pokazuje adresów lokalnych (osobne bazy — nie wolno pomylić)', () => {
      const links = resolveSandboxLinks('rezerwacja-radsasfun.synlogia.dev');
      expect(links?.smsUrl).not.toContain('syn.test');
      expect(links?.emailUrl).not.toContain('syn.test');
    });
  });

  describe('PRODUKCJA → BRAK linków (bezwzględnie)', () => {
    it.each([
      'rezerwacja.radsas-fun.pl',
      'www.radsas-fun.pl',
      'radsas-fun.pl',
      'rejestracja.radsasfun.system-app.pl',
    ])('host %s → null', (host) => {
      expect(resolveSandboxLinks(host)).toBeNull();
    });
  });

  describe('przypadki brzegowe', () => {
    it('brak hosta → null (nie zgadujemy adresu)', () => {
      expect(resolveSandboxLinks(null)).toBeNull();
    });

    it('nieznany host → null (pasek ostrzega, ale bez linków donikąd)', () => {
      expect(resolveSandboxLinks('jakis-inny-host.example.com')).toBeNull();
    });

    it('wielkość liter i port nie mają znaczenia', () => {
      expect(resolveSandboxLinks('LOCALHOST:3000')).not.toBeNull();
      expect(resolveSandboxLinks('Rezerwacja-Radsasfun.Synlogia.dev:443')?.smsUrl)
        .toBe('https://sms-rezerwacja-radsasfun.synlogia.dev');
    });
  });
});
