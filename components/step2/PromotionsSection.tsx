'use client';

import { useState, useEffect, useRef } from 'react';
import { Info, Download } from 'lucide-react';
import { useReservation } from '@/context/ReservationContext';
import { loadStep2FormData, saveStep2FormData } from '@/utils/sessionStorage';
import { API_BASE_URL } from '@/utils/api-config';

/**
 * PromotionsSection Component
 * Displays promotions select with information
 */
export default function PromotionsSection() {
  const { reservation, addReservationItem, removeReservationItemsByType } = useReservation();
  const [selectedPromotion, setSelectedPromotion] = useState<string>('');
  const prevPromotionRef = useRef<string>('');

  const promotions = [
    { value: '', label: 'Wybierz promocję' },
    { value: 'rodzenstwo', label: 'Rodzeństwo razem: -50 zł' },
    { value: 'wczesna', label: 'Wczesna rezerwacja: -100 zł' },
    { value: 'grupa', label: 'Grupa 5+ osób: -75 zł' },
  ];

  const promotionPrices: Record<string, number> = {
    rodzenstwo: -50,
    wczesna: -100,
    grupa: -75,
  };

  const [isInitialized, setIsInitialized] = useState(false);
  const [promotionDocumentUrl, setPromotionDocumentUrl] = useState<string | null>(null);

  // Fetch public documents
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/documents/public`);
        if (!response.ok) return;
        const data = await response.json();
        const doc = (data.documents || []).find((d: { name: string }) => d.name === 'promotion_regulation');
        if (doc && doc.file_url) {
          setPromotionDocumentUrl(doc.file_url);
        }
      } catch (err) {
        console.error('[PromotionsSection] Error fetching documents:', err);
      }
    };
    fetchDocuments();
  }, []);

  // Load data from sessionStorage on mount
  useEffect(() => {
    const savedData = loadStep2FormData();
    if (savedData && savedData.selectedPromotion) {
      setSelectedPromotion(savedData.selectedPromotion);
      prevPromotionRef.current = savedData.selectedPromotion;
    }
    setIsInitialized(true);
  }, []);

  // Restore promotion to reservation when initialized
  useEffect(() => {
    if (!isInitialized) return;

    const savedData = loadStep2FormData();
    if (savedData && savedData.selectedPromotion && promotionPrices[savedData.selectedPromotion]) {
      const selected = promotions.find((p) => p.value === savedData.selectedPromotion);
      if (selected) {
        // Check if already exists in reservation
        const existing = reservation.items.find(
          item => item.type === 'promotion' && item.name === selected.label
        );
        if (!existing) {
          addReservationItem({
            name: selected.label,
            price: promotionPrices[savedData.selectedPromotion],
            type: 'promotion',
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, reservation.items.length]);

  // Update reservation when promotion changes
  useEffect(() => {
    if (prevPromotionRef.current === selectedPromotion) return;

    // Remove previous promotion
    removeReservationItemsByType('promotion');

    // Add new promotion if selected
    if (selectedPromotion && promotionPrices[selectedPromotion]) {
      const selected = promotions.find((p) => p.value === selectedPromotion);
      if (selected) {
        addReservationItem({
          name: selected.label,
          price: promotionPrices[selectedPromotion],
          type: 'promotion',
        });
      }
    }

    prevPromotionRef.current = selectedPromotion;
  }, [selectedPromotion, addReservationItem, removeReservationItemsByType]);

  // Save to sessionStorage whenever promotion changes
  useEffect(() => {
    const savedData = loadStep2FormData();
    const formData = {
      ...savedData,
      selectedPromotion,
    };
    saveStep2FormData(formData as any);
  }, [selectedPromotion]);

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
        Promocje
      </h2>
      <section className="bg-white p-4 sm:p-6">
        <div className="mb-4 sm:mb-6">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            Wybierz promocję, która Ci przysługuje
          </label>
          <select
            value={selectedPromotion}
            onChange={(e) => setSelectedPromotion(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] pr-8 sm:pr-10"
          >
            {promotions.map((promo) => (
              <option key={promo.value} value={promo.value}>
                {promo.label}
              </option>
            ))}
          </select>
        </div>

        {/* Information block */}
        <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg mb-4 sm:mb-6">
          <Info className="w-5 h-5 text-[#03adf0] flex-shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-gray-600">
            Promocje nie łączą się
          </p>
        </div>

        {/* Regulation button */}
        {promotionDocumentUrl && (
          <button
            onClick={() => window.open(promotionDocumentUrl, '_blank')}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 border-2 border-[#03adf0] text-[#03adf0] hover:bg-[#03adf0] hover:text-white transition-colors text-xs sm:text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Regulamin promocji
          </button>
        )}
      </section>
    </div>
  );
}

