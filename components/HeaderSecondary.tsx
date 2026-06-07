'use client';

import Link from 'next/link';

/**
 * Header Secondary Component
 * Second navigation bar with camp categories menu
 * Used ONLY in reservation process, NOT in admin panel
 */
export default function HeaderSecondary() {
  const menuItems = [
    'Obozy i kolonie letnie',
    'Wycieczki szkolne',
    'Wyjazdy rodzinne',
    'Obozy zimowe',
    'Wyjazdy dla seniorów',
    'Imprezy integracyjne',
  ];

  return (
    <div className="border-t border-gray-200 relative" style={{ backgroundColor: '#f8f8f8', boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)', zIndex: 9 }}>
      <div className="max-w-container px-3 sm:px-6 py-3 sm:py-4">
        {/* Desktop menu - horizontal */}
        <nav className="hidden lg:flex items-center justify-between w-full">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              href="#"
              className="text-gray-700 hover:text-[#03adf0] transition-colors text-sm font-medium"
            >
              {item}
            </Link>
          ))}
        </nav>

        {/* Mobile menu - scrollable horizontal */}
        <nav className="lg:hidden flex items-center gap-4 overflow-x-auto scrollbar-hide -mx-3 px-3">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              href="#"
              className="text-gray-700 hover:text-[#03adf0] transition-colors text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0"
            >
              {item}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}