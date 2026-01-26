'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface ClientViewSidebarProps {
  userId: number;
  userName: string | null;
  userEmail: string | null;
  onClose?: () => void;
}

interface MenuItem {
  label: string;
  path: string;
  iconSvg: string;
}

const menuItems: MenuItem[] = [
  {
    label: 'Aktualne rezerwacje',
    path: 'aktualne-rezerwacje',
    iconSvg: 'calendar-check',
  },
  {
    label: 'Historia rezerwacji',
    path: 'historia-rezerwacji',
    iconSvg: 'clock',
  },
  {
    label: 'Wiadomości i powiadomienia',
    path: 'wiadomosci-i-powiadomienia',
    iconSvg: 'bell',
  },
  {
    label: 'Transport z miast',
    path: 'transport-z-miast',
    iconSvg: 'bus',
  },
  {
    label: 'Kontakt do kierownictwa',
    path: 'kontakt-do-kierownictwa',
    iconSvg: 'contact',
  },
  {
    label: 'Cennik usług dodatkowych',
    path: 'cennik-uslug-dodatkowych',
    iconSvg: 'dollar',
  },
  {
    label: 'Faktury i płatności',
    path: 'faktury-i-platnosci',
    iconSvg: 'file-text',
  },
  {
    label: 'Obozowy niezbędnik i FAQ',
    path: 'obozowy-niezbednik-faq',
    iconSvg: 'help-circle',
  },
  {
    label: 'Do pobrania',
    path: 'do-pobrania',
    iconSvg: 'download',
  },
  {
    label: 'Gwarancja jakości',
    path: 'gwarancja-jakosci',
    iconSvg: 'star',
  },
  {
    label: 'Oceń portal',
    path: 'ocen-portal',
    iconSvg: 'star-half',
  },
  {
    label: 'Moje konto',
    path: 'moje-konto',
    iconSvg: 'settings',
  },
];

/**
 * Shorten email address for display
 */
function shortenEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return email || '';
  }

  try {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return email;
    const firstThree = localPart.substring(0, 3).toLowerCase();
    const domainParts = domain.split('.');
    const extension = domainParts.length > 0 ? domainParts[domainParts.length - 1].toLowerCase() : '';
    if (!extension) return email;
    return `${firstThree}...@...${extension}`;
  } catch {
    return email;
  }
}

/**
 * Get icon SVG content by name
 */
function getIconContent(iconName: string) {
  switch (iconName) {
    case 'calendar-check':
      return (
        <>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
          <path d="m9 16 2 2 4-4"></path>
        </>
      );
    case 'clock':
      return (
        <>
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </>
      );
    case 'bell':
      return (
        <>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </>
      );
    case 'bus':
      return (
        <>
          <path d="M8 6v6"></path>
          <path d="M15 6v6"></path>
          <path d="M2 12h19.6"></path>
          <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"></path>
          <circle cx="7" cy="18" r="2"></circle>
          <path d="M9 18h5"></path>
          <circle cx="16" cy="18" r="2"></circle>
        </>
      );
    case 'contact':
      return (
        <>
          <path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"></path>
          <rect width="18" height="18" x="3" y="4" rx="2"></rect>
          <circle cx="12" cy="10" r="2"></circle>
          <line x1="8" x2="8" y1="2" y2="4"></line>
          <line x1="16" x2="16" y1="2" y2="4"></line>
        </>
      );
    case 'dollar':
      return <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>;
    case 'file-text':
      return (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </>
      );
    case 'help-circle':
      return (
        <>
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </>
      );
    case 'download':
      return (
        <>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </>
      );
    case 'star':
      return <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>;
    case 'star-half':
      return <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>;
    case 'settings':
      return (
        <>
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </>
      );
    default:
      return <circle cx="12" cy="12" r="10"></circle>;
  }
}

export default function ClientViewSidebar({ userId, userName, userEmail, onClose }: ClientViewSidebarProps) {
  const pathname = usePathname();
  const basePath = `/client-view/${userId}`;

  return (
    <aside className="w-[400px] h-full lg:h-auto flex-shrink-0 relative">
      {/* Blue vertical tab on the left edge with vertical text and icons in one line */}
      <div className="hidden lg:flex absolute left-0 top-0 w-[55px] h-[240px] bg-amber-500 rounded-bl-[35px] flex-col items-center justify-between py-6 pb-4 z-10">
        <span
          className="text-white text-[0.85rem] font-semibold tracking-wide whitespace-nowrap flex-1 flex items-center py-2"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
          }}
        >
          Podgląd klienta
        </span>
        {/* Icon - eye for admin view */}
        <div className="flex items-center justify-center mb-4 mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </div>
      </div>

      {/* White card with shadow */}
      <div className="bg-white rounded-tr-[50px] shadow-[4px_0_15px_rgba(0,0,0,0.1)] p-6 relative lg:ml-[55px] h-full lg:h-auto">
        {/* Welcome section - showing viewed client info */}
        <div className="px-5 py-4 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-3">
            {/* Avatar icon */}
            <Image
              src="/wzor-dekoracyjny-3.svg"
              alt="Avatar"
              width={70}
              height={70}
              className="flex-shrink-0"
            />
            <div>
              <p className="text-xs text-amber-600 font-medium mb-1">Podgląd profilu</p>
              <h2 className="text-base font-semibold text-[#1f2937] leading-tight">
                {userName || 'Klient'}{' '}
                <span className="text-[#00a8e8]">
                  {userEmail ? shortenEmail(userEmail) : `ID: ${userId}`}
                </span>
              </h2>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <nav className="space-y-0">
          {menuItems.map((item, index) => {
            const href = `${basePath}/${item.path}`;
            const isActive = pathname === href || pathname?.startsWith(`${href}/`);
            const isLast = index === menuItems.length - 1;

            return (
              <Link
                key={item.path}
                href={href}
                onClick={() => onClose?.()}
                className={`
                  flex flex-row items-center justify-between w-full min-h-[48px] transition-colors cursor-pointer
                  ${!isLast ? 'border-b border-[#e5e7eb]' : ''}
                  ${isActive
                    ? 'bg-[#FEF3C7]'
                    : 'bg-white hover:bg-gray-50'
                  }
                `}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingLeft: '20px',
                  paddingRight: '20px',
                }}
              >
                {/* Left Icon */}
                <svg
                  className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-amber-700' : 'text-[#9ca3af]'}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {getIconContent(item.iconSvg)}
                </svg>

                {/* Label */}
                <span
                  className={`flex-1 text-sm font-medium ml-3 ${
                    isActive ? 'text-amber-800' : 'text-[#4b5563]'
                  }`}
                >
                  {item.label}
                </span>

                {/* Right Arrow */}
                <svg
                  className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-amber-600' : 'text-[#9ca3af]'}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
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
