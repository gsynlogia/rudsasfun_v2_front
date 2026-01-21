'use client';

import { AlertTriangle, Download, FileText, MapPin } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';

import UniversalModal from '@/components/admin/UniversalModal';
import { useReservation } from '@/context/ReservationContext';
import { authenticatedApiCall } from '@/utils/api-auth';
import { isFakeDataEnabled } from '@/utils/fakeData';
import { loadStep2FormData, saveStep2FormData } from '@/utils/sessionStorage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.rezerwacja.radsas-fun.pl';

interface TransportCity {
  city: string;
  departure_price: number | null;
  return_price: number | null;
}

/**
 * TransportSection Component
 * Displays transport warning and form with departure/return options
 * Fetches cities from API when collective transport is selected
 */
export default function TransportSection() {
  const pathname = usePathname();
  const safePathname = pathname || '';
  const { addReservationItem, removeReservationItemsByType, reservation: _reservation } = useReservation();

  // Extract campId and editionId from URL
  const pathParts = safePathname.split('/').filter(Boolean);
  const campIdIndex = pathParts.indexOf('camps');
  const campId = campIdIndex !== -1 && campIdIndex + 1 < pathParts.length
    ? parseInt(pathParts[campIdIndex + 1], 10)
    : null;
  const editionId = campIdIndex !== -1 && campIdIndex + 3 < pathParts.length
    ? parseInt(pathParts[campIdIndex + 3], 10)
    : null;

  const [transportData, setTransportData] = useState({
    departureType: '',
    departureCity: '',
    returnType: '',
    returnCity: '',
    differentCities: false,
  });

  const [cities, setCities] = useState<TransportCity[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [hasTransport, setHasTransport] = useState<boolean | null>(null); // null = checking, true = has transport, false = no transport
  const [showDifferentCitiesModal, setShowDifferentCitiesModal] = useState(false);
  const [departurePrice, setDeparturePrice] = useState<number | null>(null);
  const [returnPrice, setReturnPrice] = useState<number | null>(null);
  const [transportDocuments, setTransportDocuments] = useState<Map<string, string>>(new Map()); // Map: document name -> file_url

  // Fetch public documents
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/documents/public`);
        if (!response.ok) return;
        const data = await response.json();
        const docsMap = new Map<string, string>();
        (data.documents || []).forEach((doc: { name: string; file_url: string | null }) => {
          if (doc.file_url && (doc.name === 'transport_regulations' || doc.name === 'transport_list')) {
            docsMap.set(doc.name, doc.file_url);
          }
        });
        setTransportDocuments(docsMap);
      } catch (err) {
        console.error('[TransportSection] Error fetching documents:', err);
      }
    };
    fetchDocuments();
  }, []);

  const [transportModalConfirmed, setTransportModalConfirmed] = useState(false);
  const [transportErrors, setTransportErrors] = useState<Record<string, string>>({});
  const validationAttemptedRef = useRef(false);

  // Load data from sessionStorage on mount
  useEffect(() => {
    const syncData = () => {
      const savedData = loadStep2FormData();
      if (savedData && savedData.transportData) {
        setTransportData({
          ...savedData.transportData,
          differentCities: savedData.transportData.differentCities ?? false,
        });
      } else {
        // Set default values if no saved data - default to collective transport
        setTransportData({
          departureType: 'zbiorowy',
          departureCity: '',
          returnType: 'zbiorowy',
          returnCity: '',
          differentCities: false,
        });
        // Save default values to sessionStorage only if not fake data
        if (!process.env.NEXT_PUBLIC_FAKE_DATA || process.env.NEXT_PUBLIC_FAKE_DATA !== 'true') {
          const formData = {
            ...savedData,
            transportData: {
              departureType: 'zbiorowy',
              departureCity: '',
              returnType: 'zbiorowy',
              returnCity: '',
              differentCities: false,
            },
          };
          saveStep2FormData(formData as any);
        }
      }
      // Load modal confirmation status
      if (savedData && savedData.transportModalConfirmed) {
        setTransportModalConfirmed(savedData.transportModalConfirmed);
      }
    };

    syncData();

    // Listen for fake data loaded event
    const handleFakeDataLoaded = () => {
      setTimeout(syncData, 100); // Small delay to ensure sessionStorage is updated
    };
    window.addEventListener('fakeDataLoaded', handleFakeDataLoaded);

    return () => {
      window.removeEventListener('fakeDataLoaded', handleFakeDataLoaded);
    };
  }, []);

  // Check if transport exists for this turnus and fetch cities
  useEffect(() => {
    const checkTransportAndFetchCities = async () => {
      if (!campId || !editionId) return;

      // First, check if transport exists for this turnus
      try {
        const transportResponse = await authenticatedApiCall<any>(
          `${API_BASE_URL}/api/camps/${campId}/properties/${editionId}/transport`,
        );

        if (transportResponse && transportResponse.id) {
          setHasTransport(true);

          // If collective transport is selected, fetch cities
          if (transportData.departureType === 'zbiorowy' || transportData.returnType === 'zbiorowy') {
            setLoadingCities(true);
            try {
              const citiesResponse = await authenticatedApiCall<TransportCity[]>(
                `${API_BASE_URL}/api/camps/${campId}/properties/${editionId}/transport/cities`,
              );
              setCities(citiesResponse || []);
            } catch (error) {
              console.error('Error fetching transport cities:', error);
              setCities([]);
            } finally {
              setLoadingCities(false);
            }
          } else {
            setCities([]);
          }
        } else {
          // No transport assigned to this turnus
          setHasTransport(false);
          setCities([]);
        }
      } catch (error) {
        // If error (404 or other), assume no transport
        console.error('Error checking transport:', error);
        setHasTransport(false);
        setCities([]);
      }
    };

    checkTransportAndFetchCities();
  }, [campId, editionId, transportData.departureType, transportData.returnType]);

  // Calculate prices
  useEffect(() => {
    let depPrice: number | null = null;
    let retPrice: number | null = null;

    if (transportData.departureType === 'zbiorowy' && transportData.departureCity) {
      const city = cities.find(c => c.city === transportData.departureCity);
      depPrice = city?.departure_price || null;
    }

    if (transportData.returnType === 'zbiorowy' && transportData.returnCity) {
      const city = cities.find(c => c.city === transportData.returnCity);
      retPrice = city?.return_price || null;
    }

    setDeparturePrice(depPrice);
    setReturnPrice(retPrice);
  }, [transportData, cities]);

  // If fake data has departureCity but it's not in cities list, try to use first available city
  useEffect(() => {
    if (isFakeDataEnabled() && transportData.departureType === 'zbiorowy' && transportData.departureCity && cities.length > 0) {
      const cityExists = cities.some(c => c.city === transportData.departureCity);
      if (!cityExists && cities[0]) {
        // City from fake data doesn't exist, use first available city
        setTransportData(prev => ({
          ...prev,
          departureCity: cities[0].city,
          returnCity: prev.returnCity || cities[0].city,
        }));
      }
    }
  }, [cities, transportData.departureCity, transportData.departureType]);

  // Check for different cities and show modal immediately when different cities are selected
  useEffect(() => {
    const citiesDifferent =
      transportData.departureType === 'zbiorowy' &&
      transportData.returnType === 'zbiorowy' &&
      transportData.departureCity &&
      transportData.returnCity &&
      transportData.departureCity !== transportData.returnCity;

    // Show modal immediately if cities are different AND modal hasn't been confirmed yet
    if (citiesDifferent && !transportModalConfirmed && !showDifferentCitiesModal) {
      setShowDifferentCitiesModal(true);
    }
  }, [transportData, transportModalConfirmed, showDifferentCitiesModal]);


  // Update differentCities flag in transportData when cities change
  useEffect(() => {
    const citiesDifferent: boolean =
      transportData.departureType === 'zbiorowy' &&
      transportData.returnType === 'zbiorowy' &&
      !!transportData.departureCity &&
      !!transportData.returnCity &&
      transportData.departureCity !== transportData.returnCity;

    if (transportData.differentCities !== citiesDifferent) {
      setTransportData(prev => ({ ...prev, differentCities: citiesDifferent }));
    }
  }, [transportData.departureType, transportData.returnType, transportData.departureCity, transportData.returnCity]);

  // Update reservation with transport price
  useEffect(() => {
    // Remove existing transport item
    removeReservationItemsByType('transport');

    // If no transport assigned, don't add anything to reservation
    if (hasTransport === false) {
      return;
    }

    // Calculate higher price
    const prices = [departurePrice, returnPrice].filter((p): p is number => p !== null && p !== undefined);
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    // Add transport to reservation if there's a price
    if (maxPrice > 0) {
      const departureCityName = cities.find(c => c.city === transportData.departureCity)?.city || transportData.departureCity;
      const returnCityName = cities.find(c => c.city === transportData.returnCity)?.city || transportData.returnCity;

      const citiesDifferent =
        transportData.departureType === 'zbiorowy' &&
        transportData.returnType === 'zbiorowy' &&
        transportData.departureCity &&
        transportData.returnCity &&
        transportData.departureCity !== transportData.returnCity;

      let transportName = 'Transport';
      if (citiesDifferent) {
        transportName = `Transport zbiorowy: ${departureCityName} (wyjazd), ${returnCityName} (powrót)`;
      } else if (transportData.departureType === 'zbiorowy' && transportData.departureCity) {
        transportName = `Transport zbiorowy: ${departureCityName}`;
      } else if (transportData.returnType === 'zbiorowy' && transportData.returnCity) {
        transportName = `Transport zbiorowy: ${returnCityName}`;
      }

      addReservationItem({
        name: transportName,
        price: maxPrice,
        type: 'transport',
      }, 'transport');
    }
  }, [departurePrice, returnPrice, transportData, cities, hasTransport, addReservationItem, removeReservationItemsByType]);

  // Save to sessionStorage whenever transport data or modal confirmation changes
  useEffect(() => {
    const savedData = loadStep2FormData();
    // Ensure differentCities is set correctly
    const citiesDifferent =
      transportData.departureType === 'zbiorowy' &&
      transportData.returnType === 'zbiorowy' &&
      transportData.departureCity &&
      transportData.returnCity &&
      transportData.departureCity !== transportData.returnCity;

    const formData = {
      ...savedData,
      transportData: {
        ...transportData,
        differentCities: citiesDifferent,
      },
      transportModalConfirmed,
    };
    saveStep2FormData(formData as any);
  }, [transportData, transportModalConfirmed]);

  // Validate transport fields
  const validateTransport = useCallback((): boolean => {
    // If no transport assigned, skip validation (always valid)
    if (hasTransport === false) {
      return true;
    }

    const errors: Record<string, string> = {};

    // Validate departure type
    if (!transportData.departureType || transportData.departureType.trim() === '') {
      errors.departureType = 'Pole obowiązkowe';
    }

    // Validate departure city if collective transport is selected
    if (transportData.departureType === 'zbiorowy') {
      if (!transportData.departureCity || transportData.departureCity.trim() === '') {
        errors.departureCity = 'Pole obowiązkowe';
      }
    }

    // Validate return type
    if (!transportData.returnType || transportData.returnType.trim() === '') {
      errors.returnType = 'Pole obowiązkowe';
    }

    // Validate return city if collective transport is selected
    if (transportData.returnType === 'zbiorowy') {
      if (!transportData.returnCity || transportData.returnCity.trim() === '') {
        errors.returnCity = 'Pole obowiązkowe';
      }
    }

    // Check if different cities are selected and modal needs to be confirmed
    const citiesDifferent =
      transportData.departureType === 'zbiorowy' &&
      transportData.returnType === 'zbiorowy' &&
      transportData.departureCity &&
      transportData.returnCity &&
      transportData.departureCity !== transportData.returnCity;

    if (citiesDifferent && !transportModalConfirmed) {
      // Show modal if not confirmed yet
      setShowDifferentCitiesModal(true);
      // Validation fails - user must confirm different cities
      return false;
    }

    setTransportErrors(errors);
    return Object.keys(errors).length === 0;
  }, [transportData, hasTransport, transportModalConfirmed]);

  // Expose validation function for external use (e.g., LayoutClient)
  useEffect(() => {
    (window as any).validateStep2 = () => {
      validationAttemptedRef.current = true;
      return validateTransport();
    };

    return () => {
      delete (window as any).validateStep2;
    };
  }, [validateTransport]);

  const updateField = (field: keyof typeof transportData, value: string) => {
    setTransportData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (transportErrors[field]) {
      setTransportErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const getCityOptions = () => {
    if (cities.length === 0) {
      return [{ value: '', label: 'Wybierz miasto' }];
    }

    const options = [{ value: '', label: 'Wybierz miasto' }];

    // Sort cities alphabetically by city name
    const sortedCities = [...cities].sort((a, b) => {
      return a.city.localeCompare(b.city, 'pl', { sensitivity: 'base' });
    });

    sortedCities.forEach(city => {
      options.push({ value: city.city, label: city.city });
    });

    return options;
  };

  const handleModalConfirm = () => {
    setShowDifferentCitiesModal(false);
    setTransportModalConfirmed(true);
    // Save confirmation to sessionStorage immediately
    const savedData = loadStep2FormData();
    const formData = {
      ...savedData,
      transportData: {
        ...transportData,
        differentCities: true,
      },
      transportModalConfirmed: true,
    };
    saveStep2FormData(formData as any);
  };

  // Handle modal close without confirmation - X button closes modal but doesn't confirm
  const handleModalClose = () => {
    // Close modal but don't confirm - user can close it with X
    // Modal will be shown again when user tries to proceed or when cities are still different
    setShowDifferentCitiesModal(false);
    // Don't set transportModalConfirmed to true - this allows modal to show again
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
        Transport
      </h2>
      <section className="bg-white p-4 sm:p-6">
        {/* Warning if no transport assigned to turnus */}
        {hasTransport === false && (
          <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-red-50 border-2 border-red-300 rounded-lg mb-4 sm:mb-6">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-bold text-red-600 mb-1">
                Brak transportu dla tego turnusu
              </p>
              <p className="text-xs sm:text-sm text-red-700">
                Ten turnus nie ma przypisanego transportu. Skontaktuj się z organizatorem w sprawie transportu.
              </p>
            </div>
          </div>
        )}

        {/* All sections below are only visible when transport is assigned */}
        {hasTransport === true && (
          <>
            {/* Warning block */}
            <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-red-50 rounded-lg mb-4 sm:mb-6">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-bold text-red-600 mb-1">
                  Uwaga!
                </p>
                <p className="text-xs sm:text-sm text-gray-700 mb-2">
                  Przed wypełnieniem tego formularza sprawdź informacje transportowe.
                </p>
                <p className="text-xs sm:text-sm text-red-600">
                  Przy zmianie po 7 dniach obowiązuje dopłata 30 zł.
                </p>
              </div>
            </div>

            {/* Regulation buttons */}
            <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6">
              {transportDocuments.has('transport_regulations') && (
                <button
                  onClick={() => window.open(transportDocuments.get('transport_regulations'), '_blank')}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2 border-2 border-[#03adf0] text-[#03adf0] hover:bg-[#03adf0] hover:text-white transition-colors text-xs sm:text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Regulamin transportu
                </button>
              )}
              {transportDocuments.has('transport_list') && (
                <button
                  onClick={() => window.open(transportDocuments.get('transport_list'), '_blank')}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2 border-2 border-[#03adf0] text-[#03adf0] hover:bg-[#03adf0] hover:text-white transition-colors text-xs sm:text-sm font-medium"
                >
                  <FileText className="w-4 h-4" />
                  Lista transportów
                </button>
              )}
            </div>

            {/* Transport form */}
            <div className="space-y-4 sm:space-y-6">
              {/* Departure */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Wybierz sposób dojazdu na obóz/kolonię
                </label>
                <div className="relative">
                  <select
                    value={transportData.departureType}
                    onChange={(e) => {
                      updateField('departureType', e.target.value);
                      if (e.target.value !== 'zbiorowy') {
                        updateField('departureCity', '');
                      }
                    }}
                    className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] pr-8 sm:pr-10 ${
                      transportErrors.departureType ? 'border-red-500' : 'border-gray-400'
                    }`}
                  >
                    <option value="">Wybierz sposób</option>
                    <option value="zbiorowy">Transport zbiorowy</option>
                    <option value="wlasny">Transport własny</option>
                  </select>
                  <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
                </div>
                {transportErrors.departureType && (
                  <p className="text-xs text-red-500 mt-1">{transportErrors.departureType}</p>
                )}
              </div>

              {transportData.departureType === 'zbiorowy' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Wybierz miasto zbiórki/wyjazdu na obóz/kolonię
                  </label>
                  <div className="relative">
                    <select
                      value={transportData.departureCity}
                      onChange={(e) => updateField('departureCity', e.target.value)}
                      disabled={loadingCities}
                      className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] pr-8 sm:pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        transportErrors.departureCity ? 'border-red-500' : 'border-gray-400'
                      }`}
                    >
                      {getCityOptions().map((city) => (
                        <option key={city.value} value={city.value}>
                          {city.label}
                        </option>
                      ))}
                    </select>
                    <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
                  </div>
                  {transportErrors.departureCity && (
                    <p className="text-xs text-red-500 mt-1">{transportErrors.departureCity}</p>
                  )}
                </div>
              )}

              {/* Return */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Wybierz sposób powrotu z obozu/kolonii
                </label>
                <div className="relative">
                  <select
                    value={transportData.returnType}
                    onChange={(e) => {
                      updateField('returnType', e.target.value);
                      if (e.target.value !== 'zbiorowy') {
                        updateField('returnCity', '');
                      }
                    }}
                    className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] pr-8 sm:pr-10 ${
                      transportErrors.returnType ? 'border-red-500' : 'border-gray-400'
                    }`}
                  >
                    <option value="">Wybierz sposób</option>
                    <option value="zbiorowy">Transport zbiorowy</option>
                    <option value="wlasny">Transport własny</option>
                  </select>
                  <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
                </div>
                {transportErrors.returnType && (
                  <p className="text-xs text-red-500 mt-1">{transportErrors.returnType}</p>
                )}
              </div>

              {transportData.returnType === 'zbiorowy' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Wybierz miasto powrotu/odbioru dziecka z obozu/kolonii
                  </label>
                  <div className="relative">
                    <select
                      value={transportData.returnCity}
                      onChange={(e) => updateField('returnCity', e.target.value)}
                      disabled={loadingCities}
                      className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] pr-8 sm:pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        transportErrors.returnCity ? 'border-red-500' : 'border-gray-400'
                      }`}
                    >
                      {getCityOptions().map((city) => (
                        <option key={city.value} value={city.value}>
                          {city.label}
                        </option>
                      ))}
                    </select>
                    <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
                  </div>
                  {transportErrors.returnCity && (
                    <p className="text-xs text-red-500 mt-1">{transportErrors.returnCity}</p>
                  )}
                </div>
              )}

              {/* Transport summary */}
              {((transportData.departureType === 'zbiorowy' && transportData.departureCity) ||
                (transportData.returnType === 'zbiorowy' && transportData.returnCity)) && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs sm:text-sm font-medium text-gray-800 mb-1">
                    Transport
                  </p>
                  {transportData.departureType === 'zbiorowy' && transportData.departureCity && (
                    <p className="text-xs text-gray-700">
                      Wyjazd: {transportData.departureCity}
                    </p>
                  )}
                  {transportData.returnType === 'zbiorowy' && transportData.returnCity && (
                    <p className="text-xs text-gray-700">
                      Powrót: {transportData.returnCity}
                    </p>
                  )}
                  {/* Always show only the higher price, never the lower one */}
                  {Math.max(
                    departurePrice || 0,
                    returnPrice || 0,
                  ) > 0 && (
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 mt-2">
                      Cena transportu: {Math.max(departurePrice || 0, returnPrice || 0).toFixed(2)} zł
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Modal for different cities - can be closed with X, but will show again if not confirmed */}
      <UniversalModal
        isOpen={showDifferentCitiesModal}
        title="Transport w dwóch różnych lokalizacjach"
        onClose={handleModalClose}
        maxWidth="md"
        showCloseButton={true}
        closeOnOverlayClick={false}
        closeOnEscape={false}
      >
        <div className="p-6">
          <p className="text-sm text-gray-700 mb-4">
            Został wybrany transport w dwóch różnych lokalizacjach.
          </p>
          <p className="text-xs text-gray-600 mb-4">
            Aby kontynuować rezerwację, musisz potwierdzić wybór różnych lokalizacji.
          </p>
          <button
            onClick={handleModalConfirm}
            className="w-full px-4 py-2 bg-[#03adf0] text-white rounded hover:bg-[#0288c7] transition-colors text-sm font-medium"
          >
            Potwierdzam różne lokalizacje
          </button>
        </div>
      </UniversalModal>
    </div>
  );
}