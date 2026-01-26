'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Client View - Main page
 * Redirects to aktualne-rezerwacje
 */
export default function ClientViewMainPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId;

  useEffect(() => {
    if (userId) {
      router.replace(`/client-view/${userId}/aktualne-rezerwacje`);
    }
  }, [userId, router]);

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
    </div>
  );
}
