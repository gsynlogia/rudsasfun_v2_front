'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateRange } from '@/utils/api';
import type { Camp, CampProperty } from '@/types/reservation';

interface CampWithProperties extends Camp {
  properties: CampProperty[];
}

/**
 * CampsList Component
 * Displays list of camps with their editions (turnusy) for selection
 */
export default function CampsList() {
  const router = useRouter();
  const [camps, setCamps] = useState<CampWithProperties[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    loadCamps();
  }, []);

  const loadCamps = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/camps/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCamps(data.camps || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować obozów');
      console.error('Error loading camps:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCamp = (campId: number, editionId: number) => {
    router.push(`/camps/${campId}/edition/${editionId}/step/1`);
  };

  const formatPeriod = (period: string) => {
    return period === 'lato' ? 'Lato' : 'Zima';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
          <p className="text-gray-600">Ładowanie obozów...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
        <p className="text-red-700 font-semibold">Błąd</p>
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={loadCamps}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  if (camps.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">Brak dostępnych obozów.</p>
        <p className="text-gray-500 text-sm mt-2">Sprawdź ponownie później.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Wybierz obóz i turnus
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Kliknij na wybrany turnus, aby rozpocząć rezerwację
        </p>
      </div>

      {camps.map((camp) => (
        <div
          key={camp.id}
          className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200"
        >
          {/* Camp Header */}
          <div className="bg-gradient-to-r from-[#03adf0] to-[#0288c7] px-4 sm:px-6 py-4">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
              {camp.name}
            </h2>
          </div>

          {/* Camp Properties (Turnusy) */}
          {camp.properties && camp.properties.length > 0 ? (
            <div className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {camp.properties.map((property) => (
                  <button
                    key={property.id}
                    onClick={() => handleSelectCamp(camp.id, property.id)}
                    className="w-full text-left p-4 sm:p-5 bg-gray-50 hover:bg-[#03adf0] hover:text-white rounded-lg border-2 border-gray-200 hover:border-[#03adf0] transition-all duration-200 group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-medium bg-[#03adf0] text-white group-hover:bg-white group-hover:text-[#03adf0] transition-colors">
                            {formatPeriod(property.period)}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-500 group-hover:text-white transition-colors">
                            {property.city}
                          </span>
                        </div>
                        <p className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-white transition-colors">
                          {formatDateRange(property.start_date, property.end_date)}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600 group-hover:text-white/90 transition-colors mt-1">
                          {property.days_count} {property.days_count === 1 ? 'dzień' : property.days_count < 5 ? 'dni' : 'dni'}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 group-hover:text-white transition-colors"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <p className="text-sm text-gray-500 text-center">
                Brak dostępnych turnusów dla tego obozu
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

