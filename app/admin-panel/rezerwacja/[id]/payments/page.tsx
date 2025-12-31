'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Check, XCircle, Building2, Shield, Utensils, Plus, FileText, Download, RefreshCw, Search, Plus as PlusIcon } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import { authenticatedApiCall } from '@/utils/api-auth';
import { paymentService, PaymentResponse } from '@/lib/services/PaymentService';
import { invoiceService, InvoiceResponse } from '@/lib/services/InvoiceService';
import { manualPaymentService, ManualPaymentResponse } from '@/lib/services/ManualPaymentService';
import { manualInvoiceService, ManualInvoiceResponse } from '@/lib/services/ManualInvoiceService';

interface ReservationDetails {
  id: number;
  camp_id?: number;
  property_id?: number;
  camp_name?: string | null;
  property_name?: string | null;
  property_start_date?: string | null;
  property_end_date?: string | null;
  participant_first_name?: string | null;
  participant_last_name?: string | null;
  total_price?: number;
  deposit_amount?: number | null;
  selected_addons?: (string | number)[] | null;
  selected_protection?: (string | number)[] | null;
  selected_promotion?: string | null;
  promotion_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user_id?: number;
}

interface Addon {
  id: number;
  name: string;
  price: number;
}

interface Protection {
  id: number;
  name: string;
  price: number;
}

interface Promotion {
  id: number;
  name: string;
  price: number;
}

export default function ReservationPaymentsPage() {
  const params = useParams();
  const router = useRouter();
  const reservationNumber = params.id as string;

  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [manualPayments, setManualPayments] = useState<ManualPaymentResponse[]>([]);
  const [manualInvoices, setManualInvoices] = useState<ManualInvoiceResponse[]>([]);
  const [addons, setAddons] = useState<Map<number, Addon>>(new Map());
  const [protections, setProtections] = useState<Map<number, Protection>>(new Map());
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Search states
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch reservation by number
        const reservationData = await authenticatedApiCall<ReservationDetails>(
          `/api/reservations/by-number/${reservationNumber}`
        );
        setReservation(reservationData);

        // Fetch all payments (Tpay)
        const allPayments = await paymentService.listPayments(0, 1000);
        
        // Filter payments for this reservation
        const reservationPayments = allPayments.filter(p => {
          const orderId = p.order_id || '';
          if (orderId === String(reservationData.id)) return true;
          if (orderId === `RES-${reservationData.id}`) return true;
          const match = orderId.match(/^RES-(\d+)(?:-|$)/);
          if (match && parseInt(match[1], 10) === reservationData.id) return true;
          const addonMatch = orderId.match(/^ADDON-(\d+)-/);
          if (addonMatch && parseInt(addonMatch[1], 10) === reservationData.id) return true;
          return false;
        });
        setPayments(reservationPayments);

        // Fetch manual payments
        try {
          const manualPaymentsData = await manualPaymentService.getByReservation(reservationData.id);
          setManualPayments(manualPaymentsData);
        } catch (err) {
          console.warn('Could not fetch manual payments:', err);
          setManualPayments([]);
        }

        // Fetch invoices (Fakturownia)
        try {
          const invoiceListResponse = await invoiceService.getInvoicesByReservation(reservationData.id);
          setInvoices(invoiceListResponse.invoices || []);
        } catch (err) {
          console.warn('Could not fetch invoices:', err);
          setInvoices([]);
        }

        // Fetch manual invoices
        try {
          const manualInvoicesData = await manualInvoiceService.getByReservation(reservationData.id);
          setManualInvoices(manualInvoicesData);
        } catch (err) {
          console.warn('Could not fetch manual invoices:', err);
          setManualInvoices([]);
        }

        // Fetch addons details
        if (reservationData.selected_addons && reservationData.selected_addons.length > 0) {
          const addonsMap = new Map<number, Addon>();
          for (const addonIdValue of reservationData.selected_addons) {
            try {
              const addonId = typeof addonIdValue === 'number' ? addonIdValue : parseInt(String(addonIdValue));
              if (!isNaN(addonId)) {
                const addon = await authenticatedApiCall<Addon>(`/api/addons/${addonId}`);
                addonsMap.set(addonId, addon);
              }
            } catch (err) {
              console.error(`Error fetching addon ${addonIdValue}:`, err);
            }
          }
          setAddons(addonsMap);
        }

        // Fetch protections details
        if (reservationData.selected_protection && reservationData.selected_protection.length > 0 && reservationData.camp_id && reservationData.property_id) {
          const protectionsMap = new Map<number, Protection>();
          
          try {
            const turnusProtections = await authenticatedApiCall<any[]>(
              `/api/camps/${reservationData.camp_id}/properties/${reservationData.property_id}/protections`
            );
            
            for (const protectionIdValue of reservationData.selected_protection) {
              try {
                let generalProtectionId: number | null = null;
                if (typeof protectionIdValue === 'string' && protectionIdValue.startsWith('protection-')) {
                  const numericId = parseInt(protectionIdValue.split('-')[1], 10);
                  if (!isNaN(numericId)) {
                    generalProtectionId = numericId;
                  }
                } else {
                  const parsedId = typeof protectionIdValue === 'number' ? protectionIdValue : parseInt(String(protectionIdValue));
                  if (!isNaN(parsedId)) {
                    generalProtectionId = parsedId;
                  }
                }
                
                if (generalProtectionId) {
                  const turnusProtection = turnusProtections.find(
                    (tp: any) => tp.general_protection_id === generalProtectionId || tp.id === generalProtectionId
                  );
                  
                  if (turnusProtection && turnusProtection.general_protection_id) {
                    try {
                      const generalProtection = await authenticatedApiCall<Protection>(
                        `/api/general-protections/${turnusProtection.general_protection_id}`
                      );
                      protectionsMap.set(generalProtectionId, {
                        ...generalProtection,
                        price: turnusProtection.price || generalProtection.price,
                      });
                    } catch (err) {
                      protectionsMap.set(generalProtectionId, {
                        id: turnusProtection.general_protection_id,
                        name: turnusProtection.name || `Ochrona ${generalProtectionId}`,
                        price: turnusProtection.price || 0,
                      });
                    }
                  } else {
                    try {
                      const protection = await authenticatedApiCall<Protection>(`/api/general-protections/${generalProtectionId}`);
                      protectionsMap.set(generalProtectionId, protection);
                    } catch (err) {
                      console.error(`Error fetching protection ${protectionIdValue}:`, err);
                    }
                  }
                }
              } catch (err) {
                console.error(`Error processing protection ${protectionIdValue}:`, err);
              }
            }
          } catch (err) {
            console.warn('Could not fetch turnus protections:', err);
          }
          setProtections(protectionsMap);
        }

        // Fetch promotion details
        if (reservationData.selected_promotion && reservationData.camp_id && reservationData.property_id) {
          try {
            const relationId = typeof reservationData.selected_promotion === 'number' 
              ? reservationData.selected_promotion 
              : parseInt(String(reservationData.selected_promotion));
            if (!isNaN(relationId)) {
              const turnusPromotions = await authenticatedApiCall<any[]>(
                `/api/camps/${reservationData.camp_id}/properties/${reservationData.property_id}/promotions`
              );
              const foundPromotion = turnusPromotions.find(
                (p: any) => p.relation_id === relationId || p.id === relationId
              );
              if (foundPromotion && foundPromotion.general_promotion_id) {
                try {
                  const generalPromotion = await authenticatedApiCall<Promotion>(
                    `/api/general-promotions/${foundPromotion.general_promotion_id}`
                  );
                  setPromotion({
                    ...generalPromotion,
                    price: foundPromotion.price || generalPromotion.price,
                  });
                } catch (err) {
                  console.warn('Could not fetch general promotion:', err);
                }
              }
            }
          } catch (err) {
            console.warn('Could not fetch promotion:', err);
          }
        }
      } catch (err) {
        console.error('Error fetching payment details:', err);
        setError(err instanceof Error ? err.message : 'Błąd podczas ładowania danych płatności');
      } finally {
        setIsLoading(false);
      }
    };

    if (reservationNumber) {
      fetchData();
    }
  }, [reservationNumber]);

  const handleSyncPayments = async () => {
    setIsSyncing(true);
    try {
      const pendingPayments = payments.filter(p => p.status === 'pending' && p.transaction_id);
      for (const payment of pendingPayments) {
        try {
          await paymentService.syncPaymentStatus(payment.transaction_id);
        } catch (err) {
          console.warn(`Could not sync payment ${payment.transaction_id}:`, err);
        }
      }
      window.location.reload();
    } catch (err) {
      console.error('Error syncing payments:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Brak danych';
    try {
      return new Date(dateString).toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Brak danych';
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '0.00 PLN';
    return `${amount.toFixed(2)} PLN`;
  };

  const calculatePaidAmount = () => {
    // Sum Tpay payments
    const tpayAmount = payments
      .filter(p => p.status === 'success' || (p.status === 'pending' && p.amount && p.amount > 0))
      .reduce((sum, p) => sum + (p.paid_amount || p.amount || 0), 0);
    
    // Sum manual payments
    const manualAmount = manualPayments.reduce((sum, p) => sum + p.amount, 0);
    
    return tpayAmount + manualAmount;
  };

  const calculateTotalAddonsPrice = () => {
    return Array.from(addons.values()).reduce((sum, addon) => sum + addon.price, 0);
  };

  const calculateTotalProtectionsPrice = () => {
    // Use prices from API (turnusProtection.price or generalProtection.price)
    return Array.from(protections.values()).reduce((sum, protection) => sum + protection.price, 0);
  };

  const calculateDepositAmount = () => {
    const baseDeposit = 500;
    const protectionTotal = calculateTotalProtectionsPrice();
    return baseDeposit + protectionTotal;
  };

  // Filtered payments (manual + Tpay combined)
  const allPaymentsCombined = useMemo(() => {
    const combined: Array<PaymentResponse | ManualPaymentResponse & { type: 'tpay' | 'manual' }> = [];
    
    // Add Tpay payments
    payments.forEach(p => {
      combined.push({ ...p, type: 'tpay' } as any);
    });
    
    // Add manual payments
    manualPayments.forEach(p => {
      combined.push({ ...p, type: 'manual' } as any);
    });
    
    return combined;
  }, [payments, manualPayments]);

  // Filtered payments for table
  const filteredPayments = useMemo(() => {
    if (!paymentSearchQuery) return allPaymentsCombined;
    const query = paymentSearchQuery.toLowerCase();
    return allPaymentsCombined.filter((p: any) => {
      const amount = p.type === 'manual' ? p.amount : (p.paid_amount || p.amount || 0);
      const description = p.description || '';
      const method = p.type === 'manual' ? (p.payment_method || '') : '';
      const date = p.type === 'manual' ? formatDate(p.payment_date) : formatDate(p.payment_date || p.paid_at || p.created_at);
      return (
        amount.toString().includes(query) ||
        description.toLowerCase().includes(query) ||
        method.toLowerCase().includes(query) ||
        date.toLowerCase().includes(query)
      );
    });
  }, [allPaymentsCombined, paymentSearchQuery]);

  // Filtered invoices (Fakturownia + manual combined)
  const allInvoicesCombined = useMemo(() => {
    const combined: Array<InvoiceResponse | ManualInvoiceResponse & { type: 'fakturownia' | 'manual' }> = [];
    
    // Add Fakturownia invoices
    invoices.forEach(inv => {
      combined.push({ ...inv, type: 'fakturownia' } as any);
    });
    
    // Add manual invoices
    manualInvoices.forEach(inv => {
      combined.push({ ...inv, type: 'manual' } as any);
    });
    
    return combined;
  }, [invoices, manualInvoices]);

  // Filtered invoices for table
  const filteredInvoices = useMemo(() => {
    if (!invoiceSearchQuery) return allInvoicesCombined;
    const query = invoiceSearchQuery.toLowerCase();
    return allInvoicesCombined.filter((inv: any) => {
      const number = inv.invoice_number || '';
      const buyer = inv.buyer_name || '';
      const amount = inv.total_amount || 0;
      return (
        number.toLowerCase().includes(query) ||
        buyer.toLowerCase().includes(query) ||
        amount.toString().includes(query)
      );
    });
  }, [allInvoicesCombined, invoiceSearchQuery]);

  if (isLoading) {
    return (
      <SectionGuard section="payments">
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
              <div className="text-gray-500">Ładowanie danych płatności...</div>
            </div>
          </div>
        </AdminLayout>
      </SectionGuard>
    );
  }

  if (error || !reservation) {
    return (
      <SectionGuard section="payments">
        <AdminLayout>
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-sm text-red-700">{error || 'Rezerwacja nie została znaleziona'}</p>
          </div>
        </AdminLayout>
      </SectionGuard>
    );
  }

  const paidAmount = calculatePaidAmount();
  const totalAmount = reservation.total_price || 0;
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const depositAmount = calculateDepositAmount();
  const hasDeposit = depositAmount > 0;
  const pendingPayments = payments.filter(p => p.status === 'pending');

  return (
    <SectionGuard section="payments">
      <AdminLayout>
        <div className="h-full flex flex-col animate-fadeIn">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin-panel/payments')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 rounded"
                style={{ borderRadius: 0, cursor: 'pointer' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Płatności: {reservationNumber}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Obóz: {reservation.camp_name || 'Brak danych'} | 
                  Turnus: {reservation.property_name || 'Brak danych'}
                  {reservation.property_start_date && reservation.property_end_date && (
                    <> | Termin: {formatDate(reservation.property_start_date)} - {formatDate(reservation.property_end_date)}</>
                  )}
                  {reservation.participant_first_name && reservation.participant_last_name && (
                    <> | Uczestnik: {reservation.participant_first_name} {reservation.participant_last_name}</>
                  )}
                </p>
              </div>
            </div>
            {pendingPayments.length > 0 && (
              <button
                onClick={handleSyncPayments}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-all duration-200 disabled:opacity-50"
                style={{ borderRadius: 0 }}
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Synchronizacja...' : 'Synchronizuj płatności'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-auto">
            {/* Koszt całkowity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 lg:col-span-2">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Koszt całkowity</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-700">Całkowity koszt:</label>
                  <p className="text-sm font-bold text-gray-900">{totalAmount.toFixed(2)} PLN</p>
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-700">Całkowite wpływy:</label>
                  <p className="text-sm font-bold text-gray-900">{paidAmount.toFixed(2)} PLN</p>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <label className="text-sm font-medium text-gray-700">Pozostała kwota do zapłaty:</label>
                  <p className="text-sm font-bold text-[#03adf0]">{remainingAmount.toFixed(2)} PLN</p>
                </div>
              </div>
            </div>

            {/* Płatność przelewem tradycyjnym */}
            {hasDeposit && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 lg:col-span-2">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Płatność przelewem tradycyjnym</h2>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Zaliczka do wpłaty:</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Zaliczka podstawowa:</span>
                      <span className="text-sm font-medium text-gray-900">500.00 zł</span>
                    </div>
                    {reservation.selected_protection && reservation.selected_protection.length > 0 && (
                      <>
                        {reservation.selected_protection.map((protectionIdValue) => {
                          let generalProtectionId: number | null = null;
                          if (typeof protectionIdValue === 'string' && protectionIdValue.startsWith('protection-')) {
                            const numericId = parseInt(protectionIdValue.split('-')[1], 10);
                            if (!isNaN(numericId)) {
                              generalProtectionId = numericId;
                            }
                          } else {
                            const parsedId = typeof protectionIdValue === 'number' ? protectionIdValue : parseInt(String(protectionIdValue));
                            if (!isNaN(parsedId)) {
                              generalProtectionId = parsedId;
                            }
                          }
                          
                          if (!generalProtectionId) return null;
                          const protection = protections.get(generalProtectionId);
                          if (!protection) return null;
                          return (
                            <div key={String(protectionIdValue)} className="flex justify-between items-center">
                              <span className="text-sm text-gray-700">Ochrona: {protection.name}</span>
                              <span className="text-sm font-medium text-gray-900">+{protection.price.toFixed(2)} zł</span>
                            </div>
                          );
                        })}
                      </>
                    )}
                    <div className="pt-2 border-t border-gray-200 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-900">Razem zaliczka:</span>
                        <span className="text-sm font-bold text-[#03adf0]">{depositAmount.toFixed(2)} zł</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dodatki, Ochrony, Promocje - w jednym wierszu */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:col-span-2">
              {/* Dodatki */}
              {reservation.selected_addons && reservation.selected_addons.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h2 className="text-base font-semibold text-gray-900 mb-3">Dodatki</h2>
                  <div className="space-y-2">
                    {reservation.selected_addons.map((addonIdValue) => {
                      const addonId = typeof addonIdValue === 'number' ? addonIdValue : parseInt(String(addonIdValue));
                      const addon = addons.get(addonId);
                      const isPaid = payments.some(p => 
                        p.status === 'success' && 
                        p.order_id?.startsWith(`ADDON-${reservation.id}-`) &&
                        p.description?.includes(addon?.name || '')
                      );
                      return (
                        <div key={String(addonIdValue)} className="flex justify-between items-center border-b border-gray-200 pb-2">
                          <div className="flex items-center gap-2">
                            <Plus className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {addon ? addon.name : `Dodatek ID: ${addonIdValue}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {addon && (
                              <span className="text-sm text-gray-600">{formatCurrency(addon.price)}</span>
                            )}
                            {isPaid && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <Check className="w-3 h-3 mr-1" />
                                Opłacone
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Suma dodatków:</span>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(calculateTotalAddonsPrice())}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Ochrony */}
              {reservation.selected_protection && reservation.selected_protection.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h2 className="text-base font-semibold text-gray-900 mb-3">Ochrony</h2>
                  <div className="space-y-2">
                    {reservation.selected_protection.map((protectionIdValue) => {
                      let generalProtectionId: number | null = null;
                      if (typeof protectionIdValue === 'string' && protectionIdValue.startsWith('protection-')) {
                        const numericId = parseInt(protectionIdValue.split('-')[1], 10);
                        if (!isNaN(numericId)) {
                          generalProtectionId = numericId;
                        }
                      } else {
                        const parsedId = typeof protectionIdValue === 'number' ? protectionIdValue : parseInt(String(protectionIdValue));
                        if (!isNaN(parsedId)) {
                          generalProtectionId = parsedId;
                        }
                      }
                      
                      if (!generalProtectionId) {
                        return (
                          <div key={String(protectionIdValue)} className="flex justify-between items-center border-b border-gray-200 pb-2">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">Ochrona ID: {protectionIdValue}</span>
                            </div>
                          </div>
                        );
                      }
                      
                      const protection = protections.get(generalProtectionId);
                      return (
                        <div key={String(protectionIdValue)} className="flex justify-between items-center border-b border-gray-200 pb-2">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {protection ? protection.name : `Ochrona ID: ${protectionIdValue}`}
                            </span>
                          </div>
                          {protection && (
                            <span className="text-sm text-gray-600">{formatCurrency(protection.price)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Suma ochron:</span>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(calculateTotalProtectionsPrice())}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Promocja */}
              {reservation.selected_promotion && promotion && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h2 className="text-base font-semibold text-gray-900 mb-3">Promocja</h2>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{promotion.name}</p>
                      <p className="text-sm text-gray-600 mt-1">Cena: {formatCurrency(promotion.price)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wpłaty - w drugim wierszu */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Wpłaty</h2>
                <button
                  onClick={() => router.push(`/admin-panel/rezerwacja/${reservationNumber}/payments/wplata/nowa`)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-all duration-200 text-sm"
                  style={{ borderRadius: 0 }}
                >
                  <PlusIcon className="w-4 h-4" />
                  Dodaj
                </button>
              </div>
              
              {/* Search */}
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Szukaj wpłat..."
                    value={paymentSearchQuery}
                    onChange={(e) => setPaymentSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm"
                    style={{ borderRadius: 0 }}
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kwota</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Metoda</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-sm text-gray-500">
                          Brak wpłat
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((payment: any) => {
                        const isManual = payment.type === 'manual';
                        const paymentDate = isManual 
                          ? formatDate(payment.payment_date)
                          : formatDate(payment.payment_date || payment.paid_at || payment.created_at);
                        const paymentAmount = isManual ? payment.amount : (payment.paid_amount || payment.amount || 0);
                        const paymentMethod = isManual 
                          ? (payment.payment_method || 'Tradycyjna')
                          : (payment.channel_id === 64 ? 'BLIK' : payment.channel_id === 53 ? 'Karta' : 'Online');
                        const status = isManual ? 'success' : payment.status;

                        return (
                          <tr
                            key={`${payment.type}-${payment.id}`}
                            onClick={() => {
                              if (payment.type === 'manual') {
                                router.push(`/admin-panel/rezerwacja/${reservationNumber}/payments/wplata/${payment.id}`);
                              } else {
                                // Tpay payments are read-only, maybe show details in modal or just don't navigate
                                // For now, don't navigate for Tpay payments
                              }
                            }}
                            className={`hover:bg-gray-50 transition-colors ${payment.type === 'manual' ? 'cursor-pointer' : ''}`}
                          >
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{paymentDate}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(paymentAmount)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{paymentMethod}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {status === 'success' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <Check className="w-3 h-3 mr-1" />
                                  Zrealizowana
                                </span>
                              ) : status === 'pending' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Oczekująca
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Nieudana
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Faktury - w drugim wierszu */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Faktury</h2>
                <button
                  onClick={() => router.push(`/admin-panel/rezerwacja/${reservationNumber}/payments/faktura/nowa`)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-all duration-200 text-sm"
                  style={{ borderRadius: 0 }}
                >
                  <PlusIcon className="w-4 h-4" />
                  Dodaj
                </button>
              </div>
              
              {/* Search */}
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Szukaj faktur..."
                    value={invoiceSearchQuery}
                    onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm"
                    style={{ borderRadius: 0 }}
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Numer</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kwota</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-sm text-gray-500">
                          Brak faktur
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((invoice: any) => {
                        const isManual = invoice.type === 'manual';
                        return (
                          <tr
                            key={`${invoice.type}-${invoice.id}`}
                            onClick={() => router.push(`/admin-panel/rezerwacja/${reservationNumber}/payments/faktura/${invoice.id}`)}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.invoice_number}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{formatDate(invoice.issue_date)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.total_amount)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {invoice.is_canceled ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Anulowana
                                </span>
                              ) : invoice.is_paid ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <Check className="w-3 h-3 mr-1" />
                                  Opłacona
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Nieopłacona
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}
