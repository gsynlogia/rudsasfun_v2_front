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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
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
