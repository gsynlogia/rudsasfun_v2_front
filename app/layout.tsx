import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { headers } from 'next/headers';

import DevBanner from '@/components/DevBanner';
import MaintenancePage from '@/components/MaintenancePage';
import TestBanner from '@/components/TestBanner';
import { ToastProvider } from '@/components/ToastContainer';
import { ReservationProvider } from '@/context/ReservationContext';
import { getGtmId, isGtmEnabled } from '@/utils/gtm-config';

import './globals.css';

const PROD_HOSTS = new Set([
  'rezerwacja.radsas-fun.pl',
  'www.radsas-fun.pl',
  'radsas-fun.pl',
  'rejestracja.radsasfun.system-app.pl',
]);

function isProdHost(host: string | null): boolean {
  if (!host) return false;
  const hostname = host.split(':')[0].toLowerCase();
  return PROD_HOSTS.has(hostname);
}

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'RADSASfun',
  description: 'System rezerwacji obozów i wycieczek RADSASfun',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check if portal is offline for maintenance
  const isOffPortal = process.env.NEXT_PUBLIC_OFF_PORTAL === 'true';
  // GTM (i wstrzykiwany przez nie Cookiebot) — tylko na produkcyjnych domenach
  const host = (await headers()).get('host');
  const gtmEnabled = isProdHost(host) && isGtmEnabled();
  const gtmId = getGtmId();
  // DevBanner — widoczny na każdym nie-prod hoście (dev synlogia.dev, localhost).
  // Hostname-based (runtime, SSR), bo NEXT_PUBLIC_* env są zapiekane do bundla build-time.
  const isDev = !isProdHost(host);

  return (
    <html lang="en">
      <head>
        {/* Google Tag Manager - declare DataLayer */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];`,
          }}
        />
        {/* Google Tag Manager (conditional) */}
        {gtmEnabled && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`,
            }}
          />
        )}
        {/* End Google Tag Manager */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Google Tag Manager (noscript) */}
        {gtmEnabled && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        {/* End Google Tag Manager (noscript) */}
        {isOffPortal ? (
          <MaintenancePage />
        ) : (
          <ReservationProvider>
            <ToastProvider>
              <DevBanner isDev={isDev} />
              <TestBanner />
              {children}
            </ToastProvider>
          </ReservationProvider>
        )}
      </body>
    </html>
  );
}