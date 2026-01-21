import { isGtmEnabled, getGtmId } from './gtm-config';
import { API_BASE_URL } from './api-config';
import { loadStep1FormData, loadStep5FormData, loadReservationState } from './sessionStorage';
import { ReservationState } from '@/types/reservationState';

const PROCESS_KEY = 'radsasfun_res_process_id';

function getProcessId(): string {
  if (typeof window === 'undefined') return 'server';
  const existing = sessionStorage.getItem(PROCESS_KEY);
  if (existing) return existing;
  const generated = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  sessionStorage.setItem(PROCESS_KEY, generated);
  return generated;
}

type ReservationEvent = Record<string, unknown>;
type GtmPayload = {
  event: string;
  gtmId: string;
  timestamp: string;
  data: ReservationEvent;
};
type PersistedGtmPayload = GtmPayload & { gtmEnabled: boolean };

function buildPayload(event: string, data: ReservationEvent): GtmPayload {
  return {
    event,
    gtmId: getGtmId(),
    timestamp: new Date().toISOString(),
    data,
  };
}

async function persistGtmEvent(payload: PersistedGtmPayload) {
  try {
    await fetch(`${API_BASE_URL}/gtm/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('GTM DB log failed', err);
  }
}

export function pushGtmEvent(event: string, data: ReservationEvent) {
  if (!isGtmEnabled()) return;
  const payload = buildPayload(event, data);
  // Ensure stringified payload to avoid [object Object] in GTM
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: payload.event,
      payload: JSON.stringify(payload),
    });
  }
}

export async function logGtmEvent(event: string, data: ReservationEvent) {
  const gtmEnabled = isGtmEnabled();
  const payload = buildPayload(event, data);
  const persistedPayload: PersistedGtmPayload = { ...payload, gtmEnabled };

  // Zapis w DB zawsze
  void persistGtmEvent(persistedPayload);

  if (gtmEnabled) {
    pushGtmEvent(event, data);
    return;
  }

  // fallback: zapis do pliku gdy GTM=false
  try {
    await fetch('/api/gtm/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(persistedPayload),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('GTM log fallback failed', err);
  }
}

export function buildStepEventData(stepNumber: number, reservation: ReservationState, overrides: Partial<ReservationEvent> = {}) {
  const processId = getProcessId();
  const step1 = loadStep1FormData();
  const step5 = loadStep5FormData();
  const state = loadReservationState();

  const camp = reservation.camp || state?.camp;
  const reservationNumber = reservation.reservationNumber || state?.reservationNumber || 'pending';

  const baseData: ReservationEvent = {
    processId,
    stepNumber,
    stepName: `step_${stepNumber}`,
    reservationNumber,
    campId: camp?.id,
    campName: camp?.name,
    campCity: camp?.properties.city,
    campPeriod: camp?.properties.period,
    campStartDate: camp?.properties.start_date,
    campEndDate: camp?.properties.end_date,
    totalPrice: reservation.totalPrice,
    email: step1?.parents?.[0]?.email || null,
    phone: step1?.parents?.[0]?.phoneNumber || null,
    paymentMethod: step5?.paymentMethod || null,
    paymentAmount: step5?.paymentAmount || null,
    timestamp: new Date().toISOString(),
  };

  return {
    ...baseData,
    ...overrides,
  };
}
