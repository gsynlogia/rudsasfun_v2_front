'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Calendar, 
  History, 
  Bell, 
  MapPin, 
  Phone, 
  DollarSign, 
  FileText, 
  HelpCircle, 
  Download, 
  Shield, 
  Star, 
  User 
} from 'lucide-react';

interface ProfileSidebarProps {
  onClose?: () => void;
}

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const menuItems: MenuItem[] = [
  { label: 'Aktualne rezerwacje', href: '/profil/aktualne-rezerwacje', icon: Calendar },
  { label: 'Historia rezerwacji', href: '/profil/historia-rezerwacji', icon: History },
  { label: 'Wiadomości i powiadomienia', href: '/profil/wiadomosci-i-powiadomienia', icon: Bell },
  { label: 'Transport z miast', href: '/profil/transport-z-miast', icon: MapPin },
  { label: 'Kontakt do kierownictwa', href: '/profil/kontakt-do-kierownictwa', icon: Phone },
  { label: 'Cennik usług dodatkowych', href: '/profil/cennik-uslug-dodatkowych', icon: DollarSign },
  { label: 'Faktury i płatności', href: '/profil/faktury-i-platnosci', icon: FileText },
  { label: 'Obozowy niezbędnik i FAQ', href: '/profil/obozowy-niezbednik-faq', icon: HelpCircle },
  { label: 'Do pobrania', href: '/profil/do-pobrania', icon: Download },
  { label: 'Gwarancja jakości', href: '/profil/gwarancja-jakosci', icon: Shield },
  { label: 'Oceń portal', href: '/profil/ocen-portal', icon: Star },
  { label: 'Moje konto', href: '/profil/moje-konto', icon: User },
];

/**
 * ProfileSidebar Component
 * Left sidebar navigation for user profile pages
 */
export default function ProfileSidebar({ onClose }: ProfileSidebarProps) {
  const pathname = usePathname();
  
  return (
    <aside className="w-64 sm:w-72 h-full lg:h-auto p-4 sm:p-6 flex-shrink-0 relative bg-gradient-to-b from-blue-50 to-blue-100 lg:bg-transparent overflow-y-auto">
      {/* Blue vertical tab on the left edge with vertical text - Hidden on mobile */}
      <div className="hidden lg:flex absolute left-0 top-0 bottom-0 w-8 bg-[#03adf0] rounded-r-lg items-center justify-center">
        <div 
          className="text-white text-[11px] font-semibold"
          style={{ 
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)'
          }}
        >
          Uczestnicy obozów
        </div>
      </div>
      
      {/* White card with shadow */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 relative lg:ml-10 h-full lg:h-auto">
        {/* Welcome section */}
        <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#03adf0] flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">HEJ</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-900">Witaj, Andrzej</p>
            </div>
          </div>
        </div>
        
        {/* Menu items */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose?.()}
                className={`
                  flex items-center justify-between w-full px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-[#EAF6FE] text-[#03adf0]' 
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <Icon 
                    className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${isActive ? 'text-[#03adf0]' : 'text-gray-500'}`} 
                  />
                  <span className="text-xs sm:text-sm font-medium truncate">{item.label}</span>
                </div>
                <svg 
                  className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${isActive ? 'text-[#03adf0]' : 'text-gray-400'}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

