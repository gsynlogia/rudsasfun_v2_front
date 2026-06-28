'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, ReactNode } from 'react';

import { authService } from '@/lib/services/AuthService';
import { computePermissionApi } from '@/lib/hooks/usePermission';

interface SectionGuardProps {
  children: ReactNode;
  section: string; // 'reservations', 'camps', 'payments', 'transports'
}

/**
 * SectionGuard Component
 * Protects admin panel sections - redirects if user doesn't have access
 */
export default function SectionGuard({ children, section }: SectionGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  // Tryb tylko-do-odczytu: user ma dostęp do sekcji, ale poziom < WRITE (sam Odczyt).
  // Wtedy pola EDYCJI są wyłączane, ale filtry/wyszukiwarki (oznaczone data-acl-filters) zostają.
  const [isReadOnly, setIsReadOnly] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Wyłącza WYŁĄCZNIE pola WPROWADZANIA DANYCH (input/select/textarea, w tym checkbox/radio).
  // NIE dotyka przycisków (button) — zakładki, nawigacja, rozwijanie sekcji, paginacja, "pokaż
  // więcej" to ODCZYT i muszą działać (read-only musi móc przeglądać dane). Pomija też obszary
  // oznaczone data-acl-filters / data-acl-keep (filtry, wyszukiwarki). Backend i tak egzekwuje (403).
  useEffect(() => {
    if (!isReadOnly || !contentRef.current) return;
    const root = contentRef.current;
    const skip = (el: Element) =>
      !!el.closest('[data-acl-filters]') || !!el.closest('[data-acl-keep]');
    const apply = () => {
      // Pola wprowadzania danych — zawsze wyłącz (input/select/textarea, w tym checkbox/radio/file).
      root.querySelectorAll<HTMLInputElement>('input, select, textarea').forEach((el) => {
        if (skip(el)) return;
        if (!el.disabled) el.disabled = true;
        el.style.cursor = 'not-allowed';
      });
      // Przyciski AKCJI (Zapisz, wyślij SMS/email, dodaj, usuń) — wyłącz. POMIŃ nawigację:
      // zakładki (role="tab") i rozwijanie/akordeon (aria-expanded) = odczyt, muszą działać.
      root.querySelectorAll<HTMLButtonElement>('button').forEach((btn) => {
        if (skip(btn)) return;
        if (btn.getAttribute('role') === 'tab' || btn.hasAttribute('aria-expanded')) return;
        if (!btn.disabled) btn.disabled = true;
        btn.style.cursor = 'not-allowed';
      });
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isReadOnly]);

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        if (isMounted) {
          router.push('/admin-panel/login');
        }
        return;
      }

      // Verify token and get user info
      const user = await authService.verifyToken();
      if (!user) {
        if (isMounted) {
          router.push('/admin-panel/login');
        }
        return;
      }

      // Admin users have access to all sections
      const isAdmin = user.groups?.includes('admin') || false;

      // Dostęp do sekcji: admin (bypass), albo poziom >= READ (section_levels z normalizacją nazw),
      // albo stary accessible_sections (fallback dla sesji sprzed ACL).
      const perm = computePermissionApi(user);
      const hasAccess =
        isAdmin || perm.canRead(section) || user.accessible_sections?.includes(section) || false;

      if (!hasAccess) {
        if (isMounted) {
          // Redirect to first accessible section or admin panel home
          const accessibleSections = user.accessible_sections || [];
          if (accessibleSections.length > 0) {
            const sectionMap: Record<string, string> = {
              'reservations': '/admin-panel',
              'camps': '/admin-panel/camps',
              'payments': '/admin-panel/payments',
              'transports': '/admin-panel/transports',
              'diets': '/admin-panel/diets',
              'promotions': '/admin-panel/promotions',
              'protections': '/admin-panel/protections',
              'cms': '/admin-panel/cms',
              'settings': '/admin-panel/settings',
            };
            const firstSection = accessibleSections[0];
            const redirectPath = sectionMap[firstSection] || '/admin-panel';
            router.push(redirectPath);
          } else {
            router.push('/admin-panel/login');
          }
        }
        return;
      }

      if (isMounted) {
        // Read-only gdy NIE admin i poziom sekcji < WRITE (czyli sam Odczyt) i nie ma bypassu.
        const perm = computePermissionApi(user);
        setIsReadOnly(!isAdmin && !perm.canWrite(section));
        setIsAuthorized(true);
        setLoading(false);
      }
    };

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [router, section]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
          <p className="mt-4 text-sm text-gray-600">Sprawdzanie uprawnień...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  // Tryb tylko-do-odczytu: treść w kontenerze, w którym obserwator wyłącza pola edycji
  // (pomijając filtry/wyszukiwarki/nawigację oznaczone data-acl-filters / data-acl-keep).
  if (isReadOnly) {
    return <div ref={contentRef} className="acl-readonly">{children}</div>;
  }

  return <>{children}</>;
}