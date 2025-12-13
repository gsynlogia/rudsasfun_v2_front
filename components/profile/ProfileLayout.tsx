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
          <div className="hidden lg:block flex-shrink-0 lg:w-[400px]">
            <ProfileSidebar />
          </div>

          {/* Right Content Area - narrower to make room for wider sidebar */}
          <div className="flex-1 w-full lg:pl-6">
            {children}
          </div>
        </div>
      </main>

      {/* Footer - Existing component */}
      <Footer />
    </div>
  );
}

