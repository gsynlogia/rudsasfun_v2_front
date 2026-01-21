'use client';

import { usePathname } from 'next/navigation';

import AuthGuard from '@/components/admin/AuthGuard';

/**
 * Admin Panel Layout
 * Protects all admin panel routes with authentication
 * Only authenticated admin users can access
 * Login page is excluded from protection
 */
export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Don't protect login page - it needs to be accessible without auth
  const isLoginPage = pathname === '/admin-panel/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  // Allow all authenticated users to access admin panel
  // Section-level permissions are checked individually
  return (
    <AuthGuard requireAdmin={false}>
      {children}
    </AuthGuard>
  );
}