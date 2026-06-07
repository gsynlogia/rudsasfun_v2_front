const DEFAULT_GTM_ID = 'GTM-5HRXDZP';

export function isGtmEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GTM_ENABLED === 'true';
}

export function getGtmId(): string {
  return process.env.NEXT_PUBLIC_GTM_ID || DEFAULT_GTM_ID;
}