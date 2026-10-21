import { describe, expect, it } from 'vitest';

import { CARD_ACTIVITIES, CARD_ADDITIONAL_INFO_HINT } from '@/lib/qualificationSeasonTexts';

// Teksty karty kwalifikacyjnej zatwierdzone przez Anię (Trello v9VIJ4V1, 2026-10-21) — zmiana tekstu = świadoma decyzja.
describe('teksty karty kwalifikacyjnej LATO / ZIMA', () => {
  it('zajęcia w oświadczeniu (część II)', () => {
    expect(CARD_ACTIVITIES).toEqual({
      LATO: 'jazda na quadach, skuterze wodnym, bananie wodnym, ścianka wspinaczkowa, park linowy, kąpiele w jeziorze, park wodny, kajaki i rowerki wodne, Energylandia, Aquapark.',
      ZIMA: 'jazda na nartach, jazda na sankach, kąpiele w basenie, pobyt w Termach, Energylandii, Aquaparku, tor saneczkowy, przejażdżka ciuchcią i innych atrakcji dostępnych w ofercie obozu/kolonii.',
    });
  });

  it('podpowiedź w części III — zimą bez urodzin i balonów', () => {
    expect(CARD_ADDITIONAL_INFO_HINT).toEqual({
      LATO: 'Prosimy o podanie dodatkowych informacji np. przyjedzie dzień później, rodzic ma ograniczone prawa rodzicielskie, ma urodziny podczas obozu, boi się balonów, itp.',
      ZIMA: 'Prosimy o podanie dodatkowych informacji np. przyjedzie dzień później, rodzic ma ograniczone prawa rodzicielskie, itp.',
    });
  });
});