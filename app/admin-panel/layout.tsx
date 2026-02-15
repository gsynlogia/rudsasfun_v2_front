'use client';

import { usePathname } from 'next/navigation';

import AuthGuard from '@/components/admin/AuthGuard';
import { AdminRightPanelProvider } from '@/context/AdminRightPanelContext';
import { SidebarProvider } from '@/context/SidebarContext';

/**
 * Admin Panel Layout
 * Protects all admin panel routes with authentication
 * Only authenticated admin users can access
 * Login page is excluded from protection
 * SidebarProvider is here to persist sidebar state across SPA navigation
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
  // SidebarProvider wraps everything to persist state during SPA navigation
  return (
    <SidebarProvider>
      <AuthGuard requireAdmin={false}>
        <AdminRightPanelProvider>
          {children}
        </AdminRightPanelProvider>
      </AuthGuard>
    </SidebarProvider>
  );
}