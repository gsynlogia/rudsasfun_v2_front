'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/services/AuthService';

interface AuthGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

/**
 * AuthGuard Component
 * Protects admin panel routes - redirects to login if not authenticated
 */
export default function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        if (isMounted) {
          router.push('/admin-panel/login');
        }
        return;
      }

      // Verify token with backend
      const user = await authService.verifyToken();
      if (!user) {
        if (isMounted) {
          router.push('/admin-panel/login');
        }
        return;
      }

      // Check admin group if required
      if (requireAdmin && !user.groups?.includes('admin')) {
        if (isMounted) {
          router.push('/admin-panel/login');
        }
        return;
      }

      if (isMounted) {
        setIsAuthorized(true);
        setLoading(false);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router, requireAdmin]);

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


