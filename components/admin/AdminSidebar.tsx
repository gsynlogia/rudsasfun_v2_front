'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Tent, 
  CreditCard, 
  Calendar, 
  Truck,
  UtensilsCrossed,
  FileText,
  Settings, 
  LogOut
} from 'lucide-react';
import { authService } from '@/lib/services/AuthService';

/**
 * Admin Sidebar Component
 * Left navigation menu - simple version without collapse functionality
 * Icons and text are the same color (gray)
 * Only shows sections user has access to
 */
export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [accessibleSections, setAccessibleSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserSections = async () => {
      const user = await authService.verifyToken();
      if (user && user.accessible_sections) {
        setAccessibleSections(user.accessible_sections);
      } else {
        // Fallback: check from stored user
        const storedUser = authService.getCurrentUser();
        if (storedUser && storedUser.accessible_sections) {
          setAccessibleSections(storedUser.accessible_sections);
        }
      }
      setLoading(false);
    };
    loadUserSections();
  }, []);

  const handleLogout = () => {
    authService.logout();
    router.push('/admin-panel/login');
  };

  const allMenuItems = [
    {
      href: '/admin-panel',
      icon: Calendar,
      label: 'Rezerwacje',
      key: 'reservations',
      section: 'reservations',
    },
    {
      href: '/admin-panel/camps',
      icon: Tent,
      label: 'Obozy',
      key: 'camps',
      section: 'camps',
    },
    {
      href: '/admin-panel/payments',
      icon: CreditCard,
      label: 'Płatności',
      key: 'payments',
      section: 'payments',
    },
    {
      href: '/admin-panel/transports',
      icon: Truck,
      label: 'Transport',
      key: 'transports',
      section: 'transports',
    },
    {
      href: '/admin-panel/diets',
      icon: UtensilsCrossed,
      label: 'Diety',
      key: 'diets',
      section: 'diets',
    },
    {
      href: '/admin-panel/cms',
      icon: FileText,
      label: 'CMS',
      key: 'sources',
      section: 'sources',
    },
  ];

  // Filter menu items based on accessible sections
  // Admin users have access to all sections
  const user = authService.getCurrentUser();
  const isAdmin = user?.groups?.includes('admin') || false;
  const menuItems = isAdmin 
    ? allMenuItems 
    : allMenuItems.filter(item => accessibleSections.includes(item.section));

  const isActive = (href: string) => {
    if (href === '/admin-panel') {
      // For main page, only active if exactly /admin-panel (not /admin-panel/camps, etc.)
      return pathname === '/admin-panel' || pathname === '/admin-panel/';
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
          {loading ? (
            <div className="flex items-center justify-center h-20">
              <div className="text-sm text-gray-500">Ładowanie...</div>
            </div>
          ) : (
            menuItems.map((item, index) => {
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
            })
          )}
        </div>

        {/* Separator before settings and logout - Full width */}
        <div className="h-px bg-gray-200 w-full" />

        {/* Settings - Before logout */}
        <Link
          href="/admin-panel/settings"
          className={`flex items-center transition-colors ${
            pathname.startsWith('/admin-panel/settings')
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
          <Settings 
            className="flex-shrink-0"
            style={{
              width: '22px',
              height: '22px',
              strokeWidth: 2,
              color: pathname.startsWith('/admin-panel/settings') ? '#0F172A' : '#9CA3AF',
            }}
          />
          <span 
            className="flex-1 ml-4"
            style={{
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: '24px',
              color: pathname.startsWith('/admin-panel/settings') ? '#0F172A' : '#9CA3AF',
            }}
          >
            Ustawienia
          </span>
        </Link>

        {/* Separator before logout - Full width */}
        <div className="h-px bg-gray-200 w-full" />

        {/* Logout Button - At the bottom */}
        <div className="mt-auto">
          <button
            onClick={handleLogout}
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
