'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/lib/services/AuthService';
import { saveMagicLinkRedirect } from '@/utils/localStorage';

interface ProfileAuthGuardProps {
  children: ReactNode;
}

/**
 * ProfileAuthGuard Component
 * Protects profile routes - redirects to login if not authenticated
 * Allows both admin and client users
 */
export default function ProfileAuthGuard({ children }: ProfileAuthGuardProps) {
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
          // Save current path to localStorage for magic link redirect
          saveMagicLinkRedirect(pathname);
          // Redirect to login with current path as redirect
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

      // Both admin and client users can access profile
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

