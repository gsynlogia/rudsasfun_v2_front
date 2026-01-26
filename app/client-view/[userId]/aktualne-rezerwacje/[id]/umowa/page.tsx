'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { authService } from '@/lib/services/AuthService';
import { API_BASE_URL } from '@/utils/api-config';

/**
 * Client View - Contract HTML Page
 * Route: /client-view/[userId]/aktualne-rezerwacje/[id]/umowa
 * Admin viewing client's contract HTML (without auto-print). Opens in new tab.
 */
export default function ClientViewContractHtmlPage() {
  const params = useParams();
  const userId = params?.userId ? parseInt(params.userId as string, 10) : undefined;
  const reservationId = params?.id ? String(params.id) : ''; // e.g., "REZ-2025-016" or reservation ID

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printedRef = useRef(false);

  useEffect(() => {
    const fetchContractHtml = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Extract reservation ID from reservation number (e.g., "REZ-2025-016")
        // We need to fetch reservations to find the matching ID (with view_as_user_id)
        let reservationIdNum: number;

        if (reservationId.startsWith('REZ-')) {
          // It's a reservation number, fetch reservations to find the ID
          const { reservationService } = await import('@/lib/services/ReservationService');
          const reservations = await reservationService.getMyReservations(0, 100, userId);

          const formatReservationNumber = (reservationId: number, createdAt: string) => {
            const year = new Date(createdAt).getFullYear();
            const paddedId = String(reservationId).padStart(3, '0');
            return `REZ-${year}-${paddedId}`;
          };

          const foundReservation = reservations.find((r: any) => {
            const rNumber = formatReservationNumber(r.id, r.created_at);
            return rNumber === reservationId;
          });

          if (!foundReservation) {
            setError('Rezerwacja nie została znaleziona');
            setIsLoading(false);
            return;
          }

          reservationIdNum = foundReservation.id;
        } else {
          reservationIdNum = parseInt(reservationId, 10);
        }

        if (isNaN(reservationIdNum)) {
          setError('Nieprawidłowy numer rezerwacji');
          setIsLoading(false);
          return;
        }

        const token = authService.getToken();
        if (!token) {
          setError('Brak autoryzacji');
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/contracts/${reservationIdNum}/html`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Request failed' }));
          throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        let html = await response.text();

        // Usuń skrypty auto-print (window.print) aby nie wywoływać drukowania
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          doc.querySelectorAll('script').forEach((script) => {
            if (script.textContent && script.textContent.toLowerCase().includes('window.print')) {
              script.remove();
            }
          });
          html = doc.documentElement.outerHTML;
        } catch (e) {
          console.warn('Nie udało się wyczyścić skryptów print:', e);
        }

        // Replace entire document with cleaned contract HTML
        document.open();
        document.write(html);
        document.close();

        // Jednorazowe wywołanie print – ochrona przed wielokrotnym uruchomieniem
        if (!printedRef.current) {
          printedRef.current = true;
          setTimeout(() => {
            try {
              window.print();
            } catch {
              // ignore
            }
          }, 500);
        }
      } catch (err) {
        console.error('Error fetching contract HTML:', err);
        setError(err instanceof Error ? err.message : 'Nie udało się załadować umowy');
        setIsLoading(false);
      }
    };

    if (reservationId && userId) {
      fetchContractHtml();
    }
  }, [reservationId, userId]);

  // Show loading/error state (only shown if document.write hasn't replaced the page)
  if (isLoading) {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif', padding: '40px', textAlign: 'center', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Ładowanie umowy...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif', padding: '40px', textAlign: 'center', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red' }}>
        <div>{error}</div>
      </div>
    );
  }

  // This should never be reached if document.write succeeded
  return null;
}
