'use client';

import { useState, useMemo, useEffect, Fragment } from 'react';
import { Search, ChevronUp, ChevronDown, Check, X, CreditCard, FileText, Building2, Shield, Utensils, Plus, AlertCircle, Download, XCircle, RotateCcw, RefreshCw } from 'lucide-react';
import PaymentConfirmationModal from './PaymentConfirmationModal';
import RefundConfirmationModal from './RefundConfirmationModal';
import { reservationService } from '@/lib/services/ReservationService';
import { paymentService, PaymentResponse } from '@/lib/services/PaymentService';

/**
 * Payment Item Status
 */
export type PaymentItemStatus = 'paid' | 'unpaid' | 'partially_paid' | 'canceled' | 'returned';

/**
 * Payment Item Interface
 * Represents a single payment item within a reservation
 */
interface PaymentItem {
  id: string;
  name: string;
  type: 'camp' | 'protection' | 'insurance' | 'diet' | 'addon' | 'other';
  amount: number;
  status: PaymentItemStatus; // Changed from paid boolean to status
  paidDate?: string;
  paymentMethod?: string;
  canceledDate?: string;
}

/**
 * Payment Details Interface
 * Complete payment information for a reservation
 */
interface PaymentDetails {
  reservationId: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  items: PaymentItem[];
  invoiceNumber?: string;
  invoiceLink?: string;
  invoicePaid: boolean; // Status faktury (opłacona/nieopłacona)
  orderDate: string; // Data zamówienia
}

/**
 * Reservation Payment Interface
 * Extended reservation with payment details
 */
interface ReservationPayment {
  id: number;
  reservationName: string;
  participantName: string;
  email: string;
  campName: string;
  tripName: string;
  status: string;
  createdAt: string;
  paymentDetails: PaymentDetails;
}

/**
 * Generate payment items for a reservation based on real reservation data and payments
 * Correctly distributes payments across items (camp, protection, diet, addons)
 */
const generatePaymentItems = (reservation: any, payments: PaymentResponse[]): PaymentItem[] => {
  const items: PaymentItem[] = [];
  let itemId = 1;
  
  // Find payments for this reservation (order_id format: "RES-{id}" or just "{id}")
  const reservationPayments = payments.filter(p => {
    const orderId = p.order_id || '';
    // Check if order_id matches reservation.id (with or without "RES-" prefix)
    return orderId === String(reservation.id) || 
           orderId === `RES-${reservation.id}` ||
           orderId.endsWith(`-${reservation.id}`);
  });
  // Include payments with status 'success' or 'pending' if they have amount set
  // For pending payments, we use 'amount' as the paid amount (assuming payment was made)
  // For success payments, we use 'paid_amount' if available, otherwise 'amount'
  const successfulPayments = reservationPayments.filter(p => {
    // Include success payments
    if (p.status === 'success') return true;
    // Include pending payments that have an amount (payment was created)
    if (p.status === 'pending' && p.amount && p.amount > 0) return true;
    return false;
  });
  const totalPaid = successfulPayments.reduce((sum, p) => {
    // Priority: paid_amount (from webhook) > amount (from payment creation)
    if (p.paid_amount !== null && p.paid_amount !== undefined && p.paid_amount > 0) {
      return sum + p.paid_amount;
    }
    // Otherwise, use amount (payment was created but webhook didn't update it yet)
    return sum + (p.amount || 0);
  }, 0);
  
  // Get the latest payment date and method for display
  const latestPayment = successfulPayments.length > 0 
    ? successfulPayments.sort((a, b) => 
        new Date(b.paid_at || b.created_at || 0).getTime() - 
        new Date(a.paid_at || a.created_at || 0).getTime()
      )[0]
    : null;
  const paymentDate = latestPayment 
    ? (latestPayment.paid_at || latestPayment.created_at)?.split('T')[0]
    : undefined;
  const paymentMethod = latestPayment
    ? (latestPayment.channel_id === 64 ? 'BLIK' : 
       latestPayment.channel_id === 53 ? 'Karta' : 'Online')
    : undefined;
  
  // Calculate additional items amounts
  const protectionAmount = reservation.selected_protection ? 200 : 0;
  const dietAmount = reservation.diet === 'vegetarian' ? 50 : 0;
  
  // Calculate addons total
  const addonPrices: Record<string, number> = {
    'Skuter wodny': 150,
    'Banan wodny': 0,
    'Quady': 150,
  };
  const addonsAmount = reservation.selected_addons && Array.isArray(reservation.selected_addons)
    ? reservation.selected_addons.reduce((sum: number, addonName: string) => {
        return sum + (addonPrices[addonName] || 0);
      }, 0)
    : 0;
  
  // Calculate transport amount (if transport was selected)
  // Transport is included in total_price, but we don't have direct access to transport price
  // So we calculate camp amount as: total_price - (protection + diet + addons)
  // Note: If transport was selected, its price is already in total_price, so campAmount will be lower
  // This is correct because campAmount represents the base camp price without transport
  const additionalItemsAmount = protectionAmount + dietAmount + addonsAmount;
  const totalPriceFromReservation = reservation.total_price || 0;
  
  // Camp amount = total_price - additional items (protection, diet, addons)
  // Transport is NOT subtracted here because it's a separate line item that should be shown separately
  // But since we don't have transport price in reservation data, we'll calculate it as remainder
  const campAmount = Math.max(0, totalPriceFromReservation - additionalItemsAmount);
  
  // Total amount should match reservation.total_price (this is the source of truth)
  const totalAmount = totalPriceFromReservation;
  
  // Distribute payments across items in order: camp -> protection -> diet -> addons
  let remainingPaid = totalPaid;
  
  // Camp base price (total_price from reservation)
  const campPaidAmount = Math.min(remainingPaid, campAmount);
  const campPaid = campPaidAmount >= campAmount;
  items.push({
    id: `item-${itemId++}`,
    name: `Obóz: ${reservation.camp_name || 'Nieznany obóz'}`,
    type: 'camp',
    amount: campAmount,
    status: campPaid ? 'paid' : (campPaidAmount > 0 ? 'partially_paid' : 'unpaid'),
    paidDate: campPaid && paymentDate ? paymentDate : undefined,
    paymentMethod: campPaid && paymentMethod ? paymentMethod : undefined,
  });
  remainingPaid -= campPaidAmount;

  // Protection (Tarcza/Oaza) - if selected_protection exists
  if (reservation.selected_protection) {
    const protectionPaidAmount = Math.min(remainingPaid, protectionAmount);
    const protectionPaid = protectionPaidAmount >= protectionAmount;
    items.push({
      id: `item-${itemId++}`,
      name: `Ochrona rezerwacji (${reservation.selected_protection === 'shield' ? 'Tarcza' : 'Oaza'})`,
      type: 'protection',
      amount: protectionAmount,
      status: protectionPaid ? 'paid' : (protectionPaidAmount > 0 ? 'partially_paid' : 'unpaid'),
      paidDate: protectionPaid && paymentDate ? paymentDate : undefined,
      paymentMethod: protectionPaid && paymentMethod ? paymentMethod : undefined,
    });
    remainingPaid -= protectionPaidAmount;
  }

  // Diet (if vegetarian)
  if (reservation.diet === 'vegetarian') {
    const dietPaidAmount = Math.min(remainingPaid, dietAmount);
    const dietPaid = dietPaidAmount >= dietAmount;
    items.push({
      id: `item-${itemId++}`,
      name: 'Dieta wegetariańska',
      type: 'diet',
      amount: dietAmount,
      status: dietPaid ? 'paid' : (dietPaidAmount > 0 ? 'partially_paid' : 'unpaid'),
      paidDate: dietPaid && paymentDate ? paymentDate : undefined,
      paymentMethod: dietPaid && paymentMethod ? paymentMethod : undefined,
    });
    remainingPaid -= dietPaidAmount;
  }

  // Addons (if selected_addons exists)
  if (reservation.selected_addons && Array.isArray(reservation.selected_addons) && reservation.selected_addons.length > 0) {
    reservation.selected_addons.forEach((addonName: string) => {
      const addonAmount = addonPrices[addonName] || 0;
      if (addonAmount > 0) {
        const addonPaidAmount = Math.min(remainingPaid, addonAmount);
        const addonPaid = addonPaidAmount >= addonAmount;
        items.push({
          id: `item-${itemId++}`,
          name: addonName,
          type: 'addon',
          amount: addonAmount,
          status: addonPaid ? 'paid' : (addonPaidAmount > 0 ? 'partially_paid' : 'unpaid'),
          paidDate: addonPaid && paymentDate ? paymentDate : undefined,
          paymentMethod: addonPaid && paymentMethod ? paymentMethod : undefined,
        });
        remainingPaid -= addonPaidAmount;
      }
    });
  }

  return items;
};

/**
 * Generate payment details for a reservation based on real data
 * Uses actual payment amounts from database (paid_amount from Payment records)
 */
const generatePaymentDetails = (reservation: any, payments: PaymentResponse[]): PaymentDetails => {
  const items = generatePaymentItems(reservation, payments);
  
  // Find payments for this reservation (order_id format: "RES-{id}" or just "{id}")
  const reservationPayments = payments.filter(p => {
    const orderId = p.order_id || '';
    // Check if order_id matches reservation.id (with or without "RES-" prefix)
    return orderId === String(reservation.id) || 
           orderId === `RES-${reservation.id}` ||
           orderId.endsWith(`-${reservation.id}`);
  });
  // Include payments with status 'success' or 'pending' if they have amount set
  // For pending payments, we use 'amount' as the paid amount (assuming payment was made)
  // For success payments, we use 'paid_amount' if available, otherwise 'amount'
  const successfulPayments = reservationPayments.filter(p => {
    // Include success payments
    if (p.status === 'success') return true;
    // Include pending payments that have an amount (payment was created)
    if (p.status === 'pending' && p.amount && p.amount > 0) return true;
    return false;
  });
  
  // Calculate actual paid amount from database
  // Priority: paid_amount (from webhook) > amount (from payment creation)
  const actualPaidAmount = successfulPayments.reduce((sum, p) => {
    // If paid_amount is set (from webhook), use it
    if (p.paid_amount !== null && p.paid_amount !== undefined && p.paid_amount > 0) {
      return sum + p.paid_amount;
    }
    // Otherwise, use amount (payment was created but webhook didn't update it yet)
    return sum + (p.amount || 0);
  }, 0);
  
  // Only count non-canceled and non-returned items in total amount
  const activeItems = items.filter(item => item.status !== 'canceled' && item.status !== 'returned');
  
  // Total amount should be from reservation.total_price (this is the source of truth)
  // Don't recalculate from items to avoid rounding errors or missing transport costs
  const totalAmount = reservation.total_price || activeItems.reduce((sum, item) => sum + item.amount, 0);
  
  // Use actual paid amount from database (this is the source of truth for payments)
  // Don't calculate from items status - use actual payment records from Payment table
  const paidAmount = Math.min(actualPaidAmount, totalAmount);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  
  // All active items must be paid (canceled and returned items don't count)
  const allActiveItemsPaid = activeItems.length > 0 && activeItems.every(item => item.status === 'paid');
  const hasCanceledItems = items.some(item => item.status === 'canceled');
  const hasSuccessfulPayment = successfulPayments.length > 0;
  
  // Determine if payment is full or partial
  const isFullPayment = paidAmount >= totalAmount && allActiveItemsPaid;
  const isPartialPayment = paidAmount > 0 && paidAmount < totalAmount;

  return {
    reservationId: reservation.id,
    totalAmount: totalAmount,
    paidAmount: paidAmount,
    remainingAmount: remainingAmount,
    items,
    invoiceNumber: `FV-${new Date(reservation.created_at).getFullYear()}-${String(reservation.id).padStart(4, '0')}`,
    invoiceLink: `/invoices/FV-${new Date(reservation.created_at).getFullYear()}-${String(reservation.id).padStart(4, '0')}.pdf`,
    invoicePaid: isFullPayment && !hasCanceledItems && hasSuccessfulPayment,
    orderDate: reservation.created_at.split('T')[0],
  };
};

/**
 * Map backend reservation and payments to frontend format
 */
const mapReservationToPaymentFormat = (
  reservation: any,
  payments: PaymentResponse[]
): ReservationPayment => {
  const participantName = `${reservation.participant_first_name || ''} ${reservation.participant_last_name || ''}`.trim();
  const firstParent = reservation.parents_data && reservation.parents_data.length > 0 
    ? reservation.parents_data[0] 
    : null;
  const email = firstParent?.email || reservation.invoice_email || '';
  const campName = reservation.camp_name || 'Nieznany obóz';
  const tripName = reservation.property_name || `${reservation.property_period || ''} - ${reservation.property_city || ''}`.trim() || 'Nieznany turnus';
  
  // Map status
  let status = reservation.status || 'pending';
  if (status === 'pending') status = 'aktywna';
  if (status === 'cancelled') status = 'anulowana';
  if (status === 'completed') status = 'zakończona';

  return {
    id: reservation.id,
    reservationName: `REZ-${new Date(reservation.created_at).getFullYear()}-${String(reservation.id).padStart(3, '0')}`,
    participantName: participantName || 'Brak danych',
    email: email,
    campName: campName,
    tripName: tripName,
    status: status,
    createdAt: reservation.created_at.split('T')[0],
    paymentDetails: generatePaymentDetails(reservation, payments),
  };
};

/**
 * Payments Management Component
 * Displays reservations with detailed payment information
 */
export default function PaymentsManagement() {
  const [reservations, setReservations] = useState<ReservationPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // State for payment confirmation modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedReservationForPayment, setSelectedReservationForPayment] = useState<ReservationPayment | null>(null);

  // State for refund confirmation modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundFinalModalOpen, setRefundFinalModalOpen] = useState(false);
  const [selectedItemForRefund, setSelectedItemForRefund] = useState<{ reservationId: number; item: PaymentItem } | null>(null);

  // State for manual sync
  const [isSyncing, setIsSyncing] = useState(false);

  // Load reservations and payments from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Fetching reservations and payments...');
        
        // Fetch reservations first
        const reservationsData = await reservationService.listReservations(0, 1000).catch(err => {
          console.error('Error fetching reservations:', err);
          throw new Error(`Błąd pobierania rezerwacji: ${err.message}`);
        });
        
        // Try to fetch payments, but don't fail if it doesn't work
        let paymentsData: PaymentResponse[] = [];
        try {
          paymentsData = await paymentService.listPayments(0, 1000);
        } catch (err) {
          console.warn('Warning: Could not fetch payments, continuing with empty array:', err);
          // Continue with empty payments array - reservations will still work
        }
        
        // Automatyczna synchronizacja statusu płatności ze statusem 'pending'
        // Webhook nie działa w środowisku lokalnym (localhost), więc synchronizujemy ręcznie
        console.log('🔄 Synchronizacja statusu płatności z API Tpay (sandbox)...');
        const pendingPayments = paymentsData.filter(p => p.status === 'pending' && p.transaction_id);
        const syncPromises = pendingPayments.map(async (payment) => {
          try {
            console.log(`Synchronizacja płatności ${payment.transaction_id}...`);
            const syncedPayment = await paymentService.syncPaymentStatus(payment.transaction_id);
            // Zaktualizuj płatność w tablicy
            const index = paymentsData.findIndex(p => p.id === payment.id);
            if (index !== -1) {
              paymentsData[index] = syncedPayment;
            }
            console.log(`✅ Zsynchronizowano płatność ${payment.transaction_id} - status: ${syncedPayment.status}`);
          } catch (err) {
            console.warn(`⚠️ Nie można zsynchronizować płatności ${payment.transaction_id}:`, err);
            // Nie przerywaj procesu - kontynuuj z pozostałymi płatnościami
          }
        });
        
        // Wykonaj synchronizację równolegle (ale nie blokuj UI)
        await Promise.allSettled(syncPromises);
        console.log(`✅ Zsynchronizowano ${pendingPayments.length} płatności`);
        
        console.log(`Fetched ${reservationsData.length} reservations and ${paymentsData.length} payments`);
        
        // Map reservations to payment format
        const mappedReservations = reservationsData.map(reservation => 
          mapReservationToPaymentFormat(reservation, paymentsData)
        );
        
        setReservations(mappedReservations);
      } catch (err) {
        console.error('Error fetching payments data:', err);
        setError(err instanceof Error ? err.message : 'Błąd podczas ładowania danych płatności');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Filter and sort reservations
  const filteredReservations = useMemo(() => {
    let filtered = [...reservations];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        res =>
          res.reservationName.toLowerCase().includes(query) ||
          res.participantName.toLowerCase().includes(query) ||
          res.email.toLowerCase().includes(query) ||
          res.campName.toLowerCase().includes(query)
      );
    }

    // Sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortColumn) {
          case 'reservationName':
            aValue = a.reservationName;
            bValue = b.reservationName;
            break;
          case 'participantName':
            aValue = a.participantName;
            bValue = b.participantName;
            break;
          case 'totalAmount':
            aValue = a.paymentDetails.totalAmount;
            bValue = b.paymentDetails.totalAmount;
            break;
          case 'paidAmount':
            aValue = a.paymentDetails.paidAmount;
            bValue = b.paymentDetails.paidAmount;
            break;
          case 'remainingAmount':
            aValue = a.paymentDetails.remainingAmount;
            bValue = b.paymentDetails.remainingAmount;
            break;
          default:
            return 0;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else {
          return sortDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
        }
      });
    }

    return filtered;
  }, [searchQuery, sortColumn, sortDirection, reservations]);

  // Pagination
  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReservations = filteredReservations.slice(startIndex, endIndex);

  // Handle column sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Toggle row expansion
  const toggleRowExpansion = (reservationId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reservationId)) {
        newSet.delete(reservationId);
      } else {
        newSet.add(reservationId);
      }
      return newSet;
    });
  };

  // Toggle payment item status (paid/unpaid, cannot toggle canceled)
  const togglePaymentItem = (reservationId: number, itemId: string) => {
    setReservations(prev => {
      return prev.map(res => {
        if (res.id === reservationId) {
          const updatedItems = res.paymentDetails.items.map(item => {
            if (item.id === itemId) {
              // Cannot toggle canceled items
              if (item.status === 'canceled') {
                return item;
              }
              // Toggle between paid and unpaid
              const newStatus: PaymentItemStatus = item.status === 'paid' ? 'unpaid' : 'paid';
              return {
                ...item,
                status: newStatus,
                paidDate: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined,
                paymentMethod: newStatus === 'paid' ? 'Przelew' : undefined,
              };
            }
            return item;
          });

          // Recalculate amounts (only active items count)
          const activeItems = updatedItems.filter(item => item.status !== 'canceled');
          const totalAmount = activeItems.reduce((sum, item) => sum + item.amount, 0);
          const paidAmount = activeItems.filter(item => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0);
          const remainingAmount = totalAmount - paidAmount;

          return {
            ...res,
            paymentDetails: {
              ...res.paymentDetails,
              items: updatedItems,
              totalAmount,
              paidAmount,
              remainingAmount,
            },
          };
        }
        return res;
      });
    });
  };

  // Cancel payment item
  const cancelPaymentItem = (reservationId: number, itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReservations(prev => {
      return prev.map(res => {
        if (res.id === reservationId) {
          const updatedItems = res.paymentDetails.items.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                status: 'canceled' as PaymentItemStatus,
                canceledDate: new Date().toISOString().split('T')[0],
                paidDate: undefined,
                paymentMethod: undefined,
              };
            }
            return item;
          });

          // Recalculate amounts (only active items count)
          const activeItems = updatedItems.filter(item => item.status !== 'canceled');
          const totalAmount = activeItems.reduce((sum, item) => sum + item.amount, 0);
          const paidAmount = activeItems.filter(item => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0);
          const remainingAmount = totalAmount - paidAmount;

          return {
            ...res,
            paymentDetails: {
              ...res.paymentDetails,
              items: updatedItems,
              totalAmount,
              paidAmount,
              remainingAmount,
            },
          };
        }
        return res;
      });
    });
  };

  // Toggle all payments (mark all active items as paid/unpaid, skip canceled and returned)
  const toggleAllPayments = (reservationId: number) => {
    setReservations(prev => {
      return prev.map(res => {
        if (res.id === reservationId) {
          const activeItems = res.paymentDetails.items.filter(item => item.status !== 'canceled' && item.status !== 'returned');
          const allPaid = activeItems.length > 0 && activeItems.every(item => item.status === 'paid');
          const updatedItems = res.paymentDetails.items.map(item => {
            // Don't change canceled or returned items
            if (item.status === 'canceled' || item.status === 'returned') {
              return item;
            }
            const newStatus: PaymentItemStatus = !allPaid ? 'paid' : 'unpaid';
            return {
              ...item,
              status: newStatus,
              paidDate: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined,
              paymentMethod: newStatus === 'paid' ? 'Przelew' : undefined,
            };
          });

          // Recalculate amounts
          const totalAmount = activeItems.reduce((sum, item) => sum + item.amount, 0);
          const paidAmount = !allPaid ? totalAmount : 0;
          const remainingAmount = !allPaid ? 0 : totalAmount;

          return {
            ...res,
            paymentDetails: {
              ...res.paymentDetails,
              items: updatedItems,
              totalAmount,
              paidAmount,
              remainingAmount,
            },
          };
        }
        return res;
      });
    });
  };

  // Handle mark invoice as paid
  const handleMarkInvoiceAsPaid = (reservation: ReservationPayment, e: React.MouseEvent) => {
    e.stopPropagation();
    const activeItems = reservation.paymentDetails.items.filter(item => item.status !== 'canceled' && item.status !== 'returned');
    const allPaid = activeItems.length > 0 && activeItems.every(item => item.status === 'paid');
    const hasCanceledItems = reservation.paymentDetails.items.some(item => item.status === 'canceled');
    
    if (allPaid && reservation.paymentDetails.remainingAmount === 0 && !hasCanceledItems) {
      setReservations(prev => {
        return prev.map(res => {
          if (res.id === reservation.id) {
            return {
              ...res,
              paymentDetails: {
                ...res.paymentDetails,
                invoicePaid: true,
              },
            };
          }
          return res;
        });
      });

      console.log('=== OZNACZENIE FAKTURY JAKO OPŁACONEJ ===');
      console.log('Rezerwacja:', reservation.reservationName);
      console.log('Uczestnik:', reservation.participantName);
      console.log('Numer faktury:', reservation.paymentDetails.invoiceNumber);
      console.log('Link do faktury:', reservation.paymentDetails.invoiceLink);
      console.log('Kwota całkowita:', reservation.paymentDetails.totalAmount, 'PLN');
      console.log('Status: Faktura oznaczona jako opłacona');
      console.log('=== KONIEC ===');
      console.log('');
      console.log('TODO: Wywołanie API do oznaczenia faktury jako opłaconej');
      console.log(`PUT /api/payments/${reservation.id}/invoice/paid`);
      console.log(`Body: { invoiceNumber: "${reservation.paymentDetails.invoiceNumber}", invoicePaid: true }`);
    }
  };

  // Handle manual payment confirmation
  const handleManualPaymentConfirmation = (reservation: ReservationPayment, e: React.MouseEvent) => {
    e.stopPropagation();
    // Check if there are canceled items - cannot confirm payment if there are canceled items
    const hasCanceledItems = reservation.paymentDetails.items.some(item => item.status === 'canceled');
    if (hasCanceledItems) {
      alert('Nie można potwierdzić płatności, ponieważ niektóre elementy zostały anulowane.');
      return;
    }
    setSelectedReservationForPayment(reservation);
    setPaymentModalOpen(true);
  };

  // Handle payment confirmation
  const handlePaymentConfirm = () => {
    if (!selectedReservationForPayment) return;

    setReservations(prev => {
      return prev.map(res => {
        if (res.id === selectedReservationForPayment.id) {
          return {
            ...res,
            paymentDetails: {
              ...res.paymentDetails,
              invoicePaid: true,
            },
          };
        }
        return res;
      });
    });

    console.log('=== RĘCZNE POTWIERDZENIE PŁATNOŚCI ===');
    console.log('Rezerwacja:', selectedReservationForPayment.reservationName);
    console.log('Uczestnik:', selectedReservationForPayment.participantName);
    console.log('Numer faktury:', selectedReservationForPayment.paymentDetails.invoiceNumber);
    console.log('Link do faktury:', selectedReservationForPayment.paymentDetails.invoiceLink);
    console.log('Kwota całkowita:', selectedReservationForPayment.paymentDetails.totalAmount, 'PLN');
    console.log('Status: Płatność potwierdzona ręcznie');
    console.log('=== KONIEC ===');
    console.log('');
    console.log('TODO: Wywołanie API do ręcznego potwierdzenia płatności');
    console.log(`POST /api/payments/${selectedReservationForPayment.id}/confirm`);
    console.log(`Body: { invoiceNumber: "${selectedReservationForPayment.paymentDetails.invoiceNumber}", amount: ${selectedReservationForPayment.paymentDetails.totalAmount}, manual: true }`);

    setPaymentModalOpen(false);
    setSelectedReservationForPayment(null);
  };

  // Handle manual sync of all payments
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      console.log('🔄 Ręczna synchronizacja wszystkich płatności...');
      
      // Fetch payments again
      let paymentsData: PaymentResponse[] = [];
      try {
        paymentsData = await paymentService.listPayments(0, 1000);
      } catch (err) {
        console.error('Błąd pobierania płatności:', err);
        alert('Nie można pobrać płatności. Sprawdź czy backend działa.');
        setIsSyncing(false);
        return;
      }
      
      // Find all pending payments
      const pendingPayments = paymentsData.filter(p => p.status === 'pending' && p.transaction_id);
      console.log(`Znaleziono ${pendingPayments.length} płatności do synchronizacji`);
      
      if (pendingPayments.length === 0) {
        alert('Brak płatności do synchronizacji. Wszystkie płatności są już zsynchronizowane.');
        setIsSyncing(false);
        return;
      }
      
      // Sync all pending payments
      const syncPromises = pendingPayments.map(async (payment) => {
        try {
          console.log(`Synchronizacja płatności ${payment.transaction_id}...`);
          const syncedPayment = await paymentService.syncPaymentStatus(payment.transaction_id);
          console.log(`✅ Zsynchronizowano płatność ${payment.transaction_id} - status: ${syncedPayment.status}`);
          return syncedPayment;
        } catch (err) {
          console.warn(`⚠️ Nie można zsynchronizować płatności ${payment.transaction_id}:`, err);
          return null;
        }
      });
      
      const syncedPayments = await Promise.allSettled(syncPromises);
      const successful = syncedPayments.filter(p => p.status === 'fulfilled' && p.value !== null).length;
      console.log(`✅ Zsynchronizowano ${successful} z ${pendingPayments.length} płatności`);
      
      // Refresh data
      const reservationsData = await reservationService.listReservations(0, 1000);
      const updatedPayments = await paymentService.listPayments(0, 1000);
      const mappedReservations = reservationsData.map(reservation => 
        mapReservationToPaymentFormat(reservation, updatedPayments)
      );
      setReservations(mappedReservations);
      
      alert(`Zsynchronizowano ${successful} z ${pendingPayments.length} płatności.`);
    } catch (err) {
      console.error('Błąd synchronizacji:', err);
      alert('Błąd podczas synchronizacji płatności.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle view invoice
  const handleViewInvoice = (reservation: ReservationPayment, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('=== WYŚWIETLENIE FAKTURY ===');
    console.log('Rezerwacja:', reservation.reservationName);
    console.log('Numer faktury:', reservation.paymentDetails.invoiceNumber);
    console.log('Link do faktury:', reservation.paymentDetails.invoiceLink);
    console.log('=== KONIEC ===');
    console.log('');
    console.log('TODO: Otwarcie faktury w nowym oknie');
    console.log(`window.open("${reservation.paymentDetails.invoiceLink}", "_blank")`);
    // window.open(reservation.paymentDetails.invoiceLink, '_blank');
  };

  // Handle refund request (first modal)
  const handleRefundRequest = (reservationId: number, item: PaymentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    // Only allow refund for paid items
    if (item.status === 'paid') {
      setSelectedItemForRefund({ reservationId, item });
      setRefundModalOpen(true);
    }
  };

  // Handle refund confirmation (first modal -> open second modal)
  const handleRefundConfirm = () => {
    if (!selectedItemForRefund) return;
    setRefundModalOpen(false);
    setRefundFinalModalOpen(true); // Open final confirmation modal immediately
  };

  // Handle final refund confirmation (second modal -> mark as "returned")
  const handleRefundFinalConfirm = () => {
    if (!selectedItemForRefund) return;

    setReservations(prev => {
      return prev.map(res => {
        if (res.id === selectedItemForRefund.reservationId) {
          const updatedItems = res.paymentDetails.items.map(item => {
            if (item.id === selectedItemForRefund.item.id) {
              return {
                ...item,
                status: 'returned' as PaymentItemStatus,
              };
            }
            return item;
          });

          // Recalculate amounts (returned items don't count)
          const activeItems = updatedItems.filter(item => item.status !== 'canceled' && item.status !== 'returned');
          const totalAmount = activeItems.reduce((sum, item) => sum + item.amount, 0);
          const paidAmount = activeItems.filter(item => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0);
          const remainingAmount = totalAmount - paidAmount;

          return {
            ...res,
            paymentDetails: {
              ...res.paymentDetails,
              items: updatedItems,
              totalAmount,
              paidAmount,
              remainingAmount,
            },
          };
        }
        return res;
      });
    });

    console.log('=== ZWROT ŚRODKÓW ===');
    console.log('Element:', selectedItemForRefund.item.name);
    console.log('Kwota:', selectedItemForRefund.item.amount, 'PLN');
    console.log('Status: Środki zwrócone');
    console.log('=== KONIEC ===');
    console.log('');
    console.log('TODO: Wywołanie API do zwrotu środków');
    console.log(`POST /api/payments/${selectedItemForRefund.reservationId}/refund`);
    console.log(`Body: { itemId: "${selectedItemForRefund.item.id}", amount: ${selectedItemForRefund.item.amount} }`);

    setRefundFinalModalOpen(false);
    setSelectedItemForRefund(null);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} PLN`;
  };

  const getItemTypeIcon = (type: PaymentItem['type']) => {
    switch (type) {
      case 'camp':
        return <Building2 className="w-4 h-4" />;
      case 'protection':
        return <Shield className="w-4 h-4" />;
      case 'insurance':
        return <Shield className="w-4 h-4" />;
      case 'diet':
        return <Utensils className="w-4 h-4" />;
      case 'addon':
        return <Plus className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <ChevronUp className="w-4 h-4 text-gray-400 opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-[#03adf0]" />
    ) : (
      <ChevronDown className="w-4 h-4 text-[#03adf0]" />
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-2" style={{ marginTop: 0, paddingTop: 0 }}>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Płatności</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
            <p className="text-gray-600">Ładowanie płatności...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-2" style={{ marginTop: 0, paddingTop: 0 }}>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Płatności</h1>
        </div>
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-red-700 font-semibold">Błąd</p>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between" style={{ marginTop: 0, paddingTop: 0, marginRight: '16px' }}>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Płatności</h1>
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-[#03adf0] text-white rounded-lg hover:bg-[#0288c7] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Synchronizacja...' : 'Zweryfikuj płatności'}
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj po nazwie rezerwacji, uczestniku, email, obozie..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
            style={{ borderRadius: 0 }}
          />
        </div>
      </div>

      {/* Results count and items per page */}
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs text-gray-600">
          Znaleziono: {filteredReservations.length} {filteredReservations.length === 1 ? 'rezerwacja' : 'rezerwacji'}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Na stronie:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 text-xs border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] transition-all duration-200"
            style={{ borderRadius: 0, cursor: 'pointer' }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('reservationName')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Nazwa rezerwacji
                    <SortIcon column="reservationName" />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('participantName')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Uczestnik
                    <SortIcon column="participantName" />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('totalAmount')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Kwota całkowita
                    <SortIcon column="totalAmount" />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('paidAmount')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Opłacone
                    <SortIcon column="paidAmount" />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('remainingAmount')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Pozostało
                    <SortIcon column="remainingAmount" />
                  </div>
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedReservations.length > 0 ? (
                paginatedReservations.map((reservation) => {
                  const isExpanded = expandedRows.has(reservation.id);
                  const activeItemsForReservation = reservation.paymentDetails.items.filter(item => item.status !== 'canceled' && item.status !== 'returned');
                  const allPaid = activeItemsForReservation.length > 0 && activeItemsForReservation.every(item => item.status === 'paid');
                  const hasPartiallyPaid = activeItemsForReservation.some(item => item.status === 'partially_paid');
                  const hasRemaining = reservation.paymentDetails.remainingAmount > 0;
                  const hasCanceledItems = reservation.paymentDetails.items.some(item => item.status === 'canceled');
                  const hasReturnedItems = reservation.paymentDetails.items.some(item => item.status === 'returned');
                  const isFullPayment = reservation.paymentDetails.paidAmount >= reservation.paymentDetails.totalAmount && allPaid;
                  const isPartialPayment = reservation.paymentDetails.paidAmount > 0 && reservation.paymentDetails.paidAmount < reservation.paymentDetails.totalAmount;

                  return (
                    <Fragment key={reservation.id}>
                      <tr
                        className={`hover:bg-gray-50 transition-all duration-200 ${isExpanded ? 'bg-blue-50' : ''}`}
                        onClick={() => toggleRowExpansion(reservation.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {reservation.reservationName}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {reservation.participantName}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(reservation.paymentDetails.totalAmount)}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className="text-sm text-green-600 font-medium">
                            {formatCurrency(reservation.paymentDetails.paidAmount)}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`text-sm font-medium ${hasRemaining ? 'text-red-600' : 'text-gray-500'}`}>
                            {formatCurrency(reservation.paymentDetails.remainingAmount)}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {hasReturnedItems ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Zwrócone
                            </span>
                          ) : allPaid && isFullPayment ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Opłacone w całości
                            </span>
                          ) : isPartialPayment || hasPartiallyPaid ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Częściowo opłacone
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Nieopłacone
                            </span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-blue-50 animate-slideDown">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="space-y-4">
                              {/* Payment Summary */}
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Kwota całkowita</p>
                                    <p className="text-lg font-bold text-gray-900">
                                      {formatCurrency(reservation.paymentDetails.totalAmount)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Opłacone</p>
                                    <p className="text-lg font-bold text-green-600">
                                      {formatCurrency(reservation.paymentDetails.paidAmount)}
                                    </p>
                                    {isFullPayment && (
                                      <p className="text-xs text-green-600 mt-1">✓ Płatność w całości</p>
                                    )}
                                    {isPartialPayment && (
                                      <p className="text-xs text-blue-600 mt-1">⚠ Płatność częściowa</p>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Pozostało</p>
                                    <p className={`text-lg font-bold ${hasRemaining ? 'text-red-600' : 'text-gray-500'}`}>
                                      {formatCurrency(reservation.paymentDetails.remainingAmount)}
                                    </p>
                                  </div>
                                </div>

                                {/* All Paid Checkbox */}
                                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={allPaid}
                                      onChange={() => toggleAllPayments(reservation.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-4 h-4 text-[#03adf0] border-gray-300 focus:ring-[#03adf0]"
                                      style={{ borderRadius: 0, cursor: 'pointer' }}
                                    />
                                    <span className="text-sm font-medium text-gray-900">
                                      Wszystkie płatności opłacone
                                    </span>
                                  </label>
                                </div>

                                {/* Payment Items */}
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Elementy płatności</h4>
                                  {reservation.paymentDetails.items.map((item) => {
                                    const isCanceled = item.status === 'canceled';
                                    const isPaid = item.status === 'paid';
                                    const isPartiallyPaid = item.status === 'partially_paid';
                                    const isUnpaid = item.status === 'unpaid';
                                    const isReturned = item.status === 'returned';
                                    
                                    return (
                                      <div
                                        key={item.id}
                                        className={`flex items-center justify-between p-3 rounded border ${
                                          isCanceled 
                                            ? 'bg-red-50 border-red-200' 
                                            : isReturned
                                            ? 'bg-purple-50 border-purple-200'
                                            : isPaid
                                            ? 'bg-green-50 border-green-200'
                                            : isPartiallyPaid
                                            ? 'bg-blue-50 border-blue-200'
                                            : 'bg-yellow-50 border-yellow-200'
                                        }`}
                                      >
                                        <div className="flex items-center gap-3 flex-1">
                                          <div className="flex items-center gap-2 text-gray-600">
                                            {getItemTypeIcon(item.type)}
                                          </div>
                                          <div className="flex-1">
                                            <p className={`text-sm font-medium ${
                                              isCanceled ? 'text-red-700 line-through' : 
                                              isReturned ? 'text-purple-700' : 
                                              'text-gray-900'
                                            }`}>
                                              {item.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              {isCanceled && item.canceledDate
                                                ? `Anulowane: ${formatDate(item.canceledDate)}`
                                                : isReturned && item.paidDate
                                                ? `Zwrócone: ${formatDate(item.paidDate)}${item.paymentMethod ? ` (${item.paymentMethod})` : ''}`
                                                : (isPaid || isPartiallyPaid) && item.paidDate
                                                ? `Data płatności: ${formatDate(item.paidDate)}${item.paymentMethod ? ` (${item.paymentMethod})` : ''}`
                                                : `Data zamówienia: ${formatDate(reservation.paymentDetails.orderDate)}`}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <span className={`text-sm font-medium min-w-[80px] text-right ${
                                            isCanceled ? 'text-red-600 line-through' : 
                                            isReturned ? 'text-purple-600' : 
                                            'text-gray-900'
                                          }`}>
                                            {formatCurrency(item.amount)}
                                          </span>
                                          <div className="flex items-center gap-2">
                                            {/* Status Badge */}
                                            {isCanceled ? (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                <XCircle className="w-3 h-3 mr-1" />
                                                Anulowane
                                              </span>
                                            ) : isReturned ? (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                <RotateCcw className="w-3 h-3 mr-1" />
                                                Zwrócone
                                              </span>
                                            ) : isPaid ? (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                <Check className="w-3 h-3 mr-1" />
                                                Opłacone
                                              </span>
                                            ) : isPartiallyPaid ? (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                <Check className="w-3 h-3 mr-1" />
                                                Częściowo opłacone
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                Nieopłacone
                                              </span>
                                            )}
                                            
                                            {/* Refund Button (only for paid items) */}
                                            {isPaid && (
                                              <button
                                                onClick={(e) => handleRefundRequest(reservation.id, item, e)}
                                                className="p-1 text-purple-600 hover:bg-purple-50 transition-all duration-200"
                                                title="Zwróć środki"
                                                style={{ borderRadius: 0, cursor: 'pointer' }}
                                              >
                                                <RotateCcw className="w-4 h-4" />
                                              </button>
                                            )}
                                            
                                            {/* Cancel Button (only for unpaid items, not for paid or returned) */}
                                            {isUnpaid && (
                                              <button
                                                onClick={(e) => cancelPaymentItem(reservation.id, item.id, e)}
                                                className="p-1 text-red-600 hover:bg-red-50 transition-all duration-200"
                                                title="Anuluj element"
                                                style={{ borderRadius: 0, cursor: 'pointer' }}
                                              >
                                                <XCircle className="w-4 h-4" />
                                              </button>
                                            )}
                                            
                                            {/* Checkbox (only for unpaid items) */}
                                            {isUnpaid && (
                                              <label className="flex items-center cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={false}
                                                  onChange={() => togglePaymentItem(reservation.id, item.id)}
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="w-4 h-4 text-[#03adf0] border-gray-300 focus:ring-[#03adf0]"
                                                  style={{ borderRadius: 0, cursor: 'pointer' }}
                                                />
                                              </label>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Invoice Status and Actions */}
                                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                                  {/* Invoice Status */}
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Status faktury</p>
                                      {reservation.paymentDetails.invoicePaid ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          Opłacona
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                          Nieopłacona
                                        </span>
                                      )}
                                    </div>
                                    {reservation.paymentDetails.invoiceNumber && (
                                      <div className="text-right">
                                        <p className="text-xs text-gray-500 mb-1">Numer faktury</p>
                                        <p className="text-sm font-medium text-gray-900">
                                          {reservation.paymentDetails.invoiceNumber}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {/* View Invoice Button */}
                                    {reservation.paymentDetails.invoiceLink && (
                                      <button
                                        onClick={(e) => handleViewInvoice(reservation, e)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-[#03adf0] text-[#03adf0] hover:bg-[#03adf0] hover:text-white transition-all duration-200 text-xs font-medium"
                                        style={{ borderRadius: 0, cursor: 'pointer' }}
                                      >
                                        <Download className="w-3 h-3" />
                                        Wyświetl fakturę
                                      </button>
                                    )}

                                    {/* Mark Invoice as Paid Button (only when all active payments are checked and no canceled items) */}
                                    {allPaid && reservation.paymentDetails.remainingAmount === 0 && !reservation.paymentDetails.invoicePaid && !hasCanceledItems && (
                                      <button
                                        onClick={(e) => handleMarkInvoiceAsPaid(reservation, e)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 transition-all duration-200 text-xs font-medium"
                                        style={{ borderRadius: 0, cursor: 'pointer' }}
                                      >
                                        <Check className="w-3 h-3" />
                                        Oznacz fakturę jako opłaconą
                                      </button>
                                    )}

                                    {/* Manual Payment Confirmation Button (only when invoice is not paid and no canceled items) */}
                                    {!reservation.paymentDetails.invoicePaid && !hasCanceledItems && (
                                      <button
                                        onClick={(e) => handleManualPaymentConfirmation(reservation, e)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 text-xs font-medium"
                                        style={{ borderRadius: 0, cursor: 'pointer' }}
                                      >
                                        <CreditCard className="w-3 h-3" />
                                        Ręczne potwierdzenie płatności
                                      </button>
                                    )}
                                    
                                    {/* Warning if there are canceled items */}
                                    {hasCanceledItems && (
                                      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs">
                                        <AlertCircle className="w-3 h-3" />
                                        Nie można potwierdzić płatności - niektóre elementy zostały anulowane
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    Brak rezerwacji spełniających kryteria wyszukiwania
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-xs text-gray-600">
              Strona {currentPage} z {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
                style={{ borderRadius: 0, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                Poprzednia
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                        currentPage === page
                          ? 'bg-[#03adf0] text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                      style={{ borderRadius: 0, cursor: 'pointer' }}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-2 text-gray-500">...</span>;
                }
                return null;
              })}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
                style={{ borderRadius: 0, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Następna
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isOpen={paymentModalOpen}
        reservationName={selectedReservationForPayment?.reservationName || ''}
        participantName={selectedReservationForPayment?.participantName || ''}
        totalAmount={selectedReservationForPayment?.paymentDetails.totalAmount || 0}
        onConfirm={handlePaymentConfirm}
        onCancel={() => {
          setPaymentModalOpen(false);
          setSelectedReservationForPayment(null);
        }}
      />

      {/* Refund Confirmation Modal (First - Request Refund) */}
      <RefundConfirmationModal
        isOpen={refundModalOpen}
        itemName={selectedItemForRefund?.item.name || ''}
        amount={selectedItemForRefund?.item.amount || 0}
        isFinalConfirmation={false}
        onConfirm={handleRefundConfirm}
        onCancel={() => {
          setRefundModalOpen(false);
          setSelectedItemForRefund(null);
        }}
      />

      {/* Refund Confirmation Modal (Second - Confirm Refund) */}
      <RefundConfirmationModal
        isOpen={refundFinalModalOpen}
        itemName={selectedItemForRefund?.item.name || ''}
        amount={selectedItemForRefund?.item.amount || 0}
        isFinalConfirmation={true}
        onConfirm={handleRefundFinalConfirm}
        onCancel={() => {
          setRefundFinalModalOpen(false);
          setSelectedItemForRefund(null);
        }}
      />

      {/* Animations CSS */}
      <style jsx global>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            max-height: 1000px;
            transform: translateY(0);
          }
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

