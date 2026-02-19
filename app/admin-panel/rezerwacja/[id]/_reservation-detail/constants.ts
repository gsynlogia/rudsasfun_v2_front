/**
 * Stałe strony szczegółów rezerwacji.
 */
import {
  Receipt,
  FileText,
  Users,
  Bus,
  Heart,
  FileCheck,
  Utensils,
} from 'lucide-react';

export const RESERVATION_PANELS = [
  { id: 'platnosci', label: 'Płatności', icon: Receipt },
  { id: 'dokumenty', label: 'Dokumenty', icon: FileText },
  { id: 'dane', label: 'Dane uczestnika i opiekunów', icon: Users },
  { id: 'promocje-transport', label: 'Promocje i transport', icon: Bus },
  { id: 'zdrowie', label: 'Zdrowie', icon: Heart },
  { id: 'informacje', label: 'Informacje i wniosek', icon: FileCheck },
  { id: 'inne', label: 'Dodatki, diety, faktura, źródło', icon: Utensils },
] as const;

export type PanelId = (typeof RESERVATION_PANELS)[number]['id'];

export const PARTICIPANT_FIELD_LABELS: Record<string, string> = {
  participant_first_name: 'Imię',
  participant_last_name: 'Nazwisko',
  participant_age: 'Rocznik',
  participant_gender: 'Płeć',
  participant_city: 'Miasto',
};
