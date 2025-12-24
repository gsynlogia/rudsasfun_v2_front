'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { API_BASE_URL } from '@/utils/api-config';
import { authService } from '@/lib/services/AuthService';

/**
 * Contract HTML Page
 * Route: /profil/aktualne-rezerwacje/[id]/umowa
 * Displays contract HTML as standalone page (no layout)
 */
export default function ContractHtmlPage() {
  const params = useParams();
  const reservationId = params.id as string; // e.g., "REZ-2025-016" or reservation ID
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContractHtml = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Extract reservation ID from reservation number (e.g., "REZ-2025-016")
        // We need to fetch reservations to find the matching ID
        let reservationIdNum: number;
        
        if (reservationId.startsWith('REZ-')) {
          // It's a reservation number, fetch reservations to find the ID
          const { reservationService } = await import('@/lib/services/ReservationService');
          const reservations = await reservationService.getMyReservations(0, 100);
          
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
          reservationIdNum = parseInt(reservationId);
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

        const html = await response.text();
        
        // Replace entire document with contract HTML
        // Backend already provides full API URLs for images and includes auto-print script
        document.open();
        document.write(html);
        document.close();
      } catch (err) {
        console.error('Error fetching contract HTML:', err);
        setError(err instanceof Error ? err.message : 'Nie udało się załadować umowy');
        setIsLoading(false);
      }
    };

    if (reservationId) {
      fetchContractHtml();
    }
  }, [reservationId]);

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

