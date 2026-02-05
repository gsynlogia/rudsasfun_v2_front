'use client';

import { Menu, X } from 'lucide-react';
import { ReactNode, useState } from 'react';

import Footer from '../Footer';
import HeaderTop from '../HeaderTop';

import ProfileSidebar from './ProfileSidebar';

interface ProfileLayoutProps {
  children: ReactNode;
}

/**
 * ProfileLayout Component
 * Main layout for user profile pages
 * Uses existing HeaderTop and Footer components
 */
export default function ProfileLayout({ children }: ProfileLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full" style={{ overflow: 'visible', position: 'relative' }}>
      {/* Top Bar - Existing component */}
      <HeaderTop />

      {/* Main Content Area with Sidebar */}
      <main className="max-w-container mx-auto px-[60px] py-4 sm:py-8" style={{ overflow: 'visible', position: 'relative' }}>
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden fixed top-24 left-3 sm:left-4 z-50 p-2.5 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors border border-gray-200"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="w-5 h-5 text-gray-700" />
          ) : (
            <Menu className="w-5 h-5 text-gray-700" />
          )}
        </button>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar - Fixed overlay, outside wrapper */}
        <div className={`
          lg:hidden
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          fixed top-0 left-0 h-full z-50
          transition-transform duration-300 ease-in-out
        `}>
          <ProfileSidebar onClose={() => setMobileMenuOpen(false)} />
        </div>

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row gap-0">
          {/* Desktop Sidebar - Inside wrapper, wider to fit all text */}
          <div className="hidden lg:block flex-shrink-0 lg:w-[400px] sticky top-4 self-start">
            <ProfileSidebar />
          </div>

          {/* Right Content Area - narrower to make room for wider sidebar */}
          <div className="flex-1 w-full lg:pl-6">
            {/* System Update Alert */}
            <div className="mb-4 sm:mb-6 relative">
              {/* Main alert with clipped corners */}
              <div 
                className="bg-red-600 p-4 sm:p-5"
                style={{ clipPath: 'polygon(0 0, calc(100% - 35px) 0, 100% 35px, 100% 100%, 35px 100%, 0 calc(100% - 35px))' }}
              >
                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm sm:text-base font-semibold text-white mb-2">
                      Pracujemy nad ulepszeniem systemu
                    </h4>
                    <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                      Aby był jeszcze lepszy, szybszy i wygodniejszy w obsłudze. W trakcie zmian mogą pojawić się drobne błędy — przepraszamy za ewentualne niedogodności.
                    </p>
                    <p className="text-xs sm:text-sm text-white/90 leading-relaxed mt-3">
                      Aktualnie nie generujemy umów ani kart kwalifikacyjnych. Zgodnie z regulaminem, rezerwacja dokonana w Panelu Klienta stanowi umowę wstępną. Poinformujemy SMSem o gotowej umowie. Dziękujemy za cierpliwość.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {children}
          </div>
        </div>
      </main>

      {/* Footer - Existing component */}
      <Footer />
    </div>
  );
}