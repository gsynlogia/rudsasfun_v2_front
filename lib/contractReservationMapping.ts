/**
 * Wspólne mapowanie danych rezerwacji z API na format ContractForm.
 * Używane przez stronę umowy (/profil/aktualne-rezerwacje/[id]/umowa)
 * oraz stronę wydruku (/druk/umowa/[id]) – dane jeden do jednego.
 */

export interface ReservationData {
  id: number;
  reservation_number: string;
  participant_first_name: string;
  participant_last_name: string;
  participant_city: string;
  participant_age: string;
  participant_gender: string;
  parents_data: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneNumber: string;
    city: string;
  }>;
  camp_name: string;
  property_name: string;
  property_city: string;
  property_start_date: string;
  property_end_date: string;
  departure_type: string;
  departure_city: string;
  return_type: string;
  return_city: string;
  total_price: number;
  deposit_amount: number;
  base_price: number;
  diet_name?: string;
  diet_price?: number;
  addons_data?: Array<{ name: string; price: number }>;
  protection_names?: Record<string, string>;
  protection_prices?: Record<string, number>;
  promotion_name?: string;
  promotion_price?: number;
  transport_price?: number;
  delivery_type?: string;
  created_at?: string;
  /** Pytania o stan zdrowia (krok 1 rezerwacji) */
  health_questions?: Record<string, string> | null;
  /** Szczegóły stanu zdrowia (krok 1 rezerwacji) */
  health_details?: Record<string, string> | null;
  /** Uwagi dodatkowe (krok 1 rezerwacji) */
  additional_notes?: string | null;
  /** Informacje dodatkowe dotyczące uczestnika (ostatnie pole kroku 1) */
  participant_additional_info?: string | null;
  /** Wniosek o zakwaterowanie (krok 1 rezerwacji) */
  accommodation_request?: string | null;
}

export interface ContractFormData {
  reservationNumber: string;
  contractDate?: string;
  tournamentName: string;
  tournamentDates: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  parentCity: string;
  childName: string;
  childCity: string;
  childYear: string;
  childGender: string;
  locationName: string;
  locationAddress: string;
  facilityName: string;
  transportTo: string;
  transportFrom: string;
  baseCost: string;
  diet: string;
  attractions: string;
  insurance1: string;
  insurance2: string;
  transport: string;
  totalCost: string;
  deposit: string;
  departurePlace: string;
  returnPlace: string;
  promotions: string;
  invoice: string;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pl-PL');
};

const formatAmount = (amount: number) => {
  return amount?.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';
};

const mapGender = (gender: string) => {
  const genderMap: Record<string, string> = {
    Chłopiec: 'Chłopiec',
    Dziewczynka: 'Dziewczynka',
    Mężczyzna: 'Chłopiec',
    Male: 'Chłopiec',
    Kobieta: 'Dziewczynka',
    Female: 'Dziewczynka',
  };
  return genderMap[gender?.trim() || ''] || 'Chłopiec';
};

export function mapReservationToContractForm(data: ReservationData): ContractFormData {
  const firstParent = data.parents_data?.[0] || {};

  const contractDate = data.created_at
    ? new Date(data.created_at).toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  const tournamentDates = `${formatDate(data.property_start_date)} - ${formatDate(data.property_end_date)}`;
  const tournamentName = `${data.camp_name}, ${data.property_name}`;

  const transportTo = data.departure_type === 'wlasny' ? 'Własny transport' : (data.departure_city || '');
  const transportFrom = data.return_type === 'wlasny' ? 'Własny transport' : (data.return_city || '');

  const addonsText = data.addons_data?.map((a) => `${a.name} + ${formatAmount(a.price)}`).join('\n') || '';

  let insurance1 = '';
  let insurance2 = '';
  if (data.protection_names && data.protection_prices) {
    for (const [, name] of Object.entries(data.protection_names)) {
      const price = data.protection_prices[name.toLowerCase()] || 0;
      if (name.toLowerCase().includes('tarcza')) {
        insurance1 = `${name} + ${formatAmount(price)}`;
      } else if (name.toLowerCase().includes('oaza')) {
        insurance2 = `${name} + ${formatAmount(price)}`;
      }
    }
  }

  const promotions = data.promotion_name
    ? `${data.promotion_name} ${data.promotion_price ? formatAmount(data.promotion_price) : ''}`
    : '';

  const mapInvoice = (deliveryType: string | undefined) => {
    if (deliveryType === 'paper') return 'Papierowa + 30,00';
    if (deliveryType === 'electronic') return 'Elektroniczna';
    return 'Elektroniczna';
  };

  return {
    reservationNumber: data.reservation_number || `REZ-2026-${data.id}`,
    contractDate: contractDate || undefined,
    tournamentName,
    tournamentDates,
    parentName: `${firstParent.firstName || ''} ${firstParent.lastName || ''}`.trim() || 'Brak danych',
    parentEmail: firstParent.email || '',
    parentPhone: `${firstParent.phone || ''} ${firstParent.phoneNumber || ''}`.trim() || '',
    parentCity: firstParent.city || '',
    childName: `${data.participant_first_name || ''} ${data.participant_last_name || ''}`.trim() || 'Brak danych',
    childCity: data.participant_city || '',
    childYear: data.participant_age || '',
    childGender: mapGender(data.participant_gender || ''),
    locationName: `${tournamentName} (${tournamentDates})`,
    locationAddress: data.property_city || '',
    facilityName: data.property_name || '',
    transportTo,
    transportFrom,
    baseCost: formatAmount(data.base_price || 0),
    diet: data.diet_name ? `${data.diet_name} + ${formatAmount(data.diet_price || 0)}` : '',
    attractions: addonsText,
    insurance1,
    insurance2,
    transport: data.transport_price ? `+ ${formatAmount(data.transport_price)}` : '',
    totalCost: formatAmount(data.total_price || 0),
    deposit: formatAmount(data.deposit_amount || 0),
    departurePlace: transportTo,
    returnPlace: transportFrom,
    promotions,
    invoice: mapInvoice(data.delivery_type),
  };
}
