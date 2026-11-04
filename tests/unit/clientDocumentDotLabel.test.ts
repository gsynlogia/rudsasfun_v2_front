import { describe, expect, it } from 'vitest';

import { getClientDocumentDotPresentation } from '@/lib/utils/clientDocumentDotLabel';

describe('getClientDocumentDotPresentation', () => {
  it('przed podpisem klient widzi, że to on ma podpisać', () => {
    for (const status of [null, undefined, '', 'pending', 'in_verification']) {
      expect(getClientDocumentDotPresentation(status).label).toBe('oczekuje na podpisanie przez klienta');
      expect(getClientDocumentDotPresentation(status).color).toBe('yellow');
    }
  });

  it('po podpisie kropka zostaje żółta, zmienia się tylko napis', () => {
    const shown = getClientDocumentDotPresentation('signed_pending_admin');
    expect(shown.label).toBe('w trakcie weryfikacji biura');
    expect(shown.color).toBe('yellow');
  });

  it('zatwierdzone i odrzucone bez zmian', () => {
    expect(getClientDocumentDotPresentation('approved').label).toBe('zatwierdzone');
    expect(getClientDocumentDotPresentation('accepted').color).toBe('green');
    expect(getClientDocumentDotPresentation('rejected').label).toBe('odrzucone');
  });
});
