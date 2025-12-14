'use client';

import { Phone, Info } from 'lucide-react';
import { useState, useEffect } from 'react';

import UniversalModal from '@/components/admin/UniversalModal';
import { authService } from '@/lib/services/AuthService';
import { paymentService, CreatePaymentRequest } from '@/lib/services/PaymentService';
import { ReservationResponse } from '@/lib/services/ReservationService';
import { API_BASE_URL } from '@/utils/api-config';

interface AdditionalServicesTilesProps {
  selectedAddons?: string[] | null;
  selectedProtection?: string[] | null;
  reservation?: ReservationResponse | null;
}

interface Addon {
  id: number;
  name: string;
  icon_svg: string | null;
  price: number;
}

/**
 * AdditionalServicesTiles Component
 * Displays tiles for additional services (addons and protection)
 * Based on detailed design specification
 */
export default function AdditionalServicesTiles({
  selectedAddons = [],
  selectedProtection = [],
  reservation = null,
}: AdditionalServicesTilesProps) {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPocketMoneyModal, setShowPocketMoneyModal] = useState(false);
  const [blinkPhoneNumber, setBlinkPhoneNumber] = useState<string | null>(null);
  const [loadingBlinkConfig, setLoadingBlinkConfig] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [processingServiceId, setProcessingServiceId] = useState<string | null>(null);

  // Fetch addons from API
  useEffect(() => {
    const fetchAddons = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/addons/public`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAddons(data.addons || []);
      } catch (error) {
        console.error('Error fetching addons:', error);
        setAddons([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAddons();
  }, []);

  // Fetch Blink configuration when modal opens
  const handlePocketMoneyClick = async () => {
    setShowPocketMoneyModal(true);
    setLoadingBlinkConfig(true);

    try {
      const token = authService.getToken();
      if (!token) {
        console.error('No authentication token');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/blink-config/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const config = await response.json();
        console.log('Blink config response:', config);
        if (config && config.phone_number) {
          setBlinkPhoneNumber(config.phone_number);
        } else {
          console.log('No phone number in config:', config);
          setBlinkPhoneNumber(null);
        }
      } else if (response.status === 404) {
        // Config doesn't exist yet
        console.log('Blink config not found (404)');
        setBlinkPhoneNumber(null);
      } else {
        const errorText = await response.text();
        console.error('Error fetching Blink config:', response.status, errorText);
        setBlinkPhoneNumber(null);
      }
    } catch (error) {
      console.error('Error fetching Blink configuration:', error);
      setBlinkPhoneNumber(null);
    } finally {
      setLoadingBlinkConfig(false);
    }
  };

  // Map addon IDs to check if they're selected
  const selectedAddonIds = new Set(selectedAddons?.map(id => id.toString()) || []);
  const selectedProtectionIds = new Set(selectedProtection || []);

  // Handle service payment (addon or protection)
  const handleServicePayment = async (serviceId: string, serviceName: string, price: number, serviceType: 'addon' | 'protection') => {
    if (!reservation) {
      console.error('Brak danych rezerwacji');
      alert('Brak danych rezerwacji. Nie można utworzyć płatności.');
      return;
    }

    setIsProcessingPayment(true);
    setProcessingServiceId(serviceId);

    try {
      // Get payer data from reservation (first parent)
      const firstParent = reservation.parents_data && reservation.parents_data.length > 0
        ? reservation.parents_data[0]
        : null;

      if (!firstParent || !firstParent.email) {
        throw new Error('Brak danych płatnika (email) w rezerwacji');
      }

      const payerEmail = firstParent.email;
      const payerName = firstParent.firstName && firstParent.lastName
        ? `${firstParent.firstName} ${firstParent.lastName}`.trim()
        : undefined;

      // Create order ID based on service type
      const servicePrefix = serviceType === 'protection' ? serviceId.toUpperCase() : 'ADDON';
      const orderId = `${servicePrefix}-${reservation.id}-${Date.now()}`;

      // Prepare payment request
      const paymentRequest: CreatePaymentRequest = {
        amount: price,
        description: `${serviceName} - Rezerwacja #${reservation.id}`,
        order_id: orderId,
        payer_email: payerEmail,
        payer_name: payerName,
        success_url: `${window.location.origin}/payment/success?reservation_id=${reservation.id}&service=${serviceId}&type=${serviceType}`,
        error_url: `${window.location.origin}/payment/failure?reservation_id=${reservation.id}&service=${serviceId}&type=${serviceType}`,
      };

      // Create payment
      const paymentResponse = await paymentService.createPayment(paymentRequest);

      // Redirect to payment URL if available
      if (paymentResponse.payment_url) {
        window.location.href = paymentResponse.payment_url;
      } else {
        throw new Error('Nie otrzymano URL płatności');
      }
    } catch (error) {
      console.error(`Błąd podczas tworzenia płatności za ${serviceName}:`, error);
      alert(error instanceof Error ? error.message : 'Wystąpił błąd podczas tworzenia płatności');
      setIsProcessingPayment(false);
      setProcessingServiceId(null);
    }
  };

  // Define protection items with proper icons
  const protections = [
    {
      id: 'tarcza',
      name: 'Tarcza',
      price: 50,
      icon: (isActive: boolean) => (
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${isActive ? 'text-white' : 'text-gray-400'}`}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        </div>
      ),
    },
    {
      id: 'oaza',
      name: 'Oaza',
      price: 100,
      icon: (isActive: boolean) => (
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${isActive ? 'text-white' : 'text-gray-400'}`}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      ),
    },
  ];

  // Helper function to render icon (smaller size to fit in square)
  const renderIcon = (addon: Addon, isActive: boolean) => {
    if (addon.icon_svg) {
      return (
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 ${isActive ? 'text-white' : 'text-gray-400'}`}
          dangerouslySetInnerHTML={{ __html: addon.icon_svg }}
        />
      );
    }
    // Fallback icon
    return (
      <svg className={`w-10 h-10 sm:w-12 sm:h-12 ${isActive ? 'text-white' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  // Pocket money (Kieszonkowe) - special tile, always first, with wallet icon
  const pocketMoneyTile = {
    type: 'pocket' as const,
    id: 'kieszonkowe',
    name: 'Kieszonkowe',
    icon: (isActive: boolean) => (
      <div className={`w-10 h-10 sm:w-12 sm:h-12 ${isActive ? 'text-white' : 'text-gray-400'}`}>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
    ),
    isActive: true, // Always active
    hasButton: true,
    buttonText: 'zarządzaj',
    buttonColor: '#E6524A', // Red
  };

  // Define all service tiles
  // Only show services that exist in the database (addons and protections)
  const serviceTiles = [
    // Pocket money (Kieszonkowe) - always first, with wallet icon
    {
      type: 'pocket' as const,
      id: pocketMoneyTile.id,
      name: pocketMoneyTile.name,
      icon: pocketMoneyTile.icon(pocketMoneyTile.isActive),
      isActive: pocketMoneyTile.isActive,
      hasButton: pocketMoneyTile.hasButton,
      buttonText: pocketMoneyTile.buttonText,
      buttonColor: pocketMoneyTile.buttonColor,
    },
    // Addons - all addons from database
    ...addons.map(addon => {
      const isActive = selectedAddonIds.has(addon.id.toString());
      return {
        type: 'addon' as const,
        id: addon.id.toString(),
        name: addon.name,
        price: addon.price,
        icon: renderIcon(addon, isActive),
        isActive,
        hasButton: !isActive, // Button only for inactive (not in reservation)
        buttonText: 'domów',
        buttonColor: '#3BAAF5',
        onClick: () => handleServicePayment(addon.id.toString(), addon.name, addon.price, 'addon'),
      };
    }),
    // Protection - always show both Tarcza and Oaza
    ...protections.map(protection => {
      const isActive = selectedProtectionIds.has(protection.id);
      return {
        type: 'protection' as const,
        id: protection.id,
        name: protection.name,
        price: (protection as any).price || undefined,
        icon: protection.icon(isActive),
        isActive,
        hasButton: !isActive, // Button only for inactive (not in reservation)
        buttonText: 'domów',
        buttonColor: '#3BAAF5',
        onClick: () => handleServicePayment(protection.id, protection.name, (protection as any).price || 0, 'protection'),
      };
    }),
  ];

  // Sort by name for consistent display (Kieszonkowe always first)
  const sortedTiles = serviceTiles.sort((a, b) => {
    // Custom order: Kieszonkowe first, then Skuter, Banan, Quady, Tarcza, Oaza
    const order: Record<string, number> = {
      'kieszonkowe': 0,
      'skuter': 1,
      'banan': 2,
      'quady': 3,
      'tarcza': 4,
      'oaza': 5,
    };
    const aOrder = order[a.name.toLowerCase()] ?? 999;
    const bOrder = order[b.name.toLowerCase()] ?? 999;
    return aOrder - bOrder;
  });

  if (loading) {
    return <div className="mb-4">Ładowanie usług dodatkowych...</div>;
  }

  return (
    <div className="mb-6">
      <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3 sm:mb-4">Usługi dodatkowe</h5>
      <div className="flex gap-3 sm:gap-4 md:gap-5 w-full justify-start">
        {sortedTiles.map((tile) => {
          const { isActive } = tile;
          // Active = blue, Inactive = gray
          const bgColor = isActive ? '#3BAAF5' : '#F3F3F3';
          const textColor = isActive ? 'text-white' : 'text-gray-600';
          const iconColor = isActive ? 'text-white' : 'text-gray-400';

          return (
            <div
              key={tile.id}
              className={`
                flex flex-col items-center justify-between
                w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32
                p-2 sm:p-3
                transition-colors
                flex-shrink-0
                cursor-pointer
              `}
              style={{
                borderRadius: '0px', // Perfect square, no rounded edges
                backgroundColor: bgColor,
              }}
              onMouseEnter={(e) => {
                if (isActive) {
                  e.currentTarget.style.backgroundColor = '#0288c7'; // Darker blue on hover
                } else {
                  e.currentTarget.style.backgroundColor = '#E0E0E0'; // Lighter gray on hover
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = bgColor; // Reset to original color
              }}
            >
              {/* Icon - centered, smaller (only if exists) */}
              {tile.icon && (
                <div className="flex items-center justify-center mb-1" style={{ minHeight: '40%', maxHeight: '45%' }}>
                  <div className={iconColor}>
                    {tile.icon}
                  </div>
                </div>
              )}

              {/* Title - centered, compact */}
              <div className={`text-center mb-1 ${isActive ? 'text-white font-bold' : textColor}`} style={{ minHeight: tile.icon ? '20%' : '40%' }}>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] sm:text-xs font-semibold leading-tight">{tile.name}</span>
                  {!isActive && (tile as any).price && (tile as any).price > 0 && (
                    <span className={`text-[9px] sm:text-[10px] font-medium leading-tight mt-0.5 ${isActive ? 'text-white' : textColor}`}>
                      + {(tile as any).price} PLN
                    </span>
                  )}
                </div>
              </div>

              {/* Button - for inactive services or Kieszonkowe, compact */}
              {tile.hasButton && (
                <button
                  className={`
                    w-full
                    py-1 sm:py-1.5
                    text-white
                    text-[9px] sm:text-[10px]
                    font-medium
                    transition-colors
                    cursor-pointer
                  `}
                  style={{
                    backgroundColor: tile.buttonColor,
                    borderRadius: '0px', // No rounded edges
                    minHeight: '25%',
                  }}
                  onMouseEnter={(e) => {
                    // Darker color on hover
                    if (tile.buttonColor === '#E6524A') {
                      e.currentTarget.style.backgroundColor = '#C73E35'; // Darker red
                    } else {
                      e.currentTarget.style.backgroundColor = '#0288c7'; // Darker blue
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = tile.buttonColor; // Reset to original color
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tile.id === 'kieszonkowe') {
                      handlePocketMoneyClick();
                    } else if ((tile as any).onClick) {
                      (tile as any).onClick();
                    }
                  }}
                  disabled={isProcessingPayment && processingServiceId === tile.id}
                >
                  {tile.buttonText}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Pocket Money Management Modal */}
      <UniversalModal
        isOpen={showPocketMoneyModal}
        onClose={() => {
          setShowPocketMoneyModal(false);
          setBlinkPhoneNumber(null);
        }}
        title="Zarządzanie kieszonkowym"
        maxWidth="md"
      >
        <div className="p-6">
          {loadingBlinkConfig ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0] mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">Ładowanie konfiguracji...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">
                      Kieszonkowe dla dziecka
                    </h4>
                    {blinkPhoneNumber ? (
                      <p className="text-sm text-blue-800">
                        W celu przesłania kieszonkowych dla dziecka proszę wykonać blik na numer{' '}
                        <span className="font-semibold text-blue-900">{blinkPhoneNumber}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-blue-800">
                        W celu przesłania kieszonkowych dla dziecka proszę wykonać blik na numer telefonu.
                        Numer telefonu nie został jeszcze skonfigurowany w systemie.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowPocketMoneyModal(false);
                    setBlinkPhoneNumber(null);
                  }}
                  className="px-6 py-2 bg-[#03adf0] text-white font-medium rounded-lg hover:bg-[#0288c7] transition-colors"
                >
                  Zamknij
                </button>
              </div>
            </div>
          )}
        </div>
      </UniversalModal>
    </div>
  );
}

