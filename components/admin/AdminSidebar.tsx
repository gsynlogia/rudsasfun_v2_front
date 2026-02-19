'use client';

import {
  Tent,
  CreditCard,
  Calendar,
  Truck,
  UtensilsCrossed,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  Tag,
  Shield,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useSidebar } from '@/context/SidebarContext';
import { authService } from '@/lib/services/AuthService';

/**
 * Admin Sidebar Component
 * Left navigation menu with collapse functionality
 * Dark theme matching the filter bar (slate-800)
 * Collapsible to icons only with tooltips
 */
export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [accessibleSections, setAccessibleSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [canAccessSuperFunctions, setCanAccessSuperFunctions] = useState(false);
  const { isCollapsed, setIsCollapsed, sidebarWidth, isLoading: sidebarLoading } = useSidebar();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    const loadUserSections = async () => {
      const user = await authService.verifyToken();
      if (user) {
        if (user.accessible_sections) {
          setAccessibleSections(user.accessible_sections);
        }
        setCanAccessSuperFunctions(
          user.id === 0 ||
          user.user_type === 'admin' ||
          !!(user.groups && user.groups.includes('admin')),
        );
      } else {
        const storedUser = authService.getCurrentUser();
        if (storedUser) {
          if (storedUser.accessible_sections) {
            setAccessibleSections(storedUser.accessible_sections);
          }
          setCanAccessSuperFunctions(
            storedUser.id === 0 ||
            storedUser.user_type === 'admin' ||
            !!(storedUser.groups && storedUser.groups.includes('admin')),
          );
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
    { href: '/admin-panel', icon: Calendar, label: 'Rezerwacje', key: 'reservations', section: 'reservations' },
    { href: '/admin-panel/camps', icon: Tent, label: 'Obozy', key: 'camps', section: 'camps' },
    { href: '/admin-panel/payments', icon: CreditCard, label: 'Płatności', key: 'payments', section: 'payments' },
    { href: '/admin-panel/transports', icon: Truck, label: 'Transport', key: 'transports', section: 'transports' },
    { href: '/admin-panel/diets', icon: UtensilsCrossed, label: 'Diety', key: 'diets', section: 'diets' },
    { href: '/admin-panel/promotions', icon: Tag, label: 'Promocje', key: 'promotions', section: 'promotions' },
    { href: '/admin-panel/protections', icon: Shield, label: 'Ochrony', key: 'protections', section: 'protections' },
    { href: '/admin-panel/cms', icon: FileText, label: 'CMS', key: 'cms', section: 'cms' },
    { href: '/admin-panel/wiadomosci', icon: MessageSquare, label: 'Wiadomości', key: 'wiadomosci', section: 'cms' },
    { href: '/admin-panel/settings', icon: Settings, label: 'Ustawienia', key: 'settings', section: 'settings' },
  ];

  const menuItemsWithSuperFunctions = [...allMenuItems];
  if (!loading && canAccessSuperFunctions) {
    menuItemsWithSuperFunctions.push({
      href: '/admin-panel/settings/super-functions',
      icon: Sparkles,
      label: 'Super funkcje',
      key: 'super-functions',
      section: 'settings',
    });
  }

  const user = authService.getCurrentUser();
  interface UserWithDefaults { groups: string[]; }
  const defaultUser: UserWithDefaults = { groups: [] };
  const userWithDefaults: UserWithDefaults = user || defaultUser;
  const isAdmin = userWithDefaults.groups.includes('admin');
  const baseMenuItems = isAdmin
    ? menuItemsWithSuperFunctions
    : menuItemsWithSuperFunctions.filter(item => accessibleSections.includes(item.section));

  const menuItems = baseMenuItems.filter(item => {
    if (item.key === 'super-functions') return canAccessSuperFunctions;
    return true;
  });

  const isActive = (href: string) => {
    const path = pathname || '';
    if (href === '/admin-panel') {
      return path === '/admin-panel' || path === '/admin-panel/';
    }
    if (href === '/admin-panel/settings') {
      return path.startsWith('/admin-panel/settings') && !path.startsWith('/admin-panel/settings/super-functions');
    }
    return path.startsWith(href);
  };

  // Skeleton during initial load from localStorage
  if (sidebarLoading) {
    return (
      <div
        className="fixed left-0 bg-slate-800 z-50 shadow-xl animate-pulse"
        style={{ width: '256px', top: 0, height: '100vh' }}
      >
        {/* Logo skeleton */}
        <div className="flex items-center justify-center" style={{ height: '64px' }}>
          <div className="bg-slate-700 rounded-lg w-24 h-10" />
        </div>
        {/* Menu items skeleton */}
        <div className="pt-2">
          {[...Array(10)].map((_, i) => (
            <div key={i}>
              {i > 0 && <div className="h-px bg-slate-700 w-full" />}
              <div className="flex items-center h-[52px] px-6 gap-4">
                <div className="w-6 h-6 bg-slate-700 rounded" />
                <div className="h-4 bg-slate-700 rounded flex-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed left-0 bg-slate-800 z-50 transition-all duration-300 ease-in-out shadow-xl"
      style={{
        width: sidebarWidth,
        top: 0,
        height: '100vh',
      }}
    >
      {/* Logo section */}
      <div
        className="flex items-center justify-center relative"
        style={{ height: '64px' }}
      >
        <Link href="/admin-panel" className="cursor-pointer">
          <div className={`bg-white rounded-lg p-2 shadow-md transition-all duration-300 ${isCollapsed ? 'scale-75' : ''}`}>
            <Image
              src="/logo.png"
              alt="Radsas Fun Logo"
              width={isCollapsed ? 40 : 100}
              height={isCollapsed ? 20 : 40}
              className="h-auto w-auto"
              style={{
                maxHeight: isCollapsed ? '28px' : '36px',
                maxWidth: isCollapsed ? '40px' : '90px',
              }}
              priority
            />
          </div>
        </Link>

        {/* Collapse toggle button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-800 transition-colors cursor-pointer z-10"
          title={isCollapsed ? 'Rozwiń menu' : 'Zwiń menu'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-white" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-white" />
          )}
        </button>
      </div>

      <nav className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Menu Items */}
        <div className="flex-1 pt-2 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-20">
              <div className="text-sm text-slate-400">Ładowanie...</div>
            </div>
          ) : (
            menuItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const isHovered = hoveredItem === item.key;

              return (
                <div key={item.key} className="relative">
                  {index > 0 && (
                    <div className="h-px bg-slate-700 w-full" />
                  )}

                  <Link
                    href={item.href}
                    className={`flex items-center transition-all duration-200 ${
                      active
                        ? 'bg-[#03adf0] text-white'
                        : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                    style={{
                      height: '52px',
                      paddingLeft: isCollapsed ? '24px' : '24px',
                      paddingRight: '24px',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                    }}
                    onMouseEnter={() => setHoveredItem(item.key)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <Icon
                      className="flex-shrink-0"
                      style={{
                        width: '22px',
                        height: '22px',
                        strokeWidth: 2,
                      }}
                    />
                    {!isCollapsed && (
                      <span
                        className="ml-4 whitespace-nowrap overflow-hidden transition-all duration-300"
                        style={{
                          fontSize: '15px',
                          fontWeight: 500,
                        }}
                      >
                        {item.label}
                      </span>
                    )}
                  </Link>

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && isHovered && (
                    <div
                      className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50"
                      style={{ pointerEvents: 'none' }}
                    >
                      <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-sm font-medium whitespace-nowrap border border-slate-700">
                        {item.label}
                        {/* Arrow */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full">
                          <div className="border-8 border-transparent border-r-slate-900" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Separator before logout */}
        <div className="h-px bg-slate-700 w-full" />

        {/* Logout Button */}
        <div className="relative">
          <button
            onClick={handleLogout}
            className="flex items-center w-full text-slate-400 hover:bg-slate-700 hover:text-white transition-all duration-200"
            style={{
              height: '52px',
              paddingLeft: isCollapsed ? '24px' : '24px',
              paddingRight: '24px',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
            }}
            onMouseEnter={() => setHoveredItem('logout')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <LogOut
              className="flex-shrink-0"
              style={{
                width: '22px',
                height: '22px',
                strokeWidth: 2,
              }}
            />
            {!isCollapsed && (
              <span
                className="ml-4 whitespace-nowrap"
                style={{
                  fontSize: '15px',
                  fontWeight: 500,
                }}
              >
                Wyloguj
              </span>
            )}
          </button>

          {/* Tooltip for collapsed logout */}
          {isCollapsed && hoveredItem === 'logout' && (
            <div
              className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50"
              style={{ pointerEvents: 'none' }}
            >
              <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-sm font-medium whitespace-nowrap border border-slate-700">
                Wyloguj
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full">
                  <div className="border-8 border-transparent border-r-slate-900" />
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}

/*
========================================
BACKUP - POPRZEDNIA WERSJA (BIAŁA)
========================================
Jeśli chcesz przywrócić poprzednią wersję, skopiuj poniższy kod:

- Tło: bg-white
- Szerokość: 256px (stała, bez zwijania)
- Logo: 150x60 bez białego kontenera
- Kolory: gray dla nieaktywnych, slate-900 dla aktywnych
- Aktywny element: bg-[#E0F2FF]

Główne różnice:
1. Brak możliwości zwijania
2. Białe tło zamiast ciemnego
3. Logo bez białego kontenera
4. Separator: bg-gray-200 zamiast bg-slate-700
5. Aktywny link: bg-[#E0F2FF] zamiast bg-[#03adf0]
========================================
*/