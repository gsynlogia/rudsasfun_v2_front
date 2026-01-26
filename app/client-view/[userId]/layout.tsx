'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import ClientViewLayout from '@/components/profile/ClientViewLayout';
import { ClientViewProvider } from '@/lib/contexts/ClientViewContext';
import { authService } from '@/lib/services/AuthService';
import { authenticatedApiCall } from '@/utils/api-auth';

interface ClientInfo {
  user_id: number;
  user_email: string | null;
  user_name: string | null;
  can_view: boolean;
}

export default function ClientViewRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId ? parseInt(params.userId as string, 10) : null;

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAccessAndLoadClient = async () => {
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        router.push('/admin-panel/login');
        return;
      }

      // Verify token and check if admin
      const user = await authService.verifyToken();
      if (!user) {
        router.push('/admin-panel/login');
        return;
      }

      // Check if user is admin (system admin id=0 or admin user_type)
      const isAdmin = user.id === 0 || user.user_type === 'admin' || user.groups?.includes('admin');
      if (!isAdmin) {
        router.push('/admin-panel');
        return;
      }

      if (!userId) {
        setError('Brak ID użytkownika');
        setLoading(false);
        return;
      }

      // Fetch client info from backend
      try {
        const data = await authenticatedApiCall<ClientInfo>(
          `/api/admin/client-view/user/${userId}`
        );

        if (!data.can_view) {
          setError('Nie możesz przeglądać tego profilu');
          setLoading(false);
          return;
        }

        setClientInfo(data);
        setIsAuthorized(true);
      } catch (err) {
        console.error('Error fetching client info:', err);
        setError(err instanceof Error ? err.message : 'Błąd podczas ładowania danych klienta');
      } finally {
        setLoading(false);
      }
    };

    checkAccessAndLoadClient();
  }, [router, userId]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          <p className="mt-4 text-sm text-gray-600">Ładowanie profilu klienta...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Błąd</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/admin-panel')}
            className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
          >
            Wróć do panelu admina
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthorized || !clientInfo) {
    return null;
  }

  return (
    <ClientViewProvider
      initialUserId={clientInfo.user_id}
      initialUserName={clientInfo.user_name}
      initialUserEmail={clientInfo.user_email}
    >
      <ClientViewLayout
        userId={clientInfo.user_id}
        userName={clientInfo.user_name}
        userEmail={clientInfo.user_email}
      >
        {children}
      </ClientViewLayout>
    </ClientViewProvider>
  );
}
