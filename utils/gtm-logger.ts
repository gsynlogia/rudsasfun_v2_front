import { isGtmEnabled, getGtmId } from './gtm-config';

type ReservationEvent = Record<string, unknown>;

function buildPayload(event: string, data: ReservationEvent) {
  return {
    event,
    gtmId: getGtmId(),
    timestamp: new Date().toISOString(),
    data,
  };
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
  if (isGtmEnabled()) {
    pushGtmEvent(event, data);
    return;
  }
  // fallback: send to backend logger
  const payload = buildPayload(event, data);
  try {
    await fetch('/api/gtm/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // silent fail in fallback logger
    // eslint-disable-next-line no-console
    console.warn('GTM log fallback failed', err);
  }
}
