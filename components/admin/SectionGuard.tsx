'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/services/AuthService';

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
      
      // Check if user has access to this section
      const hasAccess = isAdmin || user.accessible_sections?.includes(section) || false;

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

  return <>{children}</>;
}




