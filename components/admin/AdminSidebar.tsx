'use client';

import {
  Tent,
  CreditCard,
  Calendar,
  Truck,
  UtensilsCrossed,
  FileText,
  Settings,
  LogOut,
  Tag,
  Shield,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
  const [isUserZero, setIsUserZero] = useState(false);

  useEffect(() => {
    const loadUserSections = async () => {
      const user = await authService.verifyToken();
      if (user) {
        if (user.accessible_sections) {
          setAccessibleSections(user.accessible_sections);
        }
        // Check if user ID is 0
        if (user.id === 0) {
          setIsUserZero(true);
        }
      } else {
        // Fallback: check from stored user
        const storedUser = authService.getCurrentUser();
        if (storedUser) {
          if (storedUser.accessible_sections) {
            setAccessibleSections(storedUser.accessible_sections);
          }
          if (storedUser.id === 0) {
            setIsUserZero(true);
          }
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
      href: '/admin-panel/promotions',
      icon: Tag,
      label: 'Promocje',
      key: 'promotions',
      section: 'promotions',
    },
    {
      href: '/admin-panel/protections',
      icon: Shield,  // Shield icon for protections
      label: 'Ochrony',
      key: 'protections',
      section: 'protections',
    },
    {
      href: '/admin-panel/cms',
      icon: FileText,
      label: 'CMS',
      key: 'cms',
      section: 'cms',
    },
    {
      href: '/admin-panel/settings',
      icon: Settings,
      label: 'Ustawienia',
      key: 'settings',
      section: 'settings',
    },
  ];

  // Add Super Functions to menu items for user ID 0
  const menuItemsWithSuperFunctions = [...allMenuItems];
  if (!loading && isUserZero) {
    menuItemsWithSuperFunctions.push({
      href: '/admin-panel/settings/super-functions',
      icon: Sparkles,
      label: 'Super funkcje',
      key: 'super-functions',
      section: 'settings', // Use settings section for access control
    });
  }

  // Filter menu items based on accessible sections
  // Admin users have access to all sections
  const user = authService.getCurrentUser();

  // Interface with default values
  interface UserWithDefaults {
    groups: string[];
  }

  const defaultUser: UserWithDefaults = {
    groups: [],
  };

  const userWithDefaults: UserWithDefaults = user || defaultUser;
  const isAdmin = userWithDefaults.groups.includes('admin');
  const baseMenuItems = isAdmin
    ? menuItemsWithSuperFunctions
    : menuItemsWithSuperFunctions.filter(item => accessibleSections.includes(item.section));

  // Filter out super-functions if not user ID 0
  const menuItems = baseMenuItems.filter(item => {
    if (item.key === 'super-functions') {
      return isUserZero;
    }
    return true;
  });

  const isActive = (href: string) => {
    if (href === '/admin-panel') {
      // For main page, only active if exactly /admin-panel (not /admin-panel/camps, etc.)
      return pathname === '/admin-panel' || pathname === '/admin-panel/';
    }
    if (href === '/admin-panel/settings') {
      // Settings is active for /admin-panel/settings but not for /admin-panel/settings/super-functions
      return pathname.startsWith('/admin-panel/settings') && !pathname.startsWith('/admin-panel/settings/super-functions') && pathname !== '/admin-panel/settings/super-functions';
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
