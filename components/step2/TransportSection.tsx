'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { AlertTriangle, Download, FileText, MapPin } from 'lucide-react';
import { loadStep2FormData, saveStep2FormData } from '@/utils/sessionStorage';
import { authenticatedApiCall } from '@/utils/api-auth';
import { useReservation } from '@/context/ReservationContext';
import UniversalModal from '@/components/admin/UniversalModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  const { addReservationItem, removeReservationItemsByType, reservation } = useReservation();
  
  // Extract campId and editionId from URL
  const pathParts = pathname.split('/').filter(Boolean);
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
  });

  const [cities, setCities] = useState<TransportCity[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
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
    const savedData = loadStep2FormData();
    if (savedData && savedData.transportData) {
      setTransportData(savedData.transportData);
    } else {
      // Set default values if no saved data - default to collective transport
      setTransportData({
        departureType: 'zbiorowy',
        departureCity: '',
        returnType: 'zbiorowy',
        returnCity: '',
      });
      // Save default values to sessionStorage
      const formData = {
        ...savedData,
        transportData: {
          departureType: 'zbiorowy',
          departureCity: '',
          returnType: 'zbiorowy',
          returnCity: '',
        },
      };
      saveStep2FormData(formData as any);
    }
    // Load modal confirmation status
    if (savedData && savedData.transportModalConfirmed) {
      setTransportModalConfirmed(savedData.transportModalConfirmed);
    }
  }, []);

  // Fetch cities from API when collective transport is selected
  useEffect(() => {
    const fetchCities = async () => {
      if (!campId || !editionId) return;
      
      if (transportData.departureType === 'zbiorowy' || transportData.returnType === 'zbiorowy') {
        setLoadingCities(true);
        try {
          const response = await authenticatedApiCall<TransportCity[]>(
            `${API_BASE_URL}/api/camps/${campId}/properties/${editionId}/transport/cities`
          );
          setCities(response || []);
        } catch (error) {
          console.error('Error fetching transport cities:', error);
          setCities([]);
        } finally {
          setLoadingCities(false);
        }
      } else {
        setCities([]);
      }
    };

    fetchCities();
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

  // Check for different cities and show modal (only if not already confirmed)
  useEffect(() => {
    const citiesDifferent = 
      transportData.departureType === 'zbiorowy' && 
      transportData.returnType === 'zbiorowy' &&
      transportData.departureCity && 
      transportData.returnCity &&
      transportData.departureCity !== transportData.returnCity;

    // Only show modal if cities are different AND modal hasn't been confirmed yet
    if (citiesDifferent && !showDifferentCitiesModal && !transportModalConfirmed) {
      setShowDifferentCitiesModal(true);
    }
  }, [transportData, showDifferentCitiesModal, transportModalConfirmed]);

  // Update reservation with transport price
  useEffect(() => {
    // Remove existing transport item
    removeReservationItemsByType('transport');

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
        transportName = `Transport zbiórkowy: ${departureCityName} (wyjazd), ${returnCityName} (powrót)`;
      } else if (transportData.departureType === 'zbiorowy' && transportData.departureCity) {
        transportName = `Transport zbiórkowy: ${departureCityName}`;
      } else if (transportData.returnType === 'zbiorowy' && transportData.returnCity) {
        transportName = `Transport zbiórkowy: ${returnCityName}`;
      }

      addReservationItem({
        name: transportName,
        price: maxPrice,
        type: 'transport',
      }, 'transport');
    }
  }, [departurePrice, returnPrice, transportData, cities, addReservationItem, removeReservationItemsByType]);

  // Save to sessionStorage whenever transport data or modal confirmation changes
  useEffect(() => {
    const savedData = loadStep2FormData();
    const formData = {
      ...savedData,
      transportData,
      transportModalConfirmed,
    };
    saveStep2FormData(formData as any);
  }, [transportData, transportModalConfirmed]);

  // Validate transport fields
  const validateTransport = useCallback((): boolean => {
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

    setTransportErrors(errors);
    return Object.keys(errors).length === 0;
  }, [transportData]);

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
    cities.forEach(city => {
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
      transportData,
      transportModalConfirmed: true,
    };
    saveStep2FormData(formData as any);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
        Transport
      </h2>
      <section className="bg-white p-4 sm:p-6">
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
              Przy zmianie po 30 dniach obowiązuje dopłata 30 zł.
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
                returnPrice || 0
              ) > 0 && (
                <p className="text-xs sm:text-sm font-semibold text-gray-900 mt-2">
                  Cena transportu: {Math.max(departurePrice || 0, returnPrice || 0).toFixed(2)} zł
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Modal for different cities */}
      <UniversalModal
        isOpen={showDifferentCitiesModal}
        title="Transport w dwóch różnych lokalizacjach"
        onClose={handleModalConfirm}
        maxWidth="md"
      >
        <div className="p-6">
          <p className="text-sm text-gray-700 mb-4">
            Wybrałeś transport zbiórkowy w dwóch różnych lokalizacjach:
          </p>
          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium text-gray-900">
              Transport do obozu: {transportData.departureCity}
              {departurePrice !== null && ` (${departurePrice.toFixed(2)} zł)`}
            </p>
            <p className="text-sm font-medium text-gray-900">
              Transport z obozu: {transportData.returnCity}
              {returnPrice !== null && ` (${returnPrice.toFixed(2)} zł)`}
            </p>
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-4">
            Do rezerwacji zostanie dodana wyższa cena: {Math.max(departurePrice || 0, returnPrice || 0).toFixed(2)} zł
          </p>
          <button
            onClick={handleModalConfirm}
            className="w-full px-4 py-2 bg-[#03adf0] text-white rounded hover:bg-[#0288c7] transition-colors text-sm font-medium"
          >
            Potwierdź
          </button>
        </div>
      </UniversalModal>
    </div>
  );
}
