'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { API_BASE_URL } from '@/utils/api-config';
import { authService } from '@/lib/services/AuthService';

/**
 * Qualification Card HTML Page
 * Route: /profil/aktualne-rezerwacje/[id]/karta-kwalifikacyjna
 * Displays qualification card HTML as standalone page (no layout)
 */
export default function QualificationCardHtmlPage() {
  const params = useParams();
  const reservationId = params.id as string; // e.g., "REZ-2025-016" or reservation ID
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQualificationCardHtml = async () => {
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

        const response = await fetch(`${API_BASE_URL}/api/qualification-cards/${reservationIdNum}/html`, {
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
        
        // Replace entire document with qualification card HTML
        // Backend already provides full API URLs for images and includes auto-print script
        document.open();
        document.write(html);
        document.close();
      } catch (err) {
        console.error('Error fetching qualification card HTML:', err);
        setError(err instanceof Error ? err.message : 'Nie udało się załadować karty kwalifikacyjnej');
        setIsLoading(false);
      }
    };

    if (reservationId) {
      fetchQualificationCardHtml();
    }
  }, [reservationId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
          <div className="text-gray-500">Ładowanie karty kwalifikacyjnej...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">Błąd</div>
          <div className="text-gray-700">{error}</div>
        </div>
      </div>
    );
  }

  return null; // HTML is written directly to document
}






