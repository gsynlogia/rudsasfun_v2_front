'use client';

import { Mail, FileText, MapPin } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

import { useReservation } from '@/context/ReservationContext';
import { loadStep3FormData, saveStep3FormData } from '@/utils/sessionStorage';

/**
 * InvoiceDeliverySection Component
 * Displays invoice delivery options (Electronic vs Paper, with different address option)
 */
export default function InvoiceDeliverySection() {
  const { reservation, addReservationItem, removeReservationItem, removeReservationItemsByType } = useReservation();
  const [deliveryType, setDeliveryType] = useState<'electronic' | 'paper'>('electronic');
  const [differentAddress, setDifferentAddress] = useState(false);
  const prevDeliveryTypeRef = useRef<'electronic' | 'paper'>('electronic');
  const paperInvoiceReservationIdRef = useRef<string | null>(null);

  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    postalCode: '',
    city: '',
  });

  const [deliveryAddressErrors, setDeliveryAddressErrors] = useState<Record<string, string>>({});
  const validationAttemptedRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load data from sessionStorage on mount and whenever component is visible
  useEffect(() => {
    const loadData = () => {
      const savedData = loadStep3FormData();
      if (savedData) {
        if (savedData.deliveryType) {
          setDeliveryType(savedData.deliveryType);
          prevDeliveryTypeRef.current = savedData.deliveryType;
        }
        if (savedData.differentAddress !== undefined) {
          setDifferentAddress(savedData.differentAddress);
        }
        if (savedData.deliveryAddress) {
          setDeliveryAddress(savedData.deliveryAddress);
        }
      }
      setIsInitialized(true);
    };

    // Load immediately
    loadData();

    // Also listen for focus events (when user switches back to this tab/step)
    const handleFocus = () => {
      loadData();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Restore paper invoice to reservation when initialized (only for company)
  useEffect(() => {
    if (!isInitialized) return;

    const savedData = loadStep3FormData();
    // Only add paper invoice if deliveryType is paper AND invoiceType is company
    if (savedData && savedData.deliveryType === 'paper' && savedData.invoiceType === 'company') {
      // Check if already exists in reservation
      const existing = reservation.items.find(
        item => item.type === 'other' && item.name === 'Faktura papierowa',
      );
      if (!existing) {
        addReservationItem({
          name: 'Faktura papierowa',
          price: 30,
          type: 'other',
        }, 'paper-invoice');
        paperInvoiceReservationIdRef.current = 'paper-invoice';
      } else {
        paperInvoiceReservationIdRef.current = existing.id;
      }
    } else if (savedData && savedData.invoiceType === 'private') {
      // Remove paper invoice if switching to private person
      const paperInvoiceItem = reservation.items.find(
        item => item.type === 'other' && item.name === 'Faktura papierowa',
      );
      if (paperInvoiceItem) {
        removeReservationItem(paperInvoiceItem.id);
        paperInvoiceReservationIdRef.current = null;
      }
    }

  }, [isInitialized, reservation.items.length]);

  // Update reservation when delivery type changes
  useEffect(() => {
    if (prevDeliveryTypeRef.current === deliveryType) return;

    // Check invoice type - paper invoice only for company
    const savedData = loadStep3FormData();
    const invoiceType = savedData?.invoiceType || 'private';

    if (deliveryType === 'paper' && invoiceType === 'company') {
      // Add paper invoice fee (only for company)
      const existing = reservation.items.find(
        item => item.type === 'other' && item.name === 'Faktura papierowa',
      );
      if (!existing) {
        addReservationItem({
          name: 'Faktura papierowa',
          price: 30,
          type: 'other',
        }, 'paper-invoice');
        paperInvoiceReservationIdRef.current = 'paper-invoice';
      } else {
        paperInvoiceReservationIdRef.current = existing.id;
      }
    } else {
      // Remove paper invoice fee (when switching to electronic OR when switching to private person)
      if (paperInvoiceReservationIdRef.current) {
        removeReservationItem(paperInvoiceReservationIdRef.current);
        paperInvoiceReservationIdRef.current = null;
      } else {
        // Fallback: find and remove by name
        const paperInvoiceItem = reservation.items.find(
          item => item.type === 'other' && item.name === 'Faktura papierowa',
        );
        if (paperInvoiceItem) {
          removeReservationItem(paperInvoiceItem.id);
        }
      }
    }

    prevDeliveryTypeRef.current = deliveryType;
  }, [deliveryType, addReservationItem, removeReservationItemsByType, reservation.items]);

  // Save to sessionStorage whenever data changes
  useEffect(() => {
    const savedData = loadStep3FormData();
    const formData = {
      ...savedData,
      deliveryType,
      differentAddress,
      deliveryAddress,
    };
    saveStep3FormData(formData as any);
  }, [deliveryType, differentAddress, deliveryAddress]);

  const handleDeliveryTypeChange = (type: 'electronic' | 'paper') => {
    setDeliveryType(type);
    if (type === 'electronic') {
      setDifferentAddress(false);
    }
  };

  // Validate delivery address (only when paper + different address)
  const validateDeliveryAddress = useCallback((): boolean => {
    // Only validate if paper delivery and different address is checked
    if (deliveryType !== 'paper' || !differentAddress) {
      setDeliveryAddressErrors({});
      return true; // No validation needed
    }

    const errors: Record<string, string> = {};

    if (!deliveryAddress.street || deliveryAddress.street.trim() === '') {
      errors.street = 'Pole obowiązkowe';
    }
    if (!deliveryAddress.postalCode || deliveryAddress.postalCode.trim() === '') {
      errors.postalCode = 'Pole obowiązkowe';
    }
    if (!deliveryAddress.city || deliveryAddress.city.trim() === '') {
      errors.city = 'Pole obowiązkowe';
    }

    setDeliveryAddressErrors(errors);
    return Object.keys(errors).length === 0;
  }, [deliveryType, differentAddress, deliveryAddress]);

  // Expose validation function for external use (e.g., Step3 validation)
  useEffect(() => {
    (window as any).validateInvoiceDeliverySection = () => {
      validationAttemptedRef.current = true;
      return validateDeliveryAddress();
    };

    return () => {
      delete (window as any).validateInvoiceDeliverySection;
    };
  }, [validateDeliveryAddress]);

  const updateDeliveryAddressField = (field: keyof typeof deliveryAddress, value: string) => {
    setDeliveryAddress((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (deliveryAddressErrors[field]) {
      setDeliveryAddressErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
        Wysyłka faktury
      </h2>
      <section className="bg-white p-4 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Delivery Type Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Electronic Option */}
            <button
              type="button"
              onClick={() => handleDeliveryTypeChange('electronic')}
              className={`p-4 sm:p-6 border-2 transition-all text-left ${
                deliveryType === 'electronic'
                  ? 'border-[#03adf0] bg-[#03adf0] text-white'
                  : 'border-gray-300 bg-gray-100 text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                <Mail className={`w-6 h-6 sm:w-8 sm:h-8 ${deliveryType === 'electronic' ? 'text-white' : 'text-[#03adf0]'}`} />
                <span className="text-base sm:text-lg font-semibold">
                  Wersja elektroniczna
                </span>
              </div>
              <p className="text-xs sm:text-sm opacity-90">
                Faktura zostanie wysłana na adres e-mail
              </p>
            </button>

            {/* Paper Option */}
            <button
              type="button"
              onClick={() => handleDeliveryTypeChange('paper')}
              className={`p-4 sm:p-6 border-2 transition-all text-left ${
                deliveryType === 'paper'
                  ? 'border-[#03adf0] bg-[#03adf0] text-white'
                  : 'border-gray-300 bg-gray-100 text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                <FileText className={`w-6 h-6 sm:w-8 sm:h-8 ${deliveryType === 'paper' ? 'text-white' : 'text-[#03adf0]'}`} />
                <span className="text-base sm:text-lg font-semibold">
                  Wersja papierowa
                </span>
              </div>
              <p className="text-xs sm:text-sm opacity-90">
                Faktura zostanie wysłana pocztą +30 PLN
              </p>
            </button>
          </div>

          {/* Different Address Option (only for paper) */}
          {deliveryType === 'paper' && (
            <div className="space-y-4 sm:space-y-6">
              <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={differentAddress}
                  onChange={(e) => setDifferentAddress(e.target.checked)}
                  className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400"
                />
                <span className="text-xs sm:text-sm text-gray-700">
                  Wysłać na inny adres niż na fakturze
                </span>
              </label>

              {differentAddress && (
                <div className="space-y-4 sm:space-y-6 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      Ulica i numer <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
                      <input
                        type="text"
                        value={deliveryAddress.street}
                        onChange={(e) => updateDeliveryAddressField('street', e.target.value)}
                        placeholder="Ulica i numer"
                        className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${
                          deliveryAddressErrors.street ? 'border-red-500' : 'border-gray-400'
                        }`}
                      />
                    </div>
                    {deliveryAddressErrors.street && (
                      <p className="text-xs text-red-500 mt-1">{deliveryAddressErrors.street}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                        Kod pocztowy <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
                        <input
                          type="text"
                          value={deliveryAddress.postalCode}
                          onChange={(e) => updateDeliveryAddressField('postalCode', e.target.value)}
                          placeholder="np. 00-000"
                          className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${
                            deliveryAddressErrors.postalCode ? 'border-red-500' : 'border-gray-400'
                          }`}
                        />
                      </div>
                      {deliveryAddressErrors.postalCode && (
                        <p className="text-xs text-red-500 mt-1">{deliveryAddressErrors.postalCode}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                        Miejscowość <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
                        <input
                          type="text"
                          value={deliveryAddress.city}
                          onChange={(e) => updateDeliveryAddressField('city', e.target.value)}
                          placeholder="Miejscowość"
                          className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${
                            deliveryAddressErrors.city ? 'border-red-500' : 'border-gray-400'
                          }`}
                        />
                      </div>
                      {deliveryAddressErrors.city && (
                        <p className="text-xs text-red-500 mt-1">{deliveryAddressErrors.city}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

