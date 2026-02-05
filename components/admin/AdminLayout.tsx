'use client';

import { ReactNode, useState, useEffect } from 'react';
import { Bell, X, CreditCard, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

import AdminSidebar from './AdminSidebar';
import { useSidebar } from '@/context/SidebarContext';

interface AdminLayoutProps {
  children: ReactNode;
}

// Przykładowe powiadomienia
const sampleNotifications = [
  {
    id: 1,
    type: 'payment',
    title: 'Nowa wpłata',
    message: 'Otrzymano wpłatę 1500 PLN dla rezerwacji REZ-2026-620',
    time: '5 min temu',
    read: false,
  },
  {
    id: 2,
    type: 'reservation',
    title: 'Nowa rezerwacja',
    message: 'Utworzono nową rezerwację REZ-2026-621 - Obóz Władysławowo',
    time: '15 min temu',
    read: false,
  },
  {
    id: 3,
    type: 'alert',
    title: 'Zbliża się termin',
    message: 'Turnus "Władysławowo Lipiec I" rozpoczyna się za 3 dni',
    time: '1 godz. temu',
    read: true,
  },
  {
    id: 4,
    type: 'success',
    title: 'Umowa podpisana',
    message: 'Klient Jan Kowalski podpisał umowę dla REZ-2026-615',
    time: '2 godz. temu',
    read: true,
  },
  {
    id: 5,
    type: 'payment',
    title: 'Płatność zaległa',
    message: 'Brak wpłaty dla REZ-2026-590 - termin minął 2 dni temu',
    time: '3 godz. temu',
    read: true,
  },
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'payment':
      return <CreditCard className="w-5 h-5 text-green-500" />;
    case 'reservation':
      return <Calendar className="w-5 h-5 text-blue-500" />;
    case 'alert':
      return <AlertCircle className="w-5 h-5 text-orange-500" />;
    case 'success':
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    default:
      return <Bell className="w-5 h-5 text-gray-500" />;
  }
};

/**
 * Inner layout component that uses sidebar context
 */
function AdminLayoutInner({ children }: AdminLayoutProps) {
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const unreadCount = sampleNotifications.filter(n => !n.read).length;
  const { sidebarWidth, isLoading } = useSidebar();
  
  // Use default width during loading to prevent layout shift
  const effectiveWidth = isLoading ? '256px' : sidebarWidth;

  // Close panel on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isNotificationPanelOpen) {
        setIsNotificationPanelOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isNotificationPanelOpen]);

  return (
    <div className="h-screen w-full bg-white flex">
      {/* Sidebar with logo */}
      <AdminSidebar />

      {/* Main Content Area - scrollable, takes remaining space */}
      <div 
        className="flex-1 overflow-auto relative transition-all duration-300 pl-0.5"
        style={{ marginLeft: effectiveWidth }}
      >
        {/* Notification icon - fixed in top-right corner */}
        <button 
          className="fixed top-11 right-3 z-50 w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors cursor-pointer"
          title="Powiadomienia"
          onClick={() => setIsNotificationPanelOpen(true)}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Main Content */}
        <main>
          {children}
        </main>
      </div>

      {/* Overlay when panel is open */}
      {isNotificationPanelOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-50 transition-opacity"
          onClick={() => setIsNotificationPanelOpen(false)}
        />
      )}

      {/* Notification Panel - slides from right */}
      <div 
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isNotificationPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#03adf0]" />
            <h2 className="text-lg font-semibold text-gray-800">Powiadomienia</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {unreadCount} nowe
              </span>
            )}
          </div>
          <button
            onClick={() => setIsNotificationPanelOpen(false)}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            title="Zamknij"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto h-[calc(100%-64px)]">
          {sampleNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                !notification.read ? 'bg-blue-50/50' : ''
              }`}
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-[#03adf0] rounded-full flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {notification.time}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Admin Layout Component
 * Provides consistent layout for admin panel with sidebar
 * No top navbar - more space for content
 * Notification icon in top-right corner with slide-out panel
 * Note: SidebarProvider is in admin-panel/layout.tsx to persist state during SPA navigation
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return <AdminLayoutInner>{children}</AdminLayoutInner>;
}