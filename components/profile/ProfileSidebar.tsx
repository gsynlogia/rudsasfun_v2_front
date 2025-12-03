'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { authService, type User } from '@/lib/services/AuthService';

interface ProfileSidebarProps {
  onClose?: () => void;
}

interface MenuItem {
  label: string;
  href: string;
  iconSvg: string;
}

const menuItems: MenuItem[] = [
  { 
    label: 'Aktualne rezerwacje', 
    href: '/profil/aktualne-rezerwacje', 
    iconSvg: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="m9 16 2 2 4-4"></path>'
  },
  { 
    label: 'Historia rezerwacji', 
    href: '/profil/historia-rezerwacji', 
    iconSvg: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>'
  },
  { 
    label: 'Wiadomości i powiadomienia', 
    href: '/profil/wiadomosci-i-powiadomienia', 
    iconSvg: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>'
  },
  { 
    label: 'Transport z miast', 
    href: '/profil/transport-z-miast', 
    iconSvg: '<path d="M8 6v6"></path><path d="M15 6v6"></path><path d="M2 12h19.6"></path><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"></path><circle cx="7" cy="18" r="2"></circle><path d="M9 18h5"></path><circle cx="16" cy="18" r="2"></circle>'
  },
  { 
    label: 'Kontakt do kierownictwa', 
    href: '/profil/kontakt-do-kierownictwa', 
    iconSvg: '<path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><circle cx="12" cy="10" r="2"></circle><line x1="8" x2="8" y1="2" y2="4"></line><line x1="16" x2="16" y1="2" y2="4"></line>'
  },
  { 
    label: 'Cennik usług dodatkowych', 
    href: '/profil/cennik-uslug-dodatkowych', 
    iconSvg: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>'
  },
  { 
    label: 'Faktury i płatności', 
    href: '/profil/faktury-i-platnosci', 
    iconSvg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>'
  },
  { 
    label: 'Obozowy niezbędnik i FAQ', 
    href: '/profil/obozowy-niezbednik-faq', 
    iconSvg: '<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>'
  },
  { 
    label: 'Do pobrania', 
    href: '/profil/do-pobrania', 
    iconSvg: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>'
  },
  { 
    label: 'Gwarancja jakości', 
    href: '/profil/gwarancja-jakosci', 
    iconSvg: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>'
  },
  { 
    label: 'Oceń portal', 
    href: '/profil/ocen-portal', 
    iconSvg: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>'
  },
  { 
    label: 'Moje konto', 
    href: '/profil/moje-konto', 
    iconSvg: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>'
  },
];

/**
 * Shorten email address for display
 * Format: first 3 letters + ... + @ + ... + domain extension
 * Example: szymon.guzik@gmail.com -> szy...@...com
 */
function shortenEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return email || '';
  }
  
  try {
    const [localPart, domain] = email.split('@');
    
    if (!localPart || !domain) {
      return email;
    }
    
    // Get first 3 characters of local part (lowercase)
    const firstThree = localPart.substring(0, 3).toLowerCase();
    
    // Get domain extension (last part after last dot)
    const domainParts = domain.split('.');
    const extension = domainParts.length > 0 ? domainParts[domainParts.length - 1].toLowerCase() : '';
    
    if (!extension) {
      return email;
    }
    
    return `${firstThree}...@...${extension}`;
  } catch (error) {
    console.error('Error shortening email:', error);
    return email;
  }
}

export default function ProfileSidebar({ onClose }: ProfileSidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Try to get user from localStorage first
        const storedUser = authService.getCurrentUser();
        if (storedUser) {
          setUser(storedUser);
          setIsLoading(false);
        } else {
          // If not in localStorage, verify token with backend
          const verifiedUser = await authService.verifyToken();
          setUser(verifiedUser);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);
  
  return (
    <aside className="w-[400px] h-full lg:h-auto flex-shrink-0 relative">
      {/* Blue vertical tab on the left edge with vertical text and icons in one line */}
      <div className="hidden lg:flex absolute left-0 top-0 w-[55px] h-[240px] bg-[#00a8e8] rounded-bl-[35px] flex-col items-center justify-between py-6 pb-4 z-10">
        <span 
          className="text-white text-[0.85rem] font-semibold tracking-wide whitespace-nowrap flex-1 flex items-center py-2"
          style={{ 
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)'
          }}
        >
          Uczestnicy obozów
        </span>
        {/* Icon - white element */}
        <div className="flex items-center justify-center mb-4 mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <path d="M16 3.128a4 4 0 0 1 0 7.744"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
        </div>
      </div>
      
      {/* White card with shadow - matching reference styles: border-radius: 0 50px 0 0 */}
      <div className="bg-white rounded-tr-[50px] shadow-[4px_0_15px_rgba(0,0,0,0.1)] p-6 relative lg:ml-[55px] h-full lg:h-auto">
        {/* Welcome section - NOT a menu item, no arrow, no hover */}
        <div className="px-5 py-4 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-3">
            {/* Avatar icon - decorative pattern from wzór-dekoracyjny-3.svg */}
            <Image
              src="/wzor-dekoracyjny-3.svg"
              alt="Avatar"
              width={70}
              height={70}
              className="flex-shrink-0"
            />
            <div>
              <h2 className="text-base font-semibold text-[#1f2937] leading-tight">
                {isLoading ? (
                  'Witaj!'
                ) : (
                  <>
                    Witaj! <span className="text-[#00a8e8]">
                      {user?.email ? shortenEmail(user.email) : (user?.login ? shortenEmail(user.login) : 'Użytkowniku')}
                    </span>
                  </>
                )}
              </h2>
            </div>
          </div>
        </div>
        
        {/* Menu items */}
        <nav className="space-y-0">
          {menuItems.map((item, index) => {
            const isActive = pathname === item.href;
            const isLast = index === menuItems.length - 1;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose?.()}
                className={`
                  flex flex-row items-center justify-between w-full min-h-[48px] transition-colors cursor-pointer
                  ${!isLast ? 'border-b border-[#e5e7eb]' : ''}
                  ${isActive 
                    ? 'bg-[#EAF6FE]' 
                    : 'bg-white hover:bg-gray-50'
                  }
                `}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingLeft: '20px',
                  paddingRight: '20px'
                }}
              >
                {/* Left Icon - fixed size, no shrink/grow */}
                <svg 
                  className={`w-5 h-5 flex-shrink-0 flex-grow-0 ${isActive ? 'text-[#1f2937]' : 'text-[#9ca3af]'}`}
                  viewBox="0 0 24 24" 
                  fill={isActive ? "currentColor" : "none"} 
                  stroke="currentColor" 
                  strokeWidth={isActive ? "0" : "2"}
                  style={{ flexShrink: 0, flexGrow: 0 }}
                >
                    {item.iconSvg === '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="m9 16 2 2 4-4"></path>' && (
                      <>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                        <path d="m9 16 2 2 4-4"></path>
                      </>
                    )}
                    {item.iconSvg === '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>' && (
                      <>
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </>
                    )}
                    {item.iconSvg === '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>' && (
                      <>
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                      </>
                    )}
                    {item.iconSvg === '<path d="M8 6v6"></path><path d="M15 6v6"></path><path d="M2 12h19.6"></path><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"></path><circle cx="7" cy="18" r="2"></circle><path d="M9 18h5"></path><circle cx="16" cy="18" r="2"></circle>' && (
                      <>
                        <path d="M8 6v6"></path>
                        <path d="M15 6v6"></path>
                        <path d="M2 12h19.6"></path>
                        <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"></path>
                        <circle cx="7" cy="18" r="2"></circle>
                        <path d="M9 18h5"></path>
                        <circle cx="16" cy="18" r="2"></circle>
                      </>
                    )}
                    {item.iconSvg === '<path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><circle cx="12" cy="10" r="2"></circle><line x1="8" x2="8" y1="2" y2="4"></line><line x1="16" x2="16" y1="2" y2="4"></line>' && (
                      <>
                        <path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"></path>
                        <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                        <circle cx="12" cy="10" r="2"></circle>
                        <line x1="8" x2="8" y1="2" y2="4"></line>
                        <line x1="16" x2="16" y1="2" y2="4"></line>
                      </>
                    )}
                    {item.iconSvg === '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>' && (
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    )}
                    {item.iconSvg === '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>' && (
                      <>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </>
                    )}
                    {item.iconSvg === '<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>' && (
                      <>
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </>
                    )}
                    {item.iconSvg === '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>' && (
                      <>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </>
                    )}
                    {item.iconSvg === '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>' && (
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    )}
                    {item.iconSvg === '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>' && (
                      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                    )}
                    {item.iconSvg === '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>' && (
                      <>
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                      </>
                    )}
                  </svg>
                
                {/* Text label - between icon and arrow, with ellipsis */}
                <span 
                  className={`text-sm ml-3 ${isActive ? 'text-[#1f2937] font-semibold' : 'text-[#9ca3af] font-normal'}`}
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flexGrow: 1,
                    flexShrink: 1
                  }}
                >
                  {item.label}
                </span>
                
                {/* Right Arrow - fixed size, no shrink/grow */}
                <svg 
                  className={`w-4 h-4 flex-shrink-0 flex-grow-0 ml-3 ${isActive ? 'text-[#00a8e8]' : 'text-[#9ca3af]'}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  style={{ flexShrink: 0, flexGrow: 0 }}
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
