'use client';

import { ReactNode } from 'react';
import HeaderTop from '../HeaderTop';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * Admin Layout Component
 * Provides consistent layout for admin panel with top bar and sidebar
 * Simple version without collapse functionality
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* Top Bar - Only first bar (no secondary menu) */}
      <div className="relative">
        <HeaderTop />
        
        {/* Sidebar positioned absolutely, starting from bottom edge of header */}
        <AdminSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex">
        {/* Spacer for sidebar width - fixed 256px */}
        <div 
          className="flex-shrink-0" 
          style={{ 
            width: '256px'
          }}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-auto" style={{ padding: '2px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
