import type { Step1FormData } from '@/utils/sessionStorage';

type GuardianEscapeFlags = Pick<Step1FormData['parents'][number], 'noSecondParent' | 'limitedRights'>;

/**
 * Opiekunowie do zapisania w rezerwacji: opiekun 1 zawsze, kolejny tylko bez zaznaczonego „Brak drugiego opiekuna"
 * ani „Ograniczone prawa rodzicielskie". Przy zaznaczeniu pola opiekuna 2 są ukryte i puste, a backend wymaga
 * imienia, nazwiska i telefonu u każdego przesłanego opiekuna.
 */
export function guardiansToSubmit<T extends GuardianEscapeFlags>(parents: readonly T[]): T[] {
  return parents.filter((parent, index) => index === 0 || !(parent.noSecondParent || parent.limitedRights));
}