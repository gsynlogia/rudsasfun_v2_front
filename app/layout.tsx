import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';
import { ToastProvider } from '@/components/ToastContainer';
import { ReservationProvider } from '@/context/ReservationContext';
import MaintenancePage from '@/components/MaintenancePage';
import TestBanner from '@/components/TestBanner';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check if portal is offline for maintenance
  const isOffPortal = process.env.NEXT_PUBLIC_OFF_PORTAL === 'true';

  return (
    <html lang="en">
      <head>
        {/* Google Tag Manager - declare DataLayer */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];`,
          }}
        />
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-5HRXDZP');`,
          }}
        />
        {/* End Google Tag Manager */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5HRXDZP"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        {isOffPortal ? (
          <MaintenancePage />
        ) : (
          <ReservationProvider>
            <ToastProvider>
              <TestBanner />
              {children}
            </ToastProvider>
          </ReservationProvider>
        )}
      </body>
    </html>
  );
}
