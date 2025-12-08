'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateRange } from '@/utils/api';
import { saveMagicLinkRedirect } from '@/utils/localStorage';
import type { Camp, CampProperty } from '@/types/reservation';
import { Search } from 'lucide-react';
import { API_BASE_URL } from '@/utils/api-config';
import { fetchWithDefaults } from '@/utils/api-fetch';
import { DEFAULT_CAMP, DEFAULT_CAMP_PROPERTY } from '@/types/defaults';
import { BackendUnavailableError } from '@/utils/api-auth';

interface CampWithProperties extends Camp {
  properties: CampProperty[];
}

/**
 * CampsList Component
 * Displays list of camps with their editions (turnusy) for selection
 * Styled to match the application's design system
 */
export default function CampsList() {
  const router = useRouter();
  const [camps, setCamps] = useState<CampWithProperties[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCamps();
  }, []);

  const loadCamps = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchWithDefaults<{ camps: CampWithProperties[] }>(
        '/api/camps/',
        { camps: [] },
        { method: 'GET' }
      );
      
      // Use defaults for each camp if needed
      const campsWithDefaults = (data.camps || []).map(camp => ({
        ...DEFAULT_CAMP,
        ...camp,
        properties: (camp.properties || []).map(prop => ({
          ...DEFAULT_CAMP_PROPERTY,
          ...prop,
        })),
      }));
      
      setCamps(campsWithDefaults);
    } catch (err) {
      if (err instanceof BackendUnavailableError) {
        setError('Zapraszamy ponownie później.');
      } else {
        setError(err instanceof Error ? err.message : 'Nie udało się załadować obozów');
      }
      console.error('Error loading camps:', err);
      // Set empty camps on error
      setCamps([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCamp = (campId: number, editionId: number) => {
    // Create reservation URL
    const reservationUrl = `/camps/${campId}/edition/${editionId}/step/1`;
    
    // Save redirect URL to localStorage BEFORE redirecting to login
    saveMagicLinkRedirect(reservationUrl);
    
    // Redirect to login with reservation URL as redirect parameter
    router.push(`/login?redirect=${encodeURIComponent(reservationUrl)}`);
  };

  const formatPeriod = (period: string) => {
    return period === 'lato' ? 'Lato' : 'Zima';
  };

  // Filter camps and properties based on search query
  const filteredCamps = useMemo(() => {
    if (!searchQuery.trim()) {
      return camps;
    }

    const query = searchQuery.toLowerCase().trim();
    
    return camps
      .map((camp) => {
        // Check if camp name matches
        const campNameMatches = camp.name.toLowerCase().includes(query);
        
        // Filter properties that match the search
        const matchingProperties = camp.properties.filter((property) => {
          const periodLabel = formatPeriod(property.period).toLowerCase();
          const cityMatches = property.city.toLowerCase().includes(query);
          const periodMatches = periodLabel.includes(query);
          const campMatches = campNameMatches;
          
          return campMatches || cityMatches || periodMatches;
        });

        // Only include camp if it has matching properties or camp name matches
        if (campNameMatches || matchingProperties.length > 0) {
          return {
            ...camp,
            properties: matchingProperties.length > 0 ? matchingProperties : camp.properties,
          };
        }
        
        return null;
      })
      .filter((camp): camp is CampWithProperties => camp !== null);
  }, [camps, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Ładowanie obozów...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-sm sm:text-base text-blue-700 font-semibold mb-1">Informacja</p>
          <p className="text-xs sm:text-sm text-blue-600">{error}</p>
          {error !== 'Zapraszamy ponownie później.' && (
            <button
              onClick={loadCamps}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm"
            >
              Spróbuj ponownie
            </button>
          )}
        </div>
      </div>
    );
  }

  if (camps.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 border border-gray-200 text-center">
        <p className="text-sm sm:text-base text-gray-600 mb-2">Brak dostępnych obozów.</p>
        <p className="text-xs sm:text-sm text-gray-500">Sprawdź ponownie później.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Title - matching LayoutClient style */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-2 leading-snug">
          Wybierz obóz i turnus
        </h1>
      </div>

      {/* Search Bar */}
      <div className="mb-4 sm:mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj obozu, turnusu, miasta lub okresu (np. Lato, Zima)..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent text-sm sm:text-base transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Wyczyść wyszukiwanie"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-xs sm:text-sm text-gray-500">
            Znaleziono {filteredCamps.reduce((sum, camp) => sum + camp.properties.length, 0)} turnus{filteredCamps.reduce((sum, camp) => sum + camp.properties.length, 0) !== 1 ? 'ów' : ''} w {filteredCamps.length} oboz{filteredCamps.length !== 1 ? 'ach' : 'ie'}
          </p>
        )}
      </div>

      {/* Camps List */}
      <div className="space-y-4 sm:space-y-6">
        {filteredCamps.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 border border-gray-200 text-center">
            <p className="text-sm sm:text-base text-gray-600 mb-2">
              {searchQuery ? 'Nie znaleziono obozów pasujących do wyszukiwania' : 'Brak dostępnych obozów'}
            </p>
            {searchQuery && (
              <p className="text-xs sm:text-sm text-gray-500 mb-4">
                Spróbuj zmienić zapytanie wyszukiwania
              </p>
            )}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-[#03adf0] text-white rounded-lg hover:bg-[#0288c7] transition-colors text-xs sm:text-sm"
              >
                Wyczyść wyszukiwanie
              </button>
            )}
          </div>
        ) : (
          filteredCamps.map((camp) => (
          <div
            key={camp.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            {/* Camp Header - matching application style */}
            <div className="bg-[#03adf0] px-3 sm:px-4 md:px-6 py-3 sm:py-4">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-white">
                {camp.name}
              </h2>
            </div>

            {/* Camp Properties (Turnusy) */}
            {camp.properties && camp.properties.length > 0 ? (
              <div className="p-3 sm:p-4 md:p-6">
                <div className="space-y-2 sm:space-y-3">
                  {camp.properties.map((property) => {
                    const isFull = property.is_full === true;
                    const isEnded = property.is_ended === true;
                    const isDisabled = isFull || isEnded;
                    
                    return (
                      <button
                        key={property.id}
                        onClick={() => !isDisabled && handleSelectCamp(camp.id, property.id)}
                        disabled={isDisabled}
                        className={`w-full text-left p-3 sm:p-4 rounded-lg border transition-all duration-200 group ${
                          isDisabled
                            ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60'
                            : 'bg-gray-50 hover:bg-[#03adf0] hover:text-white border-gray-300 hover:border-[#03adf0]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                                isDisabled
                                  ? 'bg-gray-400 text-white'
                                  : 'bg-[#03adf0] text-white group-hover:bg-white group-hover:text-[#03adf0]'
                              }`}>
                                {formatPeriod(property.period)}
                              </span>
                              <span className={`text-xs sm:text-sm transition-colors whitespace-nowrap ${
                                isDisabled ? 'text-gray-400' : 'text-gray-500 group-hover:text-white'
                              }`}>
                                {property.city}
                              </span>
                              {isFull && (
                                <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white">
                                  WYPRZEDANE
                                </span>
                              )}
                              {isEnded && !isFull && (
                                <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500 text-white">
                                  ZAKOŃCZONY
                                </span>
                              )}
                            </div>
                            <p className={`text-xs sm:text-sm md:text-base font-semibold transition-colors mb-1 ${
                              isDisabled ? 'text-gray-500' : 'text-gray-900 group-hover:text-white'
                            }`}>
                              {formatDateRange(property.start_date, property.end_date)}
                            </p>
                            <p className={`text-xs sm:text-sm transition-colors ${
                              isDisabled ? 'text-gray-400' : 'text-gray-600 group-hover:text-white/90'
                            }`}>
                              {property.days_count} {property.days_count === 1 ? 'dzień' : property.days_count < 5 ? 'dni' : 'dni'}
                              {property.registered_count !== undefined && property.max_participants !== undefined && (
                                <span className="ml-2">
                                  ({property.registered_count}/{property.max_participants} miejsc)
                                </span>
                              )}
                            </p>
                          </div>
                          {!isDisabled && (
                            <div className="flex-shrink-0 self-start sm:self-center">
                              <svg
                                className="w-4 h-4 sm:w-5 sm:h-6 text-gray-400 group-hover:text-white transition-colors"
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
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3 sm:p-4 md:p-6">
                <p className="text-xs sm:text-sm text-gray-500 text-center">
                  Brak dostępnych turnusów dla tego obozu
                </p>
              </div>
            )}
          </div>
        ))
        )}
      </div>
    </div>
  );
}

