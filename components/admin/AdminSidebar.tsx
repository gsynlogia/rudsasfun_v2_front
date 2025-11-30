'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Tent, 
  CreditCard, 
  Calendar, 
  Settings, 
  LogOut
} from 'lucide-react';

/**
 * Admin Sidebar Component
 * Left navigation menu - simple version without collapse functionality
 * Icons and text are the same color (gray)
 */
export default function AdminSidebar() {
  const pathname = usePathname();

  const menuItems = [
    {
      href: '/admin-panel',
      icon: Tent,
      label: 'Obozy',
      key: 'camps',
    },
    {
      href: '/admin-panel/payments',
      icon: CreditCard,
      label: 'Płatności',
      key: 'payments',
    },
    {
      href: '/admin-panel/reservations',
      icon: Calendar,
      label: 'Rezerwacje',
      key: 'reservations',
    },
    {
      href: '/admin-panel/settings',
      icon: Settings,
      label: 'Ustawienia',
      key: 'settings',
    },
  ];

  const isActive = (href: string) => {
    if (href === '/admin-panel') {
      return pathname === '/admin-panel';
    }
    return pathname.startsWith(href);
  };

  return (
    <div
      className="fixed left-0 bg-white border-r border-gray-200 z-40"
      style={{ 
        borderRadius: 0,
        width: '256px',
        top: '84px',
        height: 'calc(-84px + 100vh)',
      }}
    >
      <nav className="h-full flex flex-col">
        {/* Menu Items */}
        <div className="flex-1 pt-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <div key={item.key}>
                {/* Separator - Full width */}
                {index > 0 && (
                  <div className="h-px bg-gray-200 w-full" />
                )}
                
                <Link
                  href={item.href}
                  className={`flex items-center transition-colors ${
                    active
                      ? 'bg-[#E0F2FF]'
                      : 'bg-white hover:bg-gray-50 active:bg-gray-100'
                  }`}
                  style={{ 
                    height: '60px',
                    paddingLeft: '24px',
                    paddingRight: '24px',
                    justifyContent: 'flex-start',
                    borderRadius: 0,
                    cursor: 'pointer',
                  }}
                >
                  <Icon 
                    className="flex-shrink-0"
                    style={{
                      width: '22px',
                      height: '22px',
                      strokeWidth: 2,
                      color: active ? '#0F172A' : '#9CA3AF',
                    }}
                  />
                  <span 
                    className="flex-1 ml-4"
                    style={{
                      fontSize: '16px',
                      fontWeight: 500,
                      lineHeight: '24px',
                      color: active ? '#0F172A' : '#9CA3AF',
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Separator before logout - Full width */}
        <div className="h-px bg-gray-200 w-full" />

        {/* Logout Button - At the bottom */}
        <div className="mt-auto">
          <button
            className="flex items-center w-full bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors"
            style={{ 
              height: '60px',
              paddingLeft: '24px',
              paddingRight: '24px',
              justifyContent: 'flex-start',
              borderRadius: 0,
              cursor: 'pointer',
            }}
          >
            <LogOut 
              className="flex-shrink-0"
              style={{
                width: '22px',
                height: '22px',
                strokeWidth: 2,
                color: '#9CA3AF',
              }}
            />
            <span 
              className="flex-1 ml-4"
              style={{
                fontSize: '16px',
                fontWeight: 500,
                lineHeight: '24px',
                color: '#9CA3AF',
              }}
            >
              Wyloguj
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
