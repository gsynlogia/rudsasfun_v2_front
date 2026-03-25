'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { ReactNode, useState, useEffect } from 'react';

import { ReservationPaymentHeaderProvider } from '@/contexts/ReservationPaymentHeaderContext';
import Footer from '../Footer';
import HeaderTop from '../HeaderTop';

import { ChevronDown, ChevronUp } from 'lucide-react';

import ProfileSidebar from './ProfileSidebar';

function SystemAlertBanner() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mb-4 sm:mb-6">
      <div className="bg-[#03adf0] p-3 sm:p-4 rounded-xl">
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => setExpanded(e => !e)}
        >
          <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-white font-medium flex-1">
            Pracujemy nad ulepszeniem systemu
          </p>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-white/80 flex-shrink-0" />
            : <ChevronDown className="w-4 h-4 text-white/80 flex-shrink-0" />
          }
        </div>
        {expanded && (
          <div className="mt-3 pl-8 space-y-2">
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
              Aby był jeszcze lepszy, szybszy i wygodniejszy w obsłudze. W trakcie zmian mogą pojawić się drobne błędy — przepraszamy za ewentualne niedogodności.
            </p>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
              Aktualnie nie generujemy umów ani kart kwalifikacyjnych. Zgodnie z regulaminem, rezerwacja dokonana w Panelu Klienta stanowi umowę wstępną. Poinformujemy SMSem o gotowej umowie. Dziękujemy za cierpliwość.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ProfileLayoutProps {
  children: ReactNode;
}

/**
 * ProfileLayout Component
 * Main layout for user profile pages
 * Uses existing HeaderTop and Footer components
 * Fully responsive with mobile-first approach
 */
export default function ProfileLayout({ children }: ProfileLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // Detect screen size for clipPath
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 640);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <ReservationPaymentHeaderProvider initialTotalPrice={null}>
      <div className="min-h-screen w-full flex flex-col" style={{ overflow: 'visible', position: 'relative' }}>
        {/* Belka developerska */}
        {process.env.NEXT_PUBLIC_APP_ENV !== 'production' && (
          <div className="bg-red-600 text-white text-center text-xs font-medium py-1 z-50">
            Wersja developerska — dane testowe
          </div>
        )}
        <HeaderTop />

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-[#03adf0] transition-colors"
          >
            <Menu className="w-6 h-6" />
            <span className="text-xs font-medium">Menu</span>
          </button>
          <Link
            href="/profil/aktualne-rezerwacje"
            className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-[#03adf0] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"></line>
              <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"></line>
              <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"></line>
            </svg>
            <span className="text-xs font-medium">Rezerwacje</span>
          </Link>
          <a
            href="/profil/faktury-i-platnosci"
            className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-[#03adf0] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span className="text-xs font-medium">Płatności</span>
          </a>
          <a
            href="/profil/moje-konto"
            className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-[#03adf0] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">Konto</span>
          </a>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar - Full screen slide from left */}
      <div className={`
        lg:hidden fixed top-0 left-0 h-full w-[85vw] max-w-[360px] z-50
        bg-white shadow-2xl
        transform transition-transform duration-300 ease-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Mobile Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-[#03adf0]">
          <span className="text-white font-semibold text-lg">Menu</span>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Zamknij menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        {/* Mobile Sidebar Content */}
        <div className="h-[calc(100%-64px)] overflow-y-auto">
          <ProfileSidebar onClose={() => setMobileMenuOpen(false)} isMobile={true} />
        </div>
      </div>

      {/* Main Content Area with Sidebar */}
      <main className="flex-1 max-w-container mx-auto w-full px-4 sm:px-6 lg:px-[60px] py-4 sm:py-6 lg:py-8 pb-24 lg:pb-8" style={{ overflow: 'visible', position: 'relative' }}>
        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row gap-0">
          {/* Desktop Sidebar - Inside wrapper, wider to fit all text */}
          <div className="hidden lg:block flex-shrink-0 lg:w-[400px] sticky top-4 self-start">
            <ProfileSidebar />
          </div>

          {/* Right Content Area - narrower to make room for wider sidebar */}
          <div className="flex-1 w-full lg:pl-6">
            {/* System Update Alert — zwijany */}
            <SystemAlertBanner />
            {children}
          </div>
        </div>
      </main>

      {/* Footer - Existing component */}
      <Footer />
      </div>
    </ReservationPaymentHeaderProvider>
  );
}