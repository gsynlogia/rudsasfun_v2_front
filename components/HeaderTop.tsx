'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

import { authService } from '@/lib/services/AuthService';
import { clearMagicLinkRedirect } from '@/utils/localStorage';

/**
 * Header Top Component
 * First navigation bar with logo and utility links
 * Used in both reservation process and admin panel
 */
interface HeaderTopProps {
  fixed?: boolean;
}

export default function HeaderTop({ fixed = false }: HeaderTopProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check authentication status
  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAccountDropdownOpen(false);
      }
    };

    if (accountDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountDropdownOpen]);

  const handleLogout = async () => {
    // Clear authentication (calls backend logout endpoint)
    await authService.logout();

    // Clear magic link redirect from localStorage
    clearMagicLinkRedirect();

    // Update state
    setIsAuthenticated(false);
    setAccountDropdownOpen(false);

    // Redirect to home page
    router.push('/');
  };

  const headerClasses = fixed
    ? 'bg-white fixed top-0 left-0 right-0 z-50'
    : 'bg-white';

  return (
    <header className={headerClasses}>
      {/* Top navigation bar - White background with bottom shadow */}
      <div className="bg-white w-full" style={{ boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)' }}>
        <div className="max-w-container px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
          {/* Logo on the left */}
          <div className="flex items-center">
            <Link href="/" className="cursor-pointer">
              <Image
                src="/logo.png"
                alt="Radsas Fun Logo"
                width={150}
                height={60}
                className="h-5 sm:h-7 md:h-10 lg:max-h-[60px] w-auto"
                style={{ maxHeight: '60px', height: 'auto', width: 'auto', cursor: 'pointer' }}
                priority
              />
            </Link>
          </div>

          {/* Utility links and icons on the right - hidden on mobile/tablet */}
          <div className="hidden lg:flex items-center gap-6 text-sm">
            {/* Text links */}
            <div className="flex items-center gap-6">
              <Link href="#" className="text-gray-600 hover:text-[#03adf0] transition-colors">Fotorelacje</Link>
              <Link href="#" className="text-gray-600 hover:text-[#03adf0] transition-colors flex items-center gap-1">
                Poznaj nas
                <svg className="w-3 h-3 text-[#03adf0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Link>
              <Link href="#" className="text-gray-600 hover:text-[#03adf0] transition-colors">Blog</Link>
              <Link href="#" className="text-gray-600 hover:text-[#03adf0] transition-colors">Sklep</Link>
              <Link href="#" className="text-gray-600 hover:text-[#03adf0] transition-colors">Kontakt</Link>
            </div>

            {/* Vertical separator */}
            <div className="h-6 w-px bg-gray-300"></div>

            {/* Icons */}
            <div className="flex items-center gap-4">
              {/* Notification bell with badge */}
              <div className="flex items-center gap-1">
                <button className="text-gray-600 hover:text-[#03adf0] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
                <div className="w-5 h-5 bg-[#D62828] rounded-full flex items-center justify-center text-white text-xs font-semibold">2</div>
              </div>

              {/* User account dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                  className="text-gray-600 hover:text-[#03adf0] transition-colors flex items-center gap-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm">Moje konto</span>
                  <svg
                    className={`w-3 h-3 text-[#03adf0] transition-transform ${accountDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {accountDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {isAuthenticated ? (
                      <>
                        <Link
                          href="/profil/moje-konto"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          Moje konto
                        </Link>
                        <Link
                          href="/profil/aktualne-rezerwacje"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          Moje rezerwacje
                        </Link>
                        <div className="border-t border-gray-200 my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Wyloguj się
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/login"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Zaloguj się
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile menu button - visible on mobile and tablet */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-600 hover:text-[#03adf0] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="max-w-container px-3 py-4 space-y-3">
              <Link href="#" className="block text-gray-600 hover:text-[#03adf0] transition-colors text-sm py-2">Fotorelacje</Link>
              <Link href="#" className="block text-gray-600 hover:text-[#03adf0] transition-colors text-sm py-2">Poznaj nas</Link>
              <Link href="#" className="block text-gray-600 hover:text-[#03adf0] transition-colors text-sm py-2">Blog</Link>
              <Link href="#" className="block text-gray-600 hover:text-[#03adf0] transition-colors text-sm py-2">Sklep</Link>
              <Link href="#" className="block text-gray-600 hover:text-[#03adf0] transition-colors text-sm py-2">Kontakt</Link>
              <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-1">
                  <button className="text-gray-600 hover:text-[#03adf0] transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </button>
                  <div className="w-5 h-5 bg-[#D62828] rounded-full flex items-center justify-center text-white text-xs font-semibold">2</div>
                </div>
                {isAuthenticated ? (
                  <>
                    <Link href="/profil/moje-konto" className="text-gray-600 hover:text-[#03adf0] transition-colors flex items-center gap-1 text-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Moje konto</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="text-red-600 hover:text-red-700 transition-colors text-sm"
                    >
                      Wyloguj się
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="text-gray-600 hover:text-[#03adf0] transition-colors flex items-center gap-1 text-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Zaloguj się</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

