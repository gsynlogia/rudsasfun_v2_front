'use client';

import { ReactNode, useState } from 'react';
import HeaderTop from '../HeaderTop';
import Footer from '../Footer';
import ProfileSidebar from './ProfileSidebar';
import { Menu, X } from 'lucide-react';

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
    <div className="min-h-screen w-full flex flex-col">
      {/* Top Bar - Existing component */}
      <HeaderTop />
      
      {/* Main Content Area with Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row bg-gradient-to-b from-blue-50 to-blue-100 min-h-screen relative">
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

        {/* Left Sidebar - Hidden on mobile, visible on desktop */}
        <div className={`
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          fixed lg:static
          top-0 left-0
          h-full lg:h-auto
          z-50 lg:z-auto
          transition-transform duration-300 ease-in-out
          lg:transition-none
        `}>
          <ProfileSidebar onClose={() => setMobileMenuOpen(false)} />
        </div>
        
        {/* Right Content Area */}
        <main className="flex-1 bg-gray-50 min-h-screen w-full lg:w-auto">
          <div className="max-w-container mx-auto px-3 sm:px-6 py-4 sm:py-8">
            {children}
          </div>
        </main>
      </div>
      
      {/* Footer - Existing component */}
      <Footer />
    </div>
  );
}

