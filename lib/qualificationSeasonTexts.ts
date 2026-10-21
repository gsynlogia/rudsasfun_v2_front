/**
 * Teksty karty kwalifikacyjnej zależne od sezonu — dwie wersje „LATO” i „ZIMA”, bez roku
 * (Trello v9VIJ4V1, Ania 2026-10-21: „nie podajemy roczników sezonu”). Wersja wynika z okresu turnusu.
 */
export type QualificationCardSeason = 'LATO' | 'ZIMA';

export function qualificationCardSeason(period: string | null | undefined): QualificationCardSeason {
  return period === 'zima' ? 'ZIMA' : 'LATO';
}

/** Zajęcia po „m.in.:” w oświadczeniu o braku przeciwwskazań (część II). */
export const CARD_ACTIVITIES: Record<QualificationCardSeason, string> = {
  LATO: 'jazda na quadach, skuterze wodnym, bananie wodnym, ścianka wspinaczkowa, park linowy, kąpiele w jeziorze, park wodny, kajaki i rowerki wodne, Energylandia, Aquapark.',
  ZIMA: 'jazda na nartach, jazda na sankach, kąpiele w basenie, pobyt w Termach, Energylandii, Aquaparku, tor saneczkowy, przejażdżka ciuchcią i innych atrakcji dostępnych w ofercie obozu/kolonii.',
};

/** Podpowiedź części III — w wersji zimowej bez „ma urodziny podczas obozu, boi się balonów”. */
export const CARD_ADDITIONAL_INFO_HINT: Record<QualificationCardSeason, string> = {
  LATO: 'Prosimy o podanie dodatkowych informacji np. przyjedzie dzień później, rodzic ma ograniczone prawa rodzicielskie, ma urodziny podczas obozu, boi się balonów, itp.',
  ZIMA: 'Prosimy o podanie dodatkowych informacji np. przyjedzie dzień później, rodzic ma ograniczone prawa rodzicielskie, itp.',
};