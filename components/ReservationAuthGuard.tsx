'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';

import { authService } from '@/lib/services/AuthService';

interface ReservationAuthGuardProps {
  children: ReactNode;
}

/**
 * ReservationAuthGuard Component
 * Protects reservation routes - redirects to login if not authenticated
 * Allows both admin and client users
 */
export default function ReservationAuthGuard({ children }: ReservationAuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        if (isMounted) {
          // Redirect to login with current path as redirect (will be saved in database)
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
        return;
      }

      // Verify token with backend
      const user = await authService.verifyToken();
      if (!user) {
        if (isMounted) {
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
        return;
      }

      // Both admin and client users can access reservation
      if (isMounted) {
        setIsAuthorized(true);
        setLoading(false);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
          <p className="mt-4 text-sm text-gray-600">Sprawdzanie autoryzacji...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

