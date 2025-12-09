'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import { Settings as SettingsIcon, Users, UserCog } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Admin Panel - Settings Page
 * Route: /admin-panel/settings
 * 
 * Settings page with three buttons side by side: General, Users, Groups
 */
export default function SettingsPage() {
  const pathname = usePathname();

  const sections = [
    {
      id: 'general',
      href: '/admin-panel/settings',
      label: 'Ogólne',
      icon: SettingsIcon,
    },
    {
      id: 'users',
      href: '/admin-panel/settings/users',
      label: 'Użytkownicy',
      icon: Users,
    },
    {
      id: 'groups',
      href: '/admin-panel/settings/groups',
      label: 'Grupy',
      icon: UserCog,
    },
  ];

  return (
    <SectionGuard section="settings">
      <AdminLayout>
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Ustawienia</h1>
          <p className="text-sm text-gray-600">Zarządzaj ustawieniami systemu</p>
        </div>

        {/* Three Buttons Side by Side */}
        <div className="flex gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = pathname === section.href;
            
            return (
              <Link
                key={section.id}
                href={section.href}
                className={`
                  flex-1 flex items-center justify-center gap-3 px-6 py-8 bg-white rounded-lg shadow transition-colors
                  ${isActive
                    ? 'bg-[#E0F2FF] border-2 border-[#03adf0]'
                    : 'hover:bg-gray-50 border-2 border-transparent'
                  }
                `}
                style={{ 
                  borderRadius: 0,
                  cursor: 'pointer',
                }}
              >
                <Icon 
                  size={24}
                  style={{
                    strokeWidth: 2,
                    color: isActive ? '#03adf0' : '#6B7280',
                  }}
                />
                <span className="text-lg font-medium" style={{ color: isActive ? '#03adf0' : '#6B7280' }}>
                  {section.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </AdminLayout>
    </SectionGuard>
  );
}
