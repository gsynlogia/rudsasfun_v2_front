/**
 * Buduje obiekt ContractFormData na podstawie danych z kroków 1–3 i stanu rezerwacji.
 * Używane wyłącznie do podglądu umowy na 4. kroku rezerwacji (bez zapisu do bazy).
 * Format identyczny jak mapReservationToContractForm – ten sam szablon umowy na profilu.
 */

import type { ContractFormData } from '@/lib/contractReservationMapping';
import type { ReservationStorageState } from '@/utils/sessionStorage';
import type { Step1FormData } from '@/utils/sessionStorage';
import type { Step2FormData } from '@/utils/sessionStorage';
import type { Step3FormData } from '@/utils/sessionStorage';

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pl-PL');
};

const formatAmount = (amount: number) =>
  amount?.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';

const mapGender = (gender: string) => {
  const m: Record<string, string> = {
    Chłopiec: 'Chłopiec',
    Dziewczynka: 'Dziewczynka',
    Mężczyzna: 'Chłopiec',
    Male: 'Chłopiec',
    Kobieta: 'Dziewczynka',
    Female: 'Dziewczynka',
  };
  return m[gender?.trim() || ''] || 'Chłopiec';
};

const BASE_DEPOSIT = 500;

export function buildContractFormDataFromSteps(
  step1: Step1FormData | null,
  step2: Step2FormData | null,
  step3: Step3FormData | null,
  state: ReservationStorageState | null,
): ContractFormData {
  const firstParent = step1?.parents?.[0];
  const participant = step1?.participantData;
  const camp = state?.camp;
  const props = camp?.properties;
  const items = state?.items ?? [];

  const baseItem = items.find((i) => i.type === 'base');
  const dietItem = items.find((i) => i.type === 'diet');
  const addonItems = items.filter((i) => i.type === 'addon');
  const protectionItems = items.filter((i) => i.type === 'protection');
  const transportItem = items.find((i) => i.type === 'transport');
  const promotionItem = items.find((i) => i.type === 'promotion');

  const basePrice = baseItem?.price ?? state?.basePrice ?? 0;
  const totalPrice = state?.totalPrice ?? 0;
  const protectionTotal = protectionItems.reduce((s, i) => s + i.price, 0);
  const depositAmount = BASE_DEPOSIT + protectionTotal;

  const tournamentName = camp?.name ?? '';
  const tournamentDates = props?.start_date && props?.end_date
    ? `${formatDate(props.start_date)} - ${formatDate(props.end_date)}`
    : '';

  const transportTo =
    step2?.transportData?.departureType === 'wlasny'
      ? 'Własny transport'
      : (step2?.transportData?.departureCity ?? '');
  const transportFrom =
    step2?.transportData?.returnType === 'wlasny'
      ? 'Własny transport'
      : (step2?.transportData?.returnCity ?? '');

  const addonsText = addonItems
    .map((a) => `${a.name} + ${formatAmount(a.price)}`)
    .join('\n') || '';

  let insurance1 = '';
  let insurance2 = '';
  protectionItems.forEach((p) => {
    const name = p.name.toLowerCase();
    if (name.includes('tarcza')) insurance1 = `${p.name} + ${formatAmount(p.price)}`;
    else if (name.includes('oaza') || name.includes('oasa')) insurance2 = `${p.name} + ${formatAmount(p.price)}`;
  });

  const promotions = promotionItem
    ? `${promotionItem.name} ${formatAmount(promotionItem.price)}`
    : '';

  const mapInvoice = () => {
    if (!step3?.wantsInvoice) return 'Brak faktury';
    if (step3.deliveryType === 'paper') return 'Papierowa + 30,00';
    return 'Elektroniczna';
  };

  const contractDate = new Date().toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return {
    reservationNumber: 'W trakcie nadawania',
    contractDate,
    tournamentName,
    tournamentDates,
    parentName: firstParent
      ? `${firstParent.firstName ?? ''} ${firstParent.lastName ?? ''}`.trim() || 'Brak danych'
      : 'Brak danych',
    parentEmail: firstParent?.email ?? '',
    parentPhone: `${firstParent?.phone ?? ''} ${firstParent?.phoneNumber ?? ''}`.trim() || '',
    parentCity: firstParent?.city ?? '',
    childName: participant
      ? `${participant.firstName ?? ''} ${participant.lastName ?? ''}`.trim() || 'Brak danych'
      : 'Brak danych',
    childCity: participant?.city ?? '',
    childYear: participant?.age ?? '',
    childGender: mapGender(participant?.gender ?? ''),
    locationName: tournamentName && tournamentDates ? `${tournamentName} (${tournamentDates})` : '',
    locationAddress: props?.city ?? '',
    facilityName: props?.period ?? camp?.name ?? '',
    transportTo,
    transportFrom,
    baseCost: formatAmount(basePrice),
    diet: dietItem ? `${dietItem.name} + ${formatAmount(dietItem.price)}` : '',
    attractions: addonsText,
    insurance1,
    insurance2,
    transport: transportItem ? `+ ${formatAmount(transportItem.price)}` : '',
    totalCost: formatAmount(totalPrice),
    deposit: formatAmount(depositAmount),
    departurePlace: transportTo,
    returnPlace: transportFrom,
    promotions,
    invoice: mapInvoice(),
  };
}
