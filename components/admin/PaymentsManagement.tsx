'use client';

import { Search, ChevronUp, ChevronDown, Check, CreditCard, FileText, Building2, Shield, Utensils, Plus, AlertCircle, Download, FileSpreadsheet, XCircle, RotateCcw, RefreshCw, Trash2, Columns, GripVertical, Filter, X as XIcon, Info, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useMemo, useEffect, Fragment, useCallback, useRef } from 'react';

import { useToast } from '@/components/ToastContainer';
import { invoiceService, InvoiceResponse } from '@/lib/services/InvoiceService';
import { manualPaymentService, ManualPaymentResponse } from '@/lib/services/ManualPaymentService';
import { paymentService, PaymentResponse } from '@/lib/services/PaymentService';
import { authenticatedApiCall } from '@/utils/api-auth';
import { getApiBaseUrlRuntime } from '@/utils/api-config';

/**
 * Search filters interface for URL sync
 */
interface SearchFilters {
  search: string;
  paymentStatus: string;
  campName: string;
  dateFrom: string;
  dateTo: string;
}

/**
 * Server-side pagination interfaces
 */
interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/**
 * Filter options from backend - all unique values for each filterable column
 */
interface FilterOptions {
  campName: string[];
  location: string[];
  propertyTag: string[];
  participantCity: string[];
  participantAge: string[];
  transportDeparture: string[];
  transportReturn: string[];
  promotionName: string[];
  protectionNames: string[];
  status: string[];
  qualificationCardStatus: string[];
  contractStatus: string[];
  hasOaza: string[];
  hasTarcza: string[];
  hasQuad: string[];
  hasSkuter: string[];
  hasEnergylandia: string[];
  hasTermy: string[];
  // Amount filters from backend (all unique values from entire database)
  totalAmount: string[];
  paidAmount: string[];
  remainingAmount: string[];
}

interface BackendPaymentData {
  id: number;
  transaction_id: string | null;
  amount: number;
  paid_amount: number | null;
  status: string;
  channel_id: number | null;
  order_id: string | null;
  created_at: string | null;
  paid_at: string | null;
}

interface BackendManualPaymentData {
  id: number;
  reservation_id: number;
  amount: number;
  payment_date: string | null;
  payment_method: string | null;
  description: string | null;
  created_at: string | null;
}

interface BackendReservationWithPayments {
  id: number;
  camp_id: number | null;
  property_id: number | null;
  status: string;
  payment_status: string;
  total_price: number;
  deposit_amount: number | null;
  created_at: string | null;
  camp_name: string | null;
  property_name: string | null;
  property_city: string | null;
  property_period: string | null;
  property_tag: string | null;
  property_start_date: string | null;
  property_end_date: string | null;
  participant_first_name: string | null;
  participant_last_name: string | null;
  participant_age: string | null;
  participant_city: string | null;
  parents_data: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  }> | null;
  invoice_email: string | null;
  selected_protection: string | (string | number)[] | null;
  selected_addons: string | (string | number)[] | null;
  selected_promotion: string | null;
  promotion_name: string | null;
  departure_type: string | null;
  departure_city: string | null;
  return_type: string | null;
  return_city: string | null;
  contract_status: string | null;
  qualification_card_status: string | null;
  payment_plan: string | null;
  // Attached from backend
  payments: BackendPaymentData[];
  manual_payments: BackendManualPaymentData[];
}

interface PaginatedPaymentsResponse {
  items: BackendReservationWithPayments[];
  pagination: PaginationInfo;
  filter_options?: FilterOptions;
}

import PaymentConfirmationModal from './PaymentConfirmationModal';
import RefundConfirmationModal from './RefundConfirmationModal';
import UniversalModal from './UniversalModal';


/**
 * Payment Item Status
 */
export type PaymentItemStatus = 'paid' | 'unpaid' | 'partially_paid' | 'canceled' | 'returned';

/**
 * Payment Item Interface
 * Represents a single payment item within a reservation
 */
interface PaymentInstallment {
  number: number; // 1, 2, 3
  total: number; // 2 or 3
  amount: number;
  paid: boolean;
  paidDate?: string;
  paymentMethod?: string;
}

interface PaymentItem {
  id: string;
  name: string;
  type: 'camp' | 'protection' | 'insurance' | 'diet' | 'addon' | 'other';
  amount: number;
  status: PaymentItemStatus; // Changed from paid boolean to status
  paidDate?: string;
  paymentMethod?: string;
  canceledDate?: string;
  installments?: PaymentInstallment[]; // Installments for this item (if payment_plan is set)
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
  wantsInvoice: boolean; // Whether client wants an invoice
  invoiceNumber?: string;
  invoiceLink?: string;
  invoicePaid: boolean; // Status faktury (opłacona/nieopłacona)
  orderDate: string; // Data zamówienia
}

/**
 * Individual payment record (wpłata)
 */
interface PaymentRecord {
  amount: number;
  date: string | null;
  method?: string;
}

/**
 * Reservation Payment Interface
 * Extended reservation with payment details
 */
interface ReservationPayment {
  id: number;
  reservationName: string;
  participantName: string;
  participantFirstName?: string | null;
  participantLastName?: string | null;
  email: string;
  campName: string;
  tripName: string;
  propertyStartDate?: string | null;
  propertyEndDate?: string | null;
  status: string;
  paymentStatus: string;  // Payment status from database: 'unpaid' | 'partial' | 'paid' | 'returned'
  createdAt: string;
  paymentDetails: PaymentDetails;
  promotionName?: string | null;
  protectionNames?: string | null;
  depositAmount?: number;
  campId?: number;
  propertyId?: number;
  selectedPromotion?: string | null;
  selectedProtection?: (string | number)[] | null;
  selectedAddons?: (string | number)[] | null;
  // New fields for extended columns
  participantAge?: string | null;  // Rocznik
  participantCity?: string | null;  // Miasto uczestnika
  guardianName?: string | null;  // Opiekun 1
  guardianPhone?: string | null;  // Telefon opiekuna
  guardianEmail?: string | null;  // Email opiekuna
  location?: string | null;  // Lokalizacja (okres - miasto)
  propertyTag?: string | null;  // Tag turnusu
  transportDeparture?: string | null;  // Transport wyjazd
  transportReturn?: string | null;  // Transport powrót
  // Addons flags (ptaszki)
  hasOaza?: boolean;
  hasTarcza?: boolean;
  hasQuad?: boolean;
  hasSkuter?: boolean;
  hasEnergylandia?: boolean;
  hasTermy?: boolean;
  // Document statuses
  contractStatus?: string | null;
  qualificationCardStatus?: string | null;
  // Individual payments (wpłaty)
  payment1?: PaymentRecord | null;
  payment2?: PaymentRecord | null;
  payment3?: PaymentRecord | null;
}

/**
 * Fetch protection prices for a specific turnus (camp + property)
 * Returns a map of protection ID to {name, price} with turnus-specific prices
 */
const fetchTurnusProtectionPrices = async (
  campId: number,
  propertyId: number,
): Promise<Map<number, { name: string; price: number }>> => {
  try {
    const { getApiBaseUrlRuntime } = await import('@/utils/api-config');
    const apiBaseUrl = getApiBaseUrlRuntime();
    const response = await fetch(`${apiBaseUrl}/api/camps/${campId}/properties/${propertyId}/protections`);

    if (!response.ok) {
      console.warn(`Could not fetch turnus protections for camp ${campId}, property ${propertyId}`);
      return new Map();
    }

    const turnusProtections = await response.json();
    const protectionsMap = new Map<number, { name: string; price: number }>();

    if (Array.isArray(turnusProtections)) {
      turnusProtections.forEach((tp: any) => {
        // Skip placeholders without relations
        if (tp.has_no_relations) return;

        // Use general_protection_id for mapping (this is what's stored in selected_protection)
        const generalProtectionId = tp.general_protection_id || tp.id;
        if (generalProtectionId) {
          protectionsMap.set(generalProtectionId, {
            name: tp.name || 'Ochrona',
            price: tp.price || 0,
          });
        }
      });
    }

    return protectionsMap;
  } catch (err) {
    console.warn('Error fetching turnus protection prices:', err);
    return new Map();
  }
};

/**
 * Generate payment items for a reservation based on real reservation data and payments
 * Correctly distributes payments across items (camp, protection, diet, addons)
 * @param reservation - Reservation data from API
 * @param payments - Array of payment records
 * @param protectionsMap - Map of protection ID to {name, price} (from API) - fallback to general prices
 * @param addonsMap - Map of addon ID to {name, price} (from API)
 */
const generatePaymentItems = async (
  reservation: any,
  payments: PaymentResponse[],
  protectionsMap: Map<number, { name: string; price: number }> = new Map(),
  addonsMap: Map<string, { name: string; price: number }> = new Map(),
): Promise<PaymentItem[]> => {
  const items: PaymentItem[] = [];
  let itemId = 1;

  // Fetch turnus-specific protection prices (these are the actual prices used in reservation)
  let turnusProtectionsMap = new Map<number, { name: string; price: number }>();
  if (reservation.camp_id && reservation.property_id) {
    turnusProtectionsMap = await fetchTurnusProtectionPrices(reservation.camp_id, reservation.property_id);
  }

  // Use turnus prices if available, otherwise fallback to general prices
  const effectiveProtectionsMap = turnusProtectionsMap.size > 0 ? turnusProtectionsMap : protectionsMap;

  // Find payments for this reservation (order_id format: "RES-{id}" or just "{id}" or "RES-{id}-{timestamp}")
  const reservationPayments = payments.filter(p => {
    const orderId = p.order_id || '';
    // Check if order_id matches reservation.id (with or without "RES-" prefix, or with timestamp)
    // Format: "RES-{id}" or "RES-{id}-{timestamp}" or just "{id}"
    if (orderId === String(reservation.id)) return true;
    if (orderId === `RES-${reservation.id}`) return true;
    // For format "RES-{id}-{timestamp}", extract the id part
    const match = orderId.match(/^RES-(\d+)(?:-|$)/);
    if (match && parseInt(match[1], 10) === reservation.id) return true;
    return false;
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
        new Date(a.paid_at || a.created_at || 0).getTime(),
      )[0]
    : null;
  const paymentDate = latestPayment
    ? ((latestPayment.paid_at || latestPayment.created_at) || '').split('T')[0]
    : undefined;
  const paymentMethod = latestPayment
    ? (latestPayment.channel_id === 64 ? 'BLIK' :
       latestPayment.channel_id === 53 ? 'Karta' : 'Online')
    : undefined;

  // Parse selected_protection - can be array of strings like ["protection-1", "protection-2"]
  let selectedProtections: string[] = [];
  if (reservation.selected_protection) {
    if (Array.isArray(reservation.selected_protection)) {
      selectedProtections = reservation.selected_protection;
    } else if (typeof reservation.selected_protection === 'string') {
      try {
        const parsed = JSON.parse(reservation.selected_protection);
        selectedProtections = Array.isArray(parsed) ? parsed : [reservation.selected_protection];
      } catch {
        selectedProtections = [reservation.selected_protection];
      }
    }
  }

  // Calculate protection amounts from turnus-specific prices
  let totalProtectionAmount = 0;
  selectedProtections.forEach((protectionId: string) => {
    // Extract numeric ID from "protection-X" format
    const numericIdMatch = protectionId.match(/protection-(\d+)/);
    if (numericIdMatch) {
      const numericId = parseInt(numericIdMatch[1], 10);
      const protectionData = effectiveProtectionsMap.get(numericId);
      if (protectionData) {
        totalProtectionAmount += protectionData.price;
      }
    }
  });

  // Calculate diet amount (if diet ID is provided)
  const dietAmount = 0; // Will be calculated from diet data if needed

  // Calculate addons total from actual addon data
  let totalAddonsAmount = 0;
  const selectedAddons = reservation.selected_addons
    ? (Array.isArray(reservation.selected_addons) ? reservation.selected_addons : [reservation.selected_addons])
    : [];

  selectedAddons.forEach((addonId: string | number) => {
    // Convert to string if it's a number
    const addonIdStr = String(addonId);
    const addonData = addonsMap.get(addonIdStr);
    if (addonData) {
      totalAddonsAmount += addonData.price;
    } else {
      // Log missing addon for debugging
      console.warn(`Addon not found in map: ${addonIdStr} (type: ${typeof addonId})`, {
        reservationId: reservation.id,
        selectedAddons: reservation.selected_addons,
        addonsMapKeys: Array.from(addonsMap.keys()),
      });
    }
  });

  // Calculate camp amount = total_price - (protections + diet + addons + transport + promotion)
  // Note: transport and promotion are included in total_price, so we calculate camp as remainder
  const additionalItemsAmount = totalProtectionAmount + dietAmount + totalAddonsAmount;
  const totalPriceFromReservation = reservation.total_price || 0;
  const campAmount = Math.max(0, totalPriceFromReservation - additionalItemsAmount);

  // Total amount should match reservation.total_price (this is the source of truth)
  const totalAmount = totalPriceFromReservation;

  // Deposit amount: 500 PLN base + all protections + all addons (if deposit was selected)
  const depositBaseAmount = 500;
  const depositAmount = depositBaseAmount + totalProtectionAmount + totalAddonsAmount;

  // Distribute payments across items
    // Priority: If totalPaid >= depositAmount, pay deposit first (500 + protections + addons), then camp
    // Otherwise, if totalPaid < depositAmount but >= depositBaseAmount, pay partial deposit
    // Otherwise, pay camp first (full payment without deposit)
    let remainingPaid = totalPaid;
    const hasDeposit = depositAmount > depositBaseAmount; // Has protections or addons in deposit
    const isDepositPayment = hasDeposit && totalPaid >= depositBaseAmount && totalPaid < totalAmount;

    // Always pay deposit components first if deposit was selected (500 + protections + addons)
  if (isDepositPayment || (hasDeposit && totalPaid >= depositAmount)) {
    // Pay deposit base (500 PLN) first
    const depositBasePaid = Math.min(remainingPaid, depositBaseAmount);
    remainingPaid -= depositBasePaid;

    // Protections - create separate item for each protection (paid from deposit)
    selectedProtections.forEach((protectionId: string) => {
      const numericIdMatch = protectionId.match(/protection-(\d+)/);
      if (numericIdMatch) {
        const numericId = parseInt(numericIdMatch[1], 10);
        const protectionData = effectiveProtectionsMap.get(numericId);
        if (protectionData) {
          const protectionPaidAmount = Math.min(remainingPaid, protectionData.price);
          const protectionPaid = protectionPaidAmount >= protectionData.price;
          items.push({
            id: `item-${itemId++}`,
            name: `Ochrona rezerwacji (${protectionData.name})`,
            type: 'protection',
            amount: protectionData.price,
            status: protectionPaid ? 'paid' : (protectionPaidAmount > 0 ? 'partially_paid' : 'unpaid'),
            paidDate: protectionPaid && paymentDate ? paymentDate : undefined,
            paymentMethod: protectionPaid && paymentMethod ? paymentMethod : undefined,
          });
          remainingPaid -= protectionPaidAmount;
        }
      }
    });

    // Addons - create separate item for each addon (paid from deposit)
    selectedAddons.forEach((addonId: string | number) => {
      // Convert to string if it's a number
      const addonIdStr = String(addonId);
      const addonData = addonsMap.get(addonIdStr);
      if (addonData && addonData.price > 0) {
        const addonPaidAmount = Math.min(remainingPaid, addonData.price);
        const addonPaid = addonPaidAmount >= addonData.price;
        items.push({
          id: `item-${itemId++}`,
          name: addonData.name,
          type: 'addon',
          amount: addonData.price,
          status: addonPaid ? 'paid' : (addonPaidAmount > 0 ? 'partially_paid' : 'unpaid'),
          paidDate: addonPaid && paymentDate ? paymentDate : undefined,
          paymentMethod: addonPaid && paymentMethod ? paymentMethod : undefined,
        });
        remainingPaid -= addonPaidAmount;
      } else if (addonData && addonData.price === 0) {
        // Add addon even if price is 0 (free addon)
        items.push({
          id: `item-${itemId++}`,
          name: addonData.name,
          type: 'addon',
          amount: 0,
          status: 'paid' as PaymentItemStatus,
          paidDate: paymentDate ? paymentDate : undefined,
          paymentMethod: paymentMethod ? paymentMethod : undefined,
        });
      }
    });

    // Camp - pay remaining amount (if any) after deposit
    const campPaidAmount = Math.min(remainingPaid, campAmount);
    const campPaid = campPaidAmount >= campAmount;
    const campItem: PaymentItem = {
      id: `item-${itemId++}`,
      name: `Obóz: ${reservation.camp_name || 'Nieznany obóz'}`,
      type: 'camp',
      amount: campAmount,
      status: campPaid ? 'paid' : (campPaidAmount > 0 ? 'partially_paid' : 'unpaid'),
      paidDate: campPaid && paymentDate ? paymentDate : undefined,
      paymentMethod: campPaid && paymentMethod ? paymentMethod : undefined,
    };

    // Generate installments if payment_plan is set and camp is partially paid
    const paymentPlan = reservation.payment_plan;
    if (paymentPlan && (paymentPlan === '2' || paymentPlan === '3') && campItem.status === 'partially_paid') {
      const installmentCount = parseInt(paymentPlan, 10);
      const installments: PaymentInstallment[] = [];

      // Add deposit (zaliczka) as first item if it was paid
      if (depositBasePaid > 0) {
        // Find deposit payment from database (payment with amount around 500 PLN, not a "Rata" payment)
        const depositPayment = successfulPayments.find(p => {
          const amount = p.paid_amount || p.amount || 0;
          // Check if payment is around 500 PLN (deposit) and not an installment
          return amount >= 400 && amount <= 600 &&
                 !p.description?.includes('Rata') &&
                 !p.description?.includes('rata');
        });

        installments.push({
          number: 0, // Special number for deposit
          total: installmentCount,
          amount: depositBaseAmount, // 500 PLN
          paid: depositBasePaid >= depositBaseAmount,
          paidDate: depositPayment?.paid_at
            ? depositPayment.paid_at.split('T')[0]
            : (depositBasePaid >= depositBaseAmount && paymentDate ? paymentDate : undefined),
          paymentMethod: depositPayment
            ? (depositPayment.channel_id === 64 ? 'BLIK' :
               depositPayment.channel_id === 53 ? 'Karta' : 'Online')
            : undefined,
        });
      }

      // Find all installment payments from database (with "Rata X/Y" in description)
      const installmentPayments = successfulPayments
        .filter(p => p.description && (p.description.includes('Rata') || p.description.includes('rata')))
        .map(p => {
          // Extract installment number from description (e.g., "Rata 1/3" -> 1)
          const match = p.description?.match(/Rata\s+(\d+)\/(\d+)/i);
          if (match) {
            return {
              number: parseInt(match[1], 10),
              total: parseInt(match[2], 10),
              payment: p,
            };
          }
          return null;
        })
        .filter((item): item is { number: number; total: number; payment: PaymentResponse } => item !== null)
        .filter(item => item.total === installmentCount); // Only match the correct plan

      // Calculate installment amount: divide remaining amount (after deposit) by number of installments
      // Installments are calculated based on remaining amount after deposit (500 PLN), not full campAmount
      // Example: campAmount = 2400, deposit = 500, remaining = 1900, but if total is 2550:
      // remaining = totalPriceFromReservation - depositBaseAmount = 2550 - 500 = 2050
      // So 2050 / 3 = 683.33 PLN per installment
      const remainingForInstallments = depositBasePaid > 0
        ? (totalPriceFromReservation - depositBaseAmount)
        : campAmount;
      const installmentAmount = remainingForInstallments / installmentCount;

      // For each installment, check if it's paid and get actual amount from database
      for (let i = 1; i <= installmentCount; i++) {
        const installmentPaymentData = installmentPayments.find(item => item.number === i);
        const isPaid = !!installmentPaymentData;

        // Use actual paid amount from database if paid, otherwise use fixed installment amount
        const actualAmount = installmentPaymentData?.payment
          ? (installmentPaymentData.payment.paid_amount || installmentPaymentData.payment.amount || 0)
          : installmentAmount;

        installments.push({
          number: i,
          total: installmentCount,
          amount: actualAmount, // Use actual amount from database for paid, calculated for unpaid
          paid: isPaid,
          paidDate: isPaid && installmentPaymentData?.payment && installmentPaymentData.payment.paid_at
            ? installmentPaymentData.payment.paid_at.split('T')[0]
            : undefined,
          paymentMethod: isPaid && installmentPaymentData?.payment
            ? (installmentPaymentData.payment.channel_id === 64 ? 'BLIK' :
               installmentPaymentData.payment.channel_id === 53 ? 'Karta' : 'Online')
            : undefined,
        });
      }

      campItem.installments = installments;
    }

    items.push(campItem);
    remainingPaid -= campPaidAmount;
  } else {
    // Full payment or partial payment after deposit: distribute camp -> protections -> diet -> addons
    // Camp base price
    const campPaidAmount = Math.min(remainingPaid, campAmount);
    const campPaid = campPaidAmount >= campAmount;
    const campItem: PaymentItem = {
      id: `item-${itemId++}`,
      name: `Obóz: ${reservation.camp_name || 'Nieznany obóz'}`,
      type: 'camp',
      amount: campAmount,
      status: campPaid ? 'paid' : (campPaidAmount > 0 ? 'partially_paid' : 'unpaid'),
      paidDate: campPaid && paymentDate ? paymentDate : undefined,
      paymentMethod: campPaid && paymentMethod ? paymentMethod : undefined,
    };

    // Generate installments if payment_plan is set and camp is partially paid
    const paymentPlan = reservation.payment_plan;
    if (paymentPlan && (paymentPlan === '2' || paymentPlan === '3') && campItem.status === 'partially_paid') {
      const installmentCount = parseInt(paymentPlan, 10);
      const installments: PaymentInstallment[] = [];

      // Find all installment payments from database (with "Rata X/Y" in description)
      const installmentPayments = successfulPayments
        .filter(p => p.description && (p.description.includes('Rata') || p.description.includes('rata')))
        .map(p => {
          // Extract installment number from description (e.g., "Rata 1/3" -> 1)
          const match = p.description?.match(/Rata\s+(\d+)\/(\d+)/i);
          if (match) {
            return {
              number: parseInt(match[1], 10),
              total: parseInt(match[2], 10),
              payment: p,
            };
          }
          return null;
        })
        .filter((item): item is { number: number; total: number; payment: PaymentResponse } => item !== null)
        .filter(item => item.total === installmentCount); // Only match the correct plan

      // Calculate installment amount: divide campAmount by number of installments
      // In this branch (else), no deposit was paid, so use campAmount directly
      const installmentAmount = campAmount / installmentCount;

      // For each installment, check if it's paid and get actual amount from database
      for (let i = 1; i <= installmentCount; i++) {
        const installmentPaymentData = installmentPayments.find(item => item.number === i);
        const isPaid = !!installmentPaymentData;

        // Use actual paid amount from database if paid, otherwise use fixed installment amount
        const actualAmount = installmentPaymentData?.payment
          ? (installmentPaymentData.payment.paid_amount || installmentPaymentData.payment.amount || 0)
          : installmentAmount;

        installments.push({
          number: i,
          total: installmentCount,
          amount: actualAmount, // Use actual amount from database for paid, calculated for unpaid
          paid: isPaid,
          paidDate: isPaid && installmentPaymentData?.payment && installmentPaymentData.payment.paid_at
            ? installmentPaymentData.payment.paid_at.split('T')[0]
            : undefined,
          paymentMethod: isPaid && installmentPaymentData?.payment
            ? (installmentPaymentData.payment.channel_id === 64 ? 'BLIK' :
               installmentPaymentData.payment.channel_id === 53 ? 'Karta' : 'Online')
            : undefined,
        });
      }

      campItem.installments = installments;
    }

    items.push(campItem);
    remainingPaid -= campPaidAmount;

    // Protections - create separate item for each protection
    selectedProtections.forEach((protectionId: string) => {
      const numericIdMatch = protectionId.match(/protection-(\d+)/);
      if (numericIdMatch) {
        const numericId = parseInt(numericIdMatch[1], 10);
        const protectionData = effectiveProtectionsMap.get(numericId);
        if (protectionData) {
          const protectionPaidAmount = Math.min(remainingPaid, protectionData.price);
          const protectionPaid = protectionPaidAmount >= protectionData.price;
          items.push({
            id: `item-${itemId++}`,
            name: `Ochrona rezerwacji (${protectionData.name})`,
            type: 'protection',
            amount: protectionData.price,
            status: protectionPaid ? 'paid' : (protectionPaidAmount > 0 ? 'partially_paid' : 'unpaid'),
            paidDate: protectionPaid && paymentDate ? paymentDate : undefined,
            paymentMethod: protectionPaid && paymentMethod ? paymentMethod : undefined,
          });
          remainingPaid -= protectionPaidAmount;
        }
      }
    });

    // Diet (if selected)
    if (reservation.diet && dietAmount > 0) {
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

    // Addons - create separate item for each addon
    selectedAddons.forEach((addonId: string | number) => {
      // Convert to string if it's a number
      const addonIdStr = String(addonId);
      const addonData = addonsMap.get(addonIdStr);
      if (addonData && addonData.price > 0) {
        const addonPaidAmount = Math.min(remainingPaid, addonData.price);
        const addonPaid = addonPaidAmount >= addonData.price;
        items.push({
          id: `item-${itemId++}`,
          name: addonData.name,
          type: 'addon',
          amount: addonData.price,
          status: addonPaid ? 'paid' : (addonPaidAmount > 0 ? 'partially_paid' : 'unpaid'),
          paidDate: addonPaid && paymentDate ? paymentDate : undefined,
          paymentMethod: addonPaid && paymentMethod ? paymentMethod : undefined,
        });
        remainingPaid -= addonPaidAmount;
      } else if (addonData && addonData.price === 0) {
        // Add addon even if price is 0 (free addon)
        items.push({
          id: `item-${itemId++}`,
          name: addonData.name,
          type: 'addon',
          amount: 0,
          status: 'paid' as PaymentItemStatus,
          paidDate: paymentDate ? paymentDate : undefined,
          paymentMethod: paymentMethod ? paymentMethod : undefined,
        });
      }
    });
  }

  return items;
};

/**
 * Generate payment details for a reservation based on real data
 * Uses actual payment amounts from database (paid_amount from Payment records)
 */
const generatePaymentDetails = async (
  reservation: any,
  payments: PaymentResponse[],
  manualPayments: ManualPaymentResponse[] = [],
  protectionsMap: Map<number, { name: string; price: number }> = new Map(),
  addonsMap: Map<string, { name: string; price: number }> = new Map(),
): Promise<PaymentDetails> => {
  const items = await generatePaymentItems(reservation, payments, protectionsMap, addonsMap);

  // Find payments for this reservation (order_id format: "RES-{id}" or just "{id}" or "RES-{id}-{timestamp}")
  const reservationPayments = payments.filter(p => {
    const orderId = p.order_id || '';
    // Check if order_id matches reservation.id (with or without "RES-" prefix, or with timestamp)
    // Format: "RES-{id}" or "RES-{id}-{timestamp}" or just "{id}"
    if (orderId === String(reservation.id)) return true;
    if (orderId === `RES-${reservation.id}`) return true;
    // For format "RES-{id}-{timestamp}", extract the id part
    const match = orderId.match(/^RES-(\d+)(?:-|$)/);
    if (match && parseInt(match[1], 10) === reservation.id) return true;
    return false;
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
  const tpayPaidAmount = successfulPayments.reduce((sum, p) => {
    // If paid_amount is set (from webhook), use it
    if (p.paid_amount !== null && p.paid_amount !== undefined && p.paid_amount > 0) {
      return sum + p.paid_amount;
    }
    // Otherwise, use amount (payment was created but webhook didn't update it yet)
    return sum + (p.amount || 0);
  }, 0);

  // Sum manual payments for this reservation
  const manualPaidAmount = manualPayments.reduce((sum, p) => sum + p.amount, 0);

  // Total paid amount = Tpay payments + manual payments
  const actualPaidAmount = tpayPaidAmount + manualPaidAmount;

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
  const _isPartialPayment = paidAmount > 0 && paidAmount < totalAmount;

  return {
    reservationId: reservation.id,
    totalAmount: totalAmount,
    paidAmount: paidAmount,
    remainingAmount: remainingAmount,
    items,
    wantsInvoice: reservation.wants_invoice || false,  // Whether client wants an invoice
    invoiceNumber: `FV-${new Date(reservation.created_at).getFullYear()}-${String(reservation.id).padStart(4, '0')}`,
    invoiceLink: `/invoices/FV-${new Date(reservation.created_at).getFullYear()}-${String(reservation.id).padStart(4, '0')}.pdf`,
    invoicePaid: isFullPayment && !hasCanceledItems && hasSuccessfulPayment,
    orderDate: reservation.created_at.split('T')[0],
  };
};

/**
 * Map backend reservation and payments to frontend format
 */
const mapReservationToPaymentFormat = async (
  reservation: any,
  payments: PaymentResponse[],
  protectionsMap: Map<number, { name: string; price: number }> = new Map(),
  addonsMap: Map<string, { name: string; price: number }> = new Map(),
  allManualPayments: ManualPaymentResponse[] = [],
  promotionsCache: Map<string, any[]> = new Map(),
  protectionsCache: Map<string, Map<number, { name: string; price: number }>> = new Map(),
): Promise<ReservationPayment> => {
  // Filtruj płatności manualne dla tej rezerwacji (zamiast wywołania API)
  const reservationManualPayments = allManualPayments.filter(
    mp => mp.reservation_id === reservation.id,
  );
  const participantName = `${reservation.participant_first_name || ''} ${reservation.participant_last_name || ''}`.trim();
  const firstParent = reservation.parents_data && reservation.parents_data.length > 0
    ? reservation.parents_data[0]
    : null;
  const email = (firstParent && firstParent.email) ? firstParent.email : (reservation.invoice_email || '');
  const campName = reservation.camp_name || 'Nieznany obóz';
  const tripName = reservation.property_name || `${reservation.property_period || ''} - ${reservation.property_city || ''}`.trim() || 'Nieznany turnus';

  // Map status
  let status = reservation.status || 'pending';
  if (status === 'pending') status = 'aktywna';
  if (status === 'cancelled') status = 'anulowana';
  if (status === 'completed') status = 'zakończona';

  // Get promotion name - prefer backend's promotion_name, fallback to cache
  let promotionName: string | null = reservation.promotion_name || null;
  
  // If backend didn't provide promotion_name, try from cache
  if (!promotionName && reservation.selected_promotion && reservation.camp_id && reservation.property_id) {
    const cacheKey = `${reservation.camp_id}_${reservation.property_id}`;
    const turnusPromotions = promotionsCache.get(cacheKey);

    if (turnusPromotions) {
      try {
        const relationId = typeof reservation.selected_promotion === 'number'
          ? reservation.selected_promotion
          : parseInt(String(reservation.selected_promotion));
        if (!isNaN(relationId)) {
          const foundPromotion = turnusPromotions.find(
            (p: any) => p.relation_id === relationId || p.id === relationId,
          );
          if (foundPromotion) {
            promotionName = foundPromotion.name || null;
          }
        }
      } catch (err) {
        console.warn('Could not process promotion:', err);
      }
    }
  }

  // Fetch protection names from cache (zamiast wywołania API)
  let protectionNames: string | null = null;
  let depositAmount: number = 0;
  if (reservation.selected_protection && reservation.camp_id && reservation.property_id) {
    const cacheKey = `${reservation.camp_id}_${reservation.property_id}`;
    const cachedTurnusProtectionsMap = protectionsCache.get(cacheKey);
    const turnusProtectionsMap = cachedTurnusProtectionsMap || new Map<number, { name: string; price: number }>();
    const effectiveProtectionsMap = turnusProtectionsMap.size > 0 ? turnusProtectionsMap : protectionsMap;

    const selectedProtections: string[] = Array.isArray(reservation.selected_protection)
      ? reservation.selected_protection
      : (typeof reservation.selected_protection === 'string'
        ? (() => {
            try {
              const parsed = JSON.parse(reservation.selected_protection);
              return Array.isArray(parsed) ? parsed : [reservation.selected_protection];
            } catch {
              return [reservation.selected_protection];
            }
          })()
        : []);

    const protectionNameList: string[] = [];
    let totalProtectionAmount = 0;

    selectedProtections.forEach((protectionId: string) => {
      const numericIdMatch = protectionId.match(/protection-(\d+)/);
      if (numericIdMatch) {
        const numericId = parseInt(numericIdMatch[1], 10);
        const protectionData = effectiveProtectionsMap.get(numericId);
        if (protectionData) {
          protectionNameList.push(protectionData.name);
          totalProtectionAmount += protectionData.price;
        }
      }
    });

    if (protectionNameList.length > 0) {
      protectionNames = protectionNameList.join(', ');
    }

    // Calculate addons total for deposit
    let totalAddonsAmount = 0;
    const selectedAddons = reservation.selected_addons
      ? (Array.isArray(reservation.selected_addons) ? reservation.selected_addons : [reservation.selected_addons])
      : [];
    selectedAddons.forEach((addonId: string | number) => {
      const addonIdStr = String(addonId);
      const addonData = addonsMap.get(addonIdStr);
      if (addonData) {
        totalAddonsAmount += addonData.price;
      }
    });

    // Deposit amount: 500 PLN base + all protections + all addons
    const depositBaseAmount = 500;
    depositAmount = depositBaseAmount + totalProtectionAmount + totalAddonsAmount;
  } else {
    // If no protections, calculate deposit from addons only
    let totalAddonsAmount = 0;
    const selectedAddons = reservation.selected_addons
      ? (Array.isArray(reservation.selected_addons) ? reservation.selected_addons : [reservation.selected_addons])
      : [];
    selectedAddons.forEach((addonId: string | number) => {
      const addonIdStr = String(addonId);
      const addonData = addonsMap.get(addonIdStr);
      if (addonData) {
        totalAddonsAmount += addonData.price;
      }
    });
    const depositBaseAmount = 500;
    depositAmount = depositBaseAmount + totalAddonsAmount;
  }

  // === NEW FIELDS MAPPING ===
  
  // Guardian data from parents_data (camelCase from backend)
  const guardian = firstParent;
  const guardianName = guardian 
    ? `${guardian.firstName || ''} ${guardian.lastName || ''}`.trim() || null 
    : null;
  const guardianPhone = guardian?.phoneNumber || null;
  const guardianEmail = guardian?.email || null;
  
  // Location (period - city)
  const location = reservation.property_period && reservation.property_city
    ? `${reservation.property_period} - ${reservation.property_city}`
    : reservation.property_city || reservation.property_period || null;
  
  // Transport
  const transportDeparture = reservation.departure_type === 'own' 
    ? 'Własny' 
    : reservation.departure_city || null;
  const transportReturn = reservation.return_type === 'own' 
    ? 'Własny' 
    : reservation.return_city || null;
  
  // Check addons for specific types (based on addon names)
  let hasOaza = false;
  let hasTarcza = false;
  let hasQuad = false;
  let hasSkuter = false;
  let hasEnergylandia = false;
  let hasTermy = false;
  
  // Check protections for Oaza and Tarcza
  if (protectionNames) {
    const protNamesLower = protectionNames.toLowerCase();
    hasOaza = protNamesLower.includes('oaza');
    hasTarcza = protNamesLower.includes('tarcza');
  }
  
  // Check selected addons for other extras
  const allSelectedAddons = reservation.selected_addons
    ? (Array.isArray(reservation.selected_addons) ? reservation.selected_addons : [reservation.selected_addons])
    : [];
  
  allSelectedAddons.forEach((addonId: string | number) => {
    const addonIdStr = String(addonId);
    const addonData = addonsMap.get(addonIdStr);
    if (addonData) {
      const addonNameLower = addonData.name.toLowerCase();
      if (addonNameLower.includes('quad')) hasQuad = true;
      if (addonNameLower.includes('skuter')) hasSkuter = true;
      if (addonNameLower.includes('energylandia')) hasEnergylandia = true;
      if (addonNameLower.includes('termy')) hasTermy = true;
    }
  });
  
  // Get individual payments (combine Tpay and manual payments, sorted by date)
  const tpayPayments = payments.filter(p => {
    const orderId = p.order_id || '';
    if (orderId === String(reservation.id)) return true;
    if (orderId === `RES-${reservation.id}`) return true;
    const match = orderId.match(/^RES-(\d+)(?:-|$)/);
    if (match && parseInt(match[1], 10) === reservation.id) return true;
    return false;
  }).filter(p => p.status === 'success' || (p.status === 'pending' && p.amount && p.amount > 0));
  
  // Map Tpay payments to PaymentRecord format
  const tpayRecords: PaymentRecord[] = tpayPayments.map(p => ({
    amount: p.paid_amount || p.amount || 0,
    date: p.paid_at ? p.paid_at.split('T')[0] : (p.payment_date ? String(p.payment_date).split('T')[0] : (p.created_at ? String(p.created_at).split('T')[0] : null)),
    method: p.channel_id === 64 ? 'BLIK' : p.channel_id === 53 ? 'Karta' : 'Online',
  }));
  
  // Map manual payments to PaymentRecord format
  const manualRecords: PaymentRecord[] = reservationManualPayments.map(mp => ({
    amount: mp.amount,
    date: mp.payment_date ? String(mp.payment_date).split('T')[0] : null,
    method: mp.payment_method || 'Ręczna',
  }));
  
  // Combine and sort all payments by date (oldest first)
  const allPaymentRecords = [...tpayRecords, ...manualRecords].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  
  // Assign to payment1, payment2, payment3
  const payment1 = allPaymentRecords[0] || null;
  const payment2 = allPaymentRecords[1] || null;
  const payment3 = allPaymentRecords[2] || null;

  return {
    id: reservation.id,
    reservationName: `REZ-${new Date(reservation.created_at).getFullYear()}-${String(reservation.id).padStart(3, '0')}`,
    participantName: participantName || 'Brak danych',
    participantFirstName: reservation.participant_first_name || null,
    participantLastName: reservation.participant_last_name || null,
    email: email,
    campName: campName,
    tripName: tripName,
    propertyStartDate: reservation.property_start_date || null,
    propertyEndDate: reservation.property_end_date || null,
    status: status,
    paymentStatus: reservation.payment_status || 'unpaid',  // Get from database
    createdAt: reservation.created_at.split('T')[0],
    paymentDetails: await generatePaymentDetails(reservation, payments, reservationManualPayments, protectionsMap, addonsMap),
    promotionName: promotionName,
    protectionNames: protectionNames || null,
    depositAmount: depositAmount,
    campId: reservation.camp_id || undefined,
    propertyId: reservation.property_id || undefined,
    selectedPromotion: reservation.selected_promotion || null,
    selectedProtection: reservation.selected_protection || null,
    selectedAddons: reservation.selected_addons || null,
    // New fields
    participantAge: reservation.participant_age || null,
    participantCity: reservation.participant_city || null,
    guardianName,
    guardianPhone,
    guardianEmail,
    location,
    propertyTag: reservation.property_tag || null,
    transportDeparture,
    transportReturn,
    hasOaza,
    hasTarcza,
    hasQuad,
    hasSkuter,
    hasEnergylandia,
    hasTermy,
    contractStatus: reservation.contract_status || null,
    qualificationCardStatus: reservation.qualification_card_status || null,
    payment1,
    payment2,
    payment3,
  };
};

/**
 * Payments Management Component
 * Displays reservations with detailed payment information
 */
export default function PaymentsManagement() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { showInfo, showSuccess, showError } = useToast();
  const [reservations, setReservations] = useState<ReservationPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [rowContextMenu, setRowContextMenu] = useState<{ x: number; y: number; url: string } | null>(null);
  const rowContextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rowContextMenu) return;
    const close = (e: MouseEvent) => {
      if (rowContextMenuRef.current && !rowContextMenuRef.current.contains(e.target as Node)) {
        setRowContextMenu(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [rowContextMenu]);

  // Initialize filters from URL params
  const getInitialFilters = useCallback((): SearchFilters => ({
    search: searchParams?.get('search') || '',
    paymentStatus: searchParams?.get('status') || '',
    campName: searchParams?.get('camp') || '',
    dateFrom: searchParams?.get('date_from') || '',
    dateTo: searchParams?.get('date_to') || '',
  }), [searchParams]);

  // Filter state - local inputs
  const [filters, setFilters] = useState<SearchFilters>(getInitialFilters);
  // Applied filters (what's actually being searched)
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(getInitialFilters);
  
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [sortColumn, setSortColumn] = useState<string | null>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Server-side pagination
  const pageFromUrl = searchParams?.get('page');
  const [currentPage, setCurrentPage] = useState(pageFromUrl ? parseInt(pageFromUrl, 10) : 1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default, will be updated from user settings
  const [pageInputValue, setPageInputValue] = useState('');
  const [serverPagination, setServerPagination] = useState<PaginationInfo | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  
  // Load user settings (items_per_page) on mount
  // First check localStorage for immediate value, then sync from API
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        // First, check localStorage for immediate value (faster)
        const localItemsPerPage = localStorage.getItem('admin_items_per_page');
        if (localItemsPerPage) {
          const parsed = parseInt(localItemsPerPage, 10);
          if (!isNaN(parsed) && parsed > 0) {
            setItemsPerPage(parsed);
          }
        }

        // Then fetch from API to ensure sync with database
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const payload = JSON.parse(atob(token.split('.')[1]));
        const adminUserId = payload.admin_user_id;
        if (!adminUserId) return;
        
        const settings = await authenticatedApiCall<{ items_per_page: number }>(
          `/api/admin-users/${adminUserId}/settings`
        );
        
        if (settings?.items_per_page) {
          setItemsPerPage(settings.items_per_page);
          // Update localStorage to stay in sync
          localStorage.setItem('admin_items_per_page', settings.items_per_page.toString());
        }
      } catch (err) {
        console.error('Failed to load user settings:', err);
        // Keep localStorage value or default on error
      }
    };
    
    loadUserSettings();
  }, []);
  
  // Applied column filters - JSON string to trigger refetch only when filters actually change
  // This prevents modal from flickering when columnConfig updates
  const [appliedColumnFilters, setAppliedColumnFilters] = useState<string>('{}');

  // State dla alertu o zmianach w płatnościach
  const [paymentChangesAlert, setPaymentChangesAlert] = useState<{
    isVisible: boolean;
    changedCount: number;
  }>({
    isVisible: false,
    changedCount: 0,
  });

  // Update URL with current filters
  const updateURL = useCallback((newFilters: SearchFilters, page: number) => {
    const params = new URLSearchParams();
    
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.paymentStatus) params.set('status', newFilters.paymentStatus);
    if (newFilters.campName) params.set('camp', newFilters.campName);
    if (newFilters.dateFrom) params.set('date_from', newFilters.dateFrom);
    if (newFilters.dateTo) params.set('date_to', newFilters.dateTo);
    if (page > 1) params.set('page', page.toString());
    
    const queryString = params.toString();
    const newUrl = queryString 
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;
    
    window.history.replaceState({}, '', newUrl);
  }, []);

  // Debounced filter change handler
  const handleFilterChange = useCallback((field: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Apply filter after 300ms
    debounceTimerRef.current = setTimeout(() => {
      setCurrentPage(1);
      setAppliedFilters(prev => ({ ...prev, [field]: value }));
    }, 300);
  }, []);

  // Immediate search (for Enter key or button click)
  const handleImmediateSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setCurrentPage(1);
    setAppliedFilters(filters);
  }, [filters]);

  // Handle Enter key in search inputs
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleImmediateSearch();
    }
  };

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    const emptyFilters: SearchFilters = {
      search: '',
      paymentStatus: '',
      campName: '',
      dateFrom: '',
      dateTo: '',
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setCurrentPage(1);
  }, []);

  // Check if any filters are active
  const hasActiveFilters = Object.values(appliedFilters).some(v => v !== '');

  // Update URL when applied filters or page changes
  useEffect(() => {
    updateURL(appliedFilters, currentPage);
  }, [appliedFilters, currentPage, updateURL]);

  // Sync currentPage with URL params on mount and when searchParams change
  useEffect(() => {
    const pageParam = searchParams?.get('page');
    if (pageParam) {
      const pageNum = parseInt(pageParam, 10);
      if (!isNaN(pageNum) && pageNum > 0) {
        setCurrentPage(pageNum);
      }
    } else {
      // If no page param, reset to 1
      setCurrentPage(1);
    }
  }, [searchParams]);

  // Update URL when currentPage changes
  const updatePageInUrl = (page: number) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    if (page === 1) {
      params.delete('page');
    } else {
      params.set('page', page.toString());
    }
    const newUrl = params.toString() ? `/admin-panel/payments?${params.toString()}` : '/admin-panel/payments';
    router.replace(newUrl);
  };

  // Handle page input change with validation
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, numbers only
    if (value === '' || /^\d+$/.test(value)) {
      setPageInputValue(value);
    }
  };

  // Handle Enter key in page input (uses server-side pagination)
  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (pageInputValue === '') return;
      const totalPages = serverPagination?.total_pages || 1;
      const pageNum = parseInt(pageInputValue, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages && Number.isInteger(pageNum)) {
        handlePageChange(pageNum);
      } else {
        setPageInputValue('');
      }
    }
  };

  // Column configuration state
  const STORAGE_KEY = 'payments_list_columns';

  // Column configuration: array of {key, visible, filters?}
  interface ColumnConfig {
    key: string;
    visible: boolean;
    filters?: string[]; // Selected filter values for this column
  }

  // Column definitions with labels
  const COLUMN_DEFINITIONS: Record<string, string> = {
    reservationName: 'Numer rezerwacji',
    participantName: 'Uczestnik',
    totalAmount: 'Kwota całkowita',
    paidAmount: 'Całkowite wpłaty',
    remainingAmount: 'Pozostało do zapłaty',
    payment1Amount: 'Wpłata 1',
    payment1Date: 'Data wpłaty 1',
    payment2Amount: 'Wpłata 2',
    payment2Date: 'Data wpłaty 2',
    payment3Amount: 'Wpłata 3',
    payment3Date: 'Data wpłaty 3',
    participantAge: 'Rocznik',
    participantCity: 'Miasto',
    guardianName: 'Opiekun 1',
    guardianPhone: 'Telefon',
    guardianEmail: 'E-mail',
    campName: 'Nazwa obozu',
    location: 'Lokalizacja',
    propertyTag: 'Tag turnusu',
    promotionName: 'Promocja',
    createdAt: 'Data rezerwacji',
    transportDeparture: 'Transport wyjazd',
    transportReturn: 'Transport powrót',
    hasOaza: 'Oaza',
    hasTarcza: 'Tarcza',
    hasQuad: 'Quad',
    hasSkuter: 'Skuter',
    hasEnergylandia: 'Energylandia',
    hasTermy: 'Termy',
    qualificationCardStatus: 'Karta kwalifikacyjna',
    contractStatus: 'Umowa',
    status: 'Status wpłaty',
    // Stare kolumny (dla kompatybilności z localStorage)
    protectionNames: 'Ochrona',
    depositAmount: 'Zaliczka',
  };

  // Default column order and visibility (zgodnie z zadaniem)
  const DEFAULT_COLUMN_ORDER = [
    'reservationName',
    'participantName',
    'totalAmount',
    'paidAmount',
    'remainingAmount',
    'payment1Amount',
    'payment1Date',
    'payment2Amount',
    'payment2Date',
    'payment3Amount',
    'payment3Date',
    'participantAge',
    'participantCity',
    'guardianName',
    'guardianPhone',
    'guardianEmail',
    'campName',
    'location',
    'propertyTag',
    'promotionName',
    'createdAt',
    'transportDeparture',
    'transportReturn',
    'hasOaza',
    'hasTarcza',
    'hasQuad',
    'hasSkuter',
    'hasEnergylandia',
    'hasTermy',
    'qualificationCardStatus',
    'contractStatus',
    'status',
  ];
  const DEFAULT_COLUMNS = DEFAULT_COLUMN_ORDER.map(key => ({ key, visible: true }));

  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [tempColumnConfig, setTempColumnConfig] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

  // Filter dropdown state: which column has filter dropdown open
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  
  // Frozen filter options - captured when modal opens to prevent "jumping"
  const [frozenFilterOptions, setFrozenFilterOptions] = useState<string[]>([]);
  
  // Filter search state (for searching within filter modal)
  const [filterSearchQuery, setFilterSearchQuery] = useState<string>('');
  const [filterSearchResults, setFilterSearchResults] = useState<string[]>([]);
  const [isFilterSearching, setIsFilterSearching] = useState<boolean>(false);
  const filterSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveToCloudTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [cloudSettingsLoaded, setCloudSettingsLoaded] = useState<boolean>(false);
  
  // Check if column is an amount/money column
  const isAmountColumn = (columnKey: string): boolean => {
    return ['totalAmount', 'paidAmount', 'remainingAmount', 'payment1Amount', 'payment2Amount', 'payment3Amount', 'depositAmount'].includes(columnKey);
  };
  
  // Parse amount input (handle comma and dot as decimal separator)
  const parseAmountInput = (input: string): number | null => {
    if (!input.trim()) return null;
    // Replace comma with dot for parsing
    const normalized = input.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : parsed;
  };

  // Load column configuration from cloud (priority) or localStorage (fallback)
  useEffect(() => {
    const loadColumnConfig = async () => {
      // Helper to merge config with defaults
      const mergeWithDefaults = (parsed: any[]): ColumnConfig[] => {
        const savedKeys = new Set(parsed.map((col: { key: string }) => col.key));
        const merged: ColumnConfig[] = parsed.map((col: any) => ({
          key: col.key,
          visible: col.visible !== false,
          filters: col.filters || [],
        }));
        DEFAULT_COLUMN_ORDER.forEach(key => {
          if (!savedKeys.has(key)) {
            merged.push({ key, visible: true, filters: [] });
          }
        });
        return merged;
      };

      // Try to load from cloud first
      try {
        const cloudSettings = await authenticatedApiCall<{
          payments_columns_config?: string | null;
        }>('/api/admin-users/me/settings');
        
        if (cloudSettings.payments_columns_config) {
          const parsed = JSON.parse(cloudSettings.payments_columns_config);
          if (Array.isArray(parsed)) {
            const merged = mergeWithDefaults(parsed);
            setColumnConfig(merged);
            setTempColumnConfig([...merged]);
            // Also update localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            setCloudSettingsLoaded(true);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not load settings from cloud, falling back to localStorage:', err);
      }

      // Fallback to localStorage
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const merged = mergeWithDefaults(parsed);
            setColumnConfig(merged);
            setTempColumnConfig([...merged]);
          } else {
            const converted: ColumnConfig[] = DEFAULT_COLUMN_ORDER.map(key => ({
              key,
              visible: parsed[key] !== false,
              filters: [],
            }));
            setColumnConfig(converted);
            setTempColumnConfig([...converted]);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(converted));
          }
        }
      } catch (err) {
        console.error('Error loading column preferences from localStorage:', err);
      }
      setCloudSettingsLoaded(true);
    };

    loadColumnConfig();
  }, []);

  // Load filters from URL (highest priority - overrides cloud settings)
  // Also apply cloud filters when loaded and no URL filters
  useEffect(() => {
    if (!cloudSettingsLoaded) return;

    const filtersFromUrl: Record<string, string[]> = {};
    if (searchParams) {
      searchParams.forEach((value, key) => {
        if (key.startsWith('filter_')) {
          const columnKey = key.replace('filter_', '');
          filtersFromUrl[columnKey] = value.split(',').filter(v => v);
        }
      });
    }

    // If URL has filters, apply them (highest priority)
    if (Object.keys(filtersFromUrl).length > 0) {
      setColumnConfig(prev => {
        return prev.map(col => {
          if (filtersFromUrl[col.key]) {
            return { ...col, filters: filtersFromUrl[col.key] };
          }
          return col;
        });
      });
      setAppliedColumnFilters(JSON.stringify(filtersFromUrl));
    } else {
      // No URL filters - use filters from cloud/localStorage (already loaded in columnConfig)
      const filtersFromConfig: Record<string, string[]> = {};
      columnConfig.forEach(col => {
        if (col.filters && col.filters.length > 0) {
          filtersFromConfig[col.key] = col.filters;
        }
      });
      if (Object.keys(filtersFromConfig).length > 0) {
        setAppliedColumnFilters(JSON.stringify(filtersFromConfig));
        // Update URL to reflect filters from cloud
        updateFiltersInUrl(filtersFromConfig);
      }
    }
  }, [cloudSettingsLoaded]);

  // Save column configuration to localStorage and cloud (debounced)
  const saveColumnPreferences = (config: ColumnConfig[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setColumnConfig([...config]);
      
      // Debounced save to cloud (1 second delay)
      if (saveToCloudTimeoutRef.current) {
        clearTimeout(saveToCloudTimeoutRef.current);
      }
      saveToCloudTimeoutRef.current = setTimeout(async () => {
        try {
          await authenticatedApiCall('/api/admin-users/me/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              payments_columns_config: JSON.stringify(config),
            }),
          });
        } catch (err) {
          console.warn('Could not save column preferences to cloud:', err);
        }
      }, 1000);
    } catch (err) {
      console.error('Error saving column preferences:', err);
    }
  };

  // Get unique values for a column - prefer backend filter_options (all values from DB)
  // For columns not in filter_options, calculate from current page data
  const getUniqueColumnValues = (columnKey: string): string[] => {
    // First check if backend provides filter options for this column
    if (filterOptions) {
      const backendKey = columnKey as keyof FilterOptions;
      if (filterOptions[backendKey] && filterOptions[backendKey].length > 0) {
        return filterOptions[backendKey];
      }
    }
    
    // Fallback: calculate from current page data (for columns not in filter_options)
    const values = new Set<string>();
    reservations.forEach(reservation => {
      let value: string | null = null;
      switch (columnKey) {
        case 'reservationName':
          value = reservation.reservationName;
          break;
        case 'participantName':
          value = reservation.participantName;
          break;
        case 'totalAmount':
          value = reservation.paymentDetails.totalAmount.toFixed(2);
          break;
        case 'paidAmount':
          value = reservation.paymentDetails.paidAmount.toFixed(2);
          break;
        case 'remainingAmount':
          value = reservation.paymentDetails.remainingAmount.toFixed(2);
          break;
        case 'payment1Amount':
          value = reservation.payment1?.amount ? reservation.payment1.amount.toFixed(2) : '-';
          break;
        case 'payment1Date':
          value = reservation.payment1?.date || '-';
          break;
        case 'payment2Amount':
          value = reservation.payment2?.amount ? reservation.payment2.amount.toFixed(2) : '-';
          break;
        case 'payment2Date':
          value = reservation.payment2?.date || '-';
          break;
        case 'payment3Amount':
          value = reservation.payment3?.amount ? reservation.payment3.amount.toFixed(2) : '-';
          break;
        case 'payment3Date':
          value = reservation.payment3?.date || '-';
          break;
        case 'participantAge':
          value = reservation.participantAge || '-';
          break;
        case 'participantCity':
          value = reservation.participantCity || '-';
          break;
        case 'guardianName':
          value = reservation.guardianName || '-';
          break;
        case 'guardianPhone':
          value = reservation.guardianPhone || '-';
          break;
        case 'guardianEmail':
          value = reservation.guardianEmail || '-';
          break;
        case 'campName':
          value = reservation.campName || '-';
          break;
        case 'location':
          value = reservation.location || '-';
          break;
        case 'propertyTag':
          value = reservation.propertyTag || '-';
          break;
        case 'promotionName':
          value = reservation.promotionName || '-';
          break;
        case 'createdAt':
          value = new Date(reservation.createdAt).toLocaleDateString('pl-PL');
          break;
        case 'transportDeparture':
          value = reservation.transportDeparture || '-';
          break;
        case 'transportReturn':
          value = reservation.transportReturn || '-';
          break;
        case 'hasOaza':
          value = reservation.hasOaza ? 'Tak' : 'Nie';
          break;
        case 'hasTarcza':
          value = reservation.hasTarcza ? 'Tak' : 'Nie';
          break;
        case 'hasQuad':
          value = reservation.hasQuad ? 'Tak' : 'Nie';
          break;
        case 'hasSkuter':
          value = reservation.hasSkuter ? 'Tak' : 'Nie';
          break;
        case 'hasEnergylandia':
          value = reservation.hasEnergylandia ? 'Tak' : 'Nie';
          break;
        case 'hasTermy':
          value = reservation.hasTermy ? 'Tak' : 'Nie';
          break;
        case 'qualificationCardStatus':
          value = reservation.qualificationCardStatus === 'approved' ? 'Zatwierdzona' 
            : reservation.qualificationCardStatus === 'rejected' ? 'Odrzucona'
            : reservation.qualificationCardStatus === 'pending' ? 'Oczekuje'
            : '-';
          break;
        case 'contractStatus':
          value = reservation.contractStatus === 'approved' ? 'Zatwierdzona'
            : reservation.contractStatus === 'rejected' ? 'Odrzucona'
            : reservation.contractStatus === 'pending' ? 'Oczekuje'
            : '-';
          break;
        case 'status':
          // Use payment status from database (already mapped to Polish in getPaymentStatusDisplay)
          const statusMapForFilter: Record<string, string> = {
            'unpaid': 'Nieopłacone',
            'partial': 'Częściowo opłacone',
            'paid': 'Opłacone w całości',
            'returned': 'Zwrócone',
          };
          value = statusMapForFilter[reservation.paymentStatus] || reservation.paymentStatus;
          break;
        case 'protectionNames':
          value = reservation.protectionNames || '-';
          break;
        case 'depositAmount':
          value = reservation.depositAmount ? reservation.depositAmount.toFixed(2) : '-';
          break;
      }
      if (value !== null && value !== '') {
        values.add(value);
      }
    });
    return Array.from(values).sort();
  };

  // Update filters in URL
  const updateFiltersInUrl = (filters: Record<string, string[]>) => {
    const params = new URLSearchParams();

    // Add page if > 1
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    }

    // Add filters
    Object.entries(filters).forEach(([columnKey, values]) => {
      if (values.length > 0) {
        params.set(`filter_${columnKey}`, values.join(','));
      }
    });

    const url = params.toString() ? `/admin-panel/payments?${params.toString()}` : '/admin-panel/payments';
    router.replace(url, { scroll: false });
  };

  // Handle filter toggle for a column value
  const handleFilterToggle = (columnKey: string, value: string) => {
    const updated = columnConfig.map(col => {
      if (col.key === columnKey) {
        const filters = col.filters || [];
        const newFilters = filters.includes(value)
          ? filters.filter(f => f !== value)
          : [...filters, value];
        return { ...col, filters: newFilters };
      }
      return col;
    });
    setColumnConfig(updated);
    saveColumnPreferences(updated);

    // Build filters object for URL and API
    const filtersForUrl: Record<string, string[]> = {};
    updated.forEach(col => {
      if (col.filters && col.filters.length > 0) {
        filtersForUrl[col.key] = col.filters;
      }
    });
    updateFiltersInUrl(filtersForUrl);
    
    // Update applied column filters to trigger API refetch
    setAppliedColumnFilters(JSON.stringify(filtersForUrl));

    updatePageInUrl(1);
  };

  // Clear all filters for a column
  const handleClearColumnFilters = (columnKey: string) => {
    const updated = columnConfig.map(col => {
      if (col.key === columnKey) {
        return { ...col, filters: [] };
      }
      return col;
    });
    setColumnConfig(updated);
    saveColumnPreferences(updated);

    const filtersForUrl: Record<string, string[]> = {};
    updated.forEach(col => {
      if (col.filters && col.filters.length > 0) {
        filtersForUrl[col.key] = col.filters;
      }
    });
    updateFiltersInUrl(filtersForUrl);
    
    // Update applied column filters to trigger API refetch
    setAppliedColumnFilters(JSON.stringify(filtersForUrl));
    
    updatePageInUrl(1);
  };

  // Search filter values in backend (debounced)
  const handleFilterSearch = async (query: string, columnKey: string) => {
    // Clear previous timeout
    if (filterSearchTimeoutRef.current) {
      clearTimeout(filterSearchTimeoutRef.current);
    }
    
    setFilterSearchQuery(query);
    
    // If query is empty, clear results
    if (!query.trim()) {
      setFilterSearchResults([]);
      setIsFilterSearching(false);
      return;
    }
    
    // Set searching state
    setIsFilterSearching(true);
    
    // Debounce: wait 500ms after user stops typing
    filterSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await authenticatedApiCall<{ results: string[]; total: number }>(
          `/api/payments/filter-search?column=${encodeURIComponent(columnKey)}&query=${encodeURIComponent(query)}&limit=50`
        );
        setFilterSearchResults(response.results);
      } catch (err) {
        console.error('Filter search error:', err);
        setFilterSearchResults([]);
      } finally {
        setIsFilterSearching(false);
      }
    }, 500);
  };
  
  // Reset filter search when modal closes
  const handleCloseFilterModal = () => {
    setOpenFilterColumn(null);
    setFilterSearchQuery('');
    setFilterSearchResults([]);
    setIsFilterSearching(false);
    setFrozenFilterOptions([]); // Clear frozen options
    if (filterSearchTimeoutRef.current) {
      clearTimeout(filterSearchTimeoutRef.current);
    }
  };
  
  // Open filter modal and freeze options to prevent jumping
  const handleOpenFilterModal = (columnKey: string) => {
    // Freeze current options to prevent modal from "jumping" during data reload
    const currentOptions = getUniqueColumnValues(columnKey);
    setFrozenFilterOptions(currentOptions);
    setOpenFilterColumn(columnKey);
  };
  
  // Get values to display in filter modal (search results or default from current page)
  const getFilterDisplayValues = (columnKey: string): string[] => {
    // Use frozen options to prevent modal from "jumping" during data reload
    const baseOptions = frozenFilterOptions.length > 0 ? frozenFilterOptions : getUniqueColumnValues(columnKey);
    
    // For amount columns with search query, filter locally from frozen/base options
    if (isAmountColumn(columnKey) && filterSearchQuery.trim()) {
      const searchAmount = parseAmountInput(filterSearchQuery);
      if (searchAmount !== null) {
        return baseOptions.filter(value => {
          if (value === '-') return false;
          const valueAmount = parseFloat(value);
          if (isNaN(valueAmount)) return false;
          
          // Exact match (with small tolerance for floating point)
          return Math.abs(valueAmount - searchAmount) < 0.01;
        });
      }
    }
    
    // If user is searching and has results, show search results
    if (filterSearchQuery.trim() && filterSearchResults.length > 0) {
      return filterSearchResults;
    }
    // If searching but no results yet or empty, show nothing during search
    if (filterSearchQuery.trim() && isFilterSearching) {
      return [];
    }
    // Default: return frozen or base options
    return baseOptions;
  };

  // Remove single filter value
  const handleRemoveFilter = (columnKey: string, value: string) => {
    const updated = columnConfig.map(col => {
      if (col.key === columnKey) {
        const filters = col.filters || [];
        return { ...col, filters: filters.filter(f => f !== value) };
      }
      return col;
    });
    setColumnConfig(updated);
    saveColumnPreferences(updated);

    const filtersForUrl: Record<string, string[]> = {};
    updated.forEach(col => {
      if (col.filters && col.filters.length > 0) {
        filtersForUrl[col.key] = col.filters;
      }
    });
    updateFiltersInUrl(filtersForUrl);
    
    // Update applied column filters to trigger API refetch
    setAppliedColumnFilters(JSON.stringify(filtersForUrl));

    updatePageInUrl(1);
  };

  // Check if column has active filters (for Excel-like column filtering)
  const columnHasActiveFilters = (columnKey: string): boolean => {
    const col = columnConfig.find(c => c.key === columnKey);
    return col ? (col.filters?.length || 0) > 0 : false;
  };

  // Handle column modal open
  const handleOpenColumnModal = () => {
    setTempColumnConfig([...columnConfig]);
    setColumnModalOpen(true);
  };

  // State for export loading
  const [isExporting, setIsExporting] = useState(false);

  // Check if any filters or search are active
  const hasActiveFiltersOrSearch = useMemo(() => {
    // Check search filters
    const hasSearch = appliedFilters.search.trim() !== '';
    const hasPaymentStatus = appliedFilters.paymentStatus !== '';
    const hasCampName = appliedFilters.campName.trim() !== '';
    const hasDateFrom = appliedFilters.dateFrom !== '';
    const hasDateTo = appliedFilters.dateTo !== '';
    
    // Check column filters
    const hasColumnFilters = columnConfig.some(col => col.filters && col.filters.length > 0);
    
    return hasSearch || hasPaymentStatus || hasCampName || hasDateFrom || hasDateTo || hasColumnFilters;
  }, [appliedFilters, columnConfig]);

  // Build active filters description for toast
  const getActiveFiltersDescription = (): string => {
    const parts: string[] = [];
    
    if (appliedFilters.search.trim()) {
      parts.push(`wyszukiwanie: "${appliedFilters.search}"`);
    }
    if (appliedFilters.paymentStatus) {
      parts.push(`status: ${appliedFilters.paymentStatus}`);
    }
    if (appliedFilters.campName.trim()) {
      parts.push(`obóz: ${appliedFilters.campName}`);
    }
    if (appliedFilters.dateFrom) {
      parts.push(`od: ${appliedFilters.dateFrom}`);
    }
    if (appliedFilters.dateTo) {
      parts.push(`do: ${appliedFilters.dateTo}`);
    }
    
    // Count column filters
    const columnFiltersCount = columnConfig.filter(col => col.filters && col.filters.length > 0).length;
    if (columnFiltersCount > 0) {
      parts.push(`filtry kolumn: ${columnFiltersCount}`);
    }
    
    return parts.join(', ');
  };

  // Export to Excel (CSV format compatible with Excel)
  const handleExportToExcel = async () => {
    // Get visible columns in order
    const visibleCols = columnConfig.filter(col => col.visible);
    
    if (visibleCols.length === 0) {
      showError('Brak widocznych kolumn do eksportu');
      return;
    }

    // Show toast if filters are active
    if (hasActiveFiltersOrSearch) {
      const filtersDesc = getActiveFiltersDescription();
      showInfo(
        `Eksport zawiera tylko przefiltrowane dane (${filtersDesc})`,
        { title: 'Export z filtrami', duration: 5000 }
      );
    }

    setIsExporting(true);

    try {
      // Build query params - same as fetchPayments but with large limit to get all data
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '50000'); // Large limit to get all filtered data

      // Add search filters
      if (appliedFilters.search.trim()) {
        params.set('search', appliedFilters.search.trim());
      }
      if (appliedFilters.paymentStatus) {
        params.set('payment_status', appliedFilters.paymentStatus);
      }
      if (appliedFilters.campName.trim()) {
        params.set('camp_name', appliedFilters.campName.trim());
      }
      if (appliedFilters.dateFrom) {
        params.set('date_from', appliedFilters.dateFrom);
      }
      if (appliedFilters.dateTo) {
        params.set('date_to', appliedFilters.dateTo);
      }

      // Add column filters
      const statusDisplayToDb: Record<string, string> = {
        'Nieopłacone': 'unpaid',
        'Częściowo opłacone': 'partial',
        'Opłacone w całości': 'paid',
        'Zwrócone': 'returned',
      };

      columnConfig.forEach(col => {
        const filters = col.filters || [];
        if (filters.length > 0) {
          const colKey = col.key;
          if (colKey === 'status') {
            const dbValues = filters.map(f => statusDisplayToDb[f] || f);
            params.set('filter_status', dbValues.join(','));
          } else {
            params.set(`filter_${colKey}`, filters.join(','));
          }
        }
      });

      // Fetch all filtered data from backend
      const response = await authenticatedApiCall<PaginatedPaymentsResponse>(
        `/api/payments/paginated?${params.toString()}`,
      );

      // Map backend data to export format (same logic as in main fetch)
      const exportData = response.items.map((item: BackendReservationWithPayments) => {
        // Build reservation object for export
        const payments = item.payments || [];
        const manualPayments = item.manual_payments || [];
        
        // Calculate payment details
        const allPayments: Array<{ status: string; paid_amount?: number | null; amount: number; created_at: string | null }> = [
          ...payments.map(p => ({ status: p.status, paid_amount: p.paid_amount, amount: p.amount, created_at: p.created_at })),
          ...manualPayments.map(mp => ({ status: 'paid', paid_amount: mp.amount, amount: mp.amount, created_at: mp.created_at })),
        ];
        
        const totalPaid = allPayments
          .filter(p => p.status === 'paid' || p.status === 'completed')
          .reduce((sum, p) => sum + (p.paid_amount || p.amount || 0), 0);
        
        const totalAmount = item.total_price || 0;
        const remainingAmount = Math.max(0, totalAmount - totalPaid);

        // Get sorted payments by date for payment1, payment2, payment3
        const sortedPayments = [...allPayments]
          .filter(p => p.status === 'paid' || p.status === 'completed')
          .sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());

        // Calculate location from property_period and property_city
        const location = item.property_period && item.property_city
          ? `${item.property_period} - ${item.property_city}`
          : item.property_city || item.property_period || '';

        // Calculate transport info
        const transportDeparture = item.departure_type === 'own' 
          ? 'Własny' 
          : item.departure_city || '';
        const transportReturn = item.return_type === 'own' 
          ? 'Własny' 
          : item.return_city || '';

        // Get guardian info from parents_data
        const firstParent = item.parents_data?.[0];
        const guardianName = firstParent 
          ? `${firstParent.firstName || ''} ${firstParent.lastName || ''}`.trim() 
          : '';
        const guardianPhone = firstParent?.phoneNumber || '';
        const guardianEmail = item.invoice_email || '';

        // Check for addons (hasOaza, hasTarcza, etc.) based on selected_protection and selected_addons
        // Get protection names from protectionsMap for hasOaza/hasTarcza
        const selectedProtections = item.selected_protection 
          ? (Array.isArray(item.selected_protection) ? item.selected_protection : [item.selected_protection])
          : [];
        const protectionNamesArr = selectedProtections
          .map(p => protectionsMap.get(typeof p === 'number' ? p : parseInt(String(p)))?.name || '')
          .filter(Boolean);
        const protectionNamesStr = protectionNamesArr.join(', ');
        const protNamesLower = protectionNamesStr.toLowerCase();
        const hasOaza = protNamesLower.includes('oaza');
        const hasTarcza = protNamesLower.includes('tarcza');

        // Check addons for quad, skuter, energylandia, termy
        const selectedAddons = item.selected_addons 
          ? (Array.isArray(item.selected_addons) ? item.selected_addons : [item.selected_addons])
          : [];
        const addonNamesArr = selectedAddons
          .map(a => addonsMap.get(String(a))?.name || '')
          .filter(Boolean);
        const addonNamesLower = addonNamesArr.join(' ').toLowerCase();
        const hasQuad = addonNamesLower.includes('quad');
        const hasSkuter = addonNamesLower.includes('skuter');
        const hasEnergylandia = addonNamesLower.includes('energylandia');
        const hasTermy = addonNamesLower.includes('termy');

        return {
          reservationName: `REZ-${new Date(item.created_at || '').getFullYear()}-${item.id}`,
          participantName: `${item.participant_first_name || ''} ${item.participant_last_name || ''}`.trim(),
          totalAmount,
          paidAmount: totalPaid,
          remainingAmount,
          payment1: sortedPayments[0] ? { amount: sortedPayments[0].paid_amount || sortedPayments[0].amount, date: sortedPayments[0].created_at?.split('T')[0] } : null,
          payment2: sortedPayments[1] ? { amount: sortedPayments[1].paid_amount || sortedPayments[1].amount, date: sortedPayments[1].created_at?.split('T')[0] } : null,
          payment3: sortedPayments[2] ? { amount: sortedPayments[2].paid_amount || sortedPayments[2].amount, date: sortedPayments[2].created_at?.split('T')[0] } : null,
          participantAge: item.participant_age?.toString() || '',
          participantCity: item.participant_city || '',
          guardianName,
          guardianPhone,
          guardianEmail,
          campName: item.camp_name || '',
          location,
          propertyTag: item.property_tag || '',
          promotionName: item.promotion_name || '',
          createdAt: item.created_at || '',
          transportDeparture,
          transportReturn,
          hasOaza,
          hasTarcza,
          hasQuad,
          hasSkuter,
          hasEnergylandia,
          hasTermy,
          qualificationCardStatus: item.qualification_card_status || '',
          contractStatus: item.contract_status || '',
          paymentStatus: item.payment_status || 'unpaid',
          protectionNames: protectionNamesStr,
          depositAmount: item.deposit_amount || 0,
        };
      });

      // Create CSV header
      const headers = visibleCols.map(col => COLUMN_DEFINITIONS[col.key] || col.key);
      
      // Create CSV rows
      const rows = exportData.map(reservation => {
        return visibleCols.map(col => {
          const key = col.key;
          let value = '';
          
          switch (key) {
            case 'reservationName':
              value = reservation.reservationName;
              break;
            case 'participantName':
              value = reservation.participantName;
              break;
            case 'totalAmount':
              value = reservation.totalAmount.toFixed(2);
              break;
            case 'paidAmount':
              value = reservation.paidAmount.toFixed(2);
              break;
            case 'remainingAmount':
              value = reservation.remainingAmount.toFixed(2);
              break;
            case 'payment1Amount':
              value = reservation.payment1?.amount?.toFixed(2) || '';
              break;
            case 'payment1Date':
              value = reservation.payment1?.date || '';
              break;
            case 'payment2Amount':
              value = reservation.payment2?.amount?.toFixed(2) || '';
              break;
            case 'payment2Date':
              value = reservation.payment2?.date || '';
              break;
            case 'payment3Amount':
              value = reservation.payment3?.amount?.toFixed(2) || '';
              break;
            case 'payment3Date':
              value = reservation.payment3?.date || '';
              break;
            case 'participantAge':
              value = reservation.participantAge || '';
              break;
            case 'participantCity':
              value = reservation.participantCity || '';
              break;
            case 'guardianName':
              value = reservation.guardianName || '';
              break;
            case 'guardianPhone':
              value = reservation.guardianPhone || '';
              break;
            case 'guardianEmail':
              value = reservation.guardianEmail || '';
              break;
            case 'campName':
              value = reservation.campName || '';
              break;
            case 'location':
              value = reservation.location || '';
              break;
            case 'propertyTag':
              value = reservation.propertyTag || '';
              break;
            case 'promotionName':
              value = reservation.promotionName || '';
              break;
            case 'createdAt':
              value = new Date(reservation.createdAt).toLocaleDateString('pl-PL');
              break;
            case 'transportDeparture':
              value = reservation.transportDeparture || '';
              break;
            case 'transportReturn':
              value = reservation.transportReturn || '';
              break;
            case 'hasOaza':
              value = reservation.hasOaza ? 'Tak' : 'Nie';
              break;
            case 'hasTarcza':
              value = reservation.hasTarcza ? 'Tak' : 'Nie';
              break;
            case 'hasQuad':
              value = reservation.hasQuad ? 'Tak' : 'Nie';
              break;
            case 'hasSkuter':
              value = reservation.hasSkuter ? 'Tak' : 'Nie';
              break;
            case 'hasEnergylandia':
              value = reservation.hasEnergylandia ? 'Tak' : 'Nie';
              break;
            case 'hasTermy':
              value = reservation.hasTermy ? 'Tak' : 'Nie';
              break;
            case 'qualificationCardStatus':
              value = reservation.qualificationCardStatus === 'approved' ? 'Zatwierdzona' 
                : reservation.qualificationCardStatus === 'rejected' ? 'Odrzucona'
                : reservation.qualificationCardStatus === 'pending' ? 'Oczekuje'
                : '';
              break;
            case 'contractStatus':
              value = reservation.contractStatus === 'approved' ? 'Zatwierdzona'
                : reservation.contractStatus === 'rejected' ? 'Odrzucona'
                : reservation.contractStatus === 'pending' ? 'Oczekuje'
                : '';
              break;
            case 'status':
              // Use payment status from database (mapped to Polish for export)
              const statusMapExport: Record<string, string> = {
                'unpaid': 'Nieopłacone',
                'partial': 'Częściowo opłacone',
                'paid': 'Opłacone w całości',
                'returned': 'Zwrócone',
              };
              value = statusMapExport[reservation.paymentStatus] || reservation.paymentStatus;
              break;
            case 'protectionNames':
              value = reservation.protectionNames || '';
              break;
            case 'depositAmount':
              value = reservation.depositAmount?.toFixed(2) || '';
              break;
            default:
              value = '';
          }
          
          // Escape quotes and wrap in quotes if contains comma, newline or quote
          if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            value = '"' + value.replace(/"/g, '""') + '"';
          }
          
          return value;
        }).join(';'); // Use semicolon for Polish Excel compatibility
      });
      
      // Add BOM for UTF-8 Excel compatibility
      const BOM = '\uFEFF';
      const csvContent = BOM + headers.join(';') + '\n' + rows.join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `platnosci_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccess(`Wyeksportowano ${exportData.length} rekordów do pliku Excel`, { duration: 3000 });
    } catch (error) {
      console.error('Export error:', error);
      showError('Błąd podczas eksportu danych');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle column modal close
  const handleCloseColumnModal = () => {
    setColumnModalOpen(false);
    setTempColumnConfig([...columnConfig]);
  };

  // Handle column toggle
  const handleColumnToggle = (key: string) => {
    setTempColumnConfig(prev => prev.map(col =>
      col.key === key ? { ...col, visible: !col.visible } : col,
    ));
  };

  // Handle save column preferences
  const handleSaveColumnPreferences = () => {
    saveColumnPreferences(tempColumnConfig);
    setColumnModalOpen(false);
  };

  // Handle reset column preferences
  const handleResetColumnPreferences = () => {
    setTempColumnConfig([...DEFAULT_COLUMNS]);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedColumnIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDraggedOverIndex(index);
  };

  const handleDragLeave = () => {
    setDraggedOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedColumnIndex === null) return;

    const newConfig = [...tempColumnConfig];
    const draggedItem = newConfig[draggedColumnIndex];
    newConfig.splice(draggedColumnIndex, 1);
    newConfig.splice(dropIndex, 0, draggedItem);

    setTempColumnConfig(newConfig);
    setDraggedColumnIndex(null);
    setDraggedOverIndex(null);
  };

  // Get ordered visible columns
  const orderedVisibleColumns = useMemo(() => {
    return columnConfig.filter(col => col.visible);
  }, [columnConfig]);

  // State for payment confirmation modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedReservationForPayment, setSelectedReservationForPayment] = useState<ReservationPayment | null>(null);

  // State for refund confirmation modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundFinalModalOpen, setRefundFinalModalOpen] = useState(false);
  const [selectedItemForRefund, setSelectedItemForRefund] = useState<{ reservationId: number; item: PaymentItem } | null>(null);

  // State for manual sync
  const [isSyncing, setIsSyncing] = useState(false);

  // State for invoice generation
  const [selectedItems, setSelectedItems] = useState<Map<number, Set<string>>>(new Map()); // reservationId -> Set of item IDs
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState<number | null>(null); // reservation ID being processed

  // State for protections and addons data
  const [protectionsMap, setProtectionsMap] = useState<Map<number, { name: string; price: number }>>(new Map());
  const [addonsMap, setAddonsMap] = useState<Map<string, { name: string; price: number }>>(new Map());
  const [isProtectionsAndAddonsLoaded, setIsProtectionsAndAddonsLoaded] = useState(false);
  const [reservationInvoices, setReservationInvoices] = useState<Map<number, InvoiceResponse[]>>(new Map()); // reservationId -> invoices
  const [loadingInvoices, setLoadingInvoices] = useState<Set<number>>(new Set()); // reservation IDs being loaded
  const [cancelingInvoice, setCancelingInvoice] = useState<number | null>(null); // invoice ID being canceled
  const [reservationPaymentsHistory, setReservationPaymentsHistory] = useState<Map<number, PaymentResponse[]>>(new Map()); // reservationId -> payments history
  const [bankAccount, setBankAccount] = useState<any>(null);

  // Load protections and addons data
  useEffect(() => {
    const fetchProtectionsAndAddons = async () => {
      try {
        // Fetch protections (public endpoint - use regular fetch)
        try {
          const { getApiBaseUrlRuntime } = await import('@/utils/api-config');
          const apiBaseUrl = getApiBaseUrlRuntime();
          const protectionsResponse = await fetch(`${apiBaseUrl}/api/general-protections/public`);

          if (!protectionsResponse.ok) {
            throw new Error(`HTTP error! status: ${protectionsResponse.status}`);
          }

          const protections = await protectionsResponse.json();
          const protectionsMapData = new Map<number, { name: string; price: number }>();
          if (protections && Array.isArray(protections)) {
            protections.forEach((protection: { id: number; name: string; price: number }) => {
              protectionsMapData.set(protection.id, { name: protection.name, price: protection.price });
            });
          }
          setProtectionsMap(protectionsMapData);
        } catch (err) {
          console.warn('Error fetching protections (using empty map):', err);
          setProtectionsMap(new Map());
        }

        // Fetch addons (requires authentication)
        try {
          const { authenticatedApiCall } = await import('@/utils/api-auth');
          const addonsResponse = await authenticatedApiCall<{ addons: Array<{ id: number; name: string; price: number }>; total: number }>('/api/addons?include_inactive=true');
          const addonsMapData = new Map<string, { name: string; price: number }>();
          if (addonsResponse && addonsResponse.addons && Array.isArray(addonsResponse.addons)) {
            addonsResponse.addons.forEach(addon => {
              addonsMapData.set(addon.id.toString(), { name: addon.name, price: addon.price || 0 });
            });
          }
          setAddonsMap(addonsMapData);
        } catch (err) {
          console.warn('Error fetching addons (using empty map):', err);
          setAddonsMap(new Map());
        }
      } catch (err) {
        console.error('Error in fetchProtectionsAndAddons:', err);
        // Continue with empty maps if fetch fails
        setProtectionsMap(new Map());
        setAddonsMap(new Map());
      } finally {
        // Mark as loaded even if there was an error (empty maps are still "loaded")
        setIsProtectionsAndAddonsLoaded(true);
      }
    };

    fetchProtectionsAndAddons();
  }, []);

  // Load reservations and payments from API with server-side pagination
  // WAIT for protectionsMap and addonsMap to be loaded first
  useEffect(() => {
    // Don't fetch data if protectionsMap and addonsMap are not loaded yet
    if (!isProtectionsAndAddonsLoaded) {
      return;
    }

    const fetchPayments = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log(`Fetching payments page ${currentPage} with filters:`, appliedFilters);

        // Build query params for server-side pagination
        const params = new URLSearchParams();
        params.set('page', currentPage.toString());
        params.set('limit', itemsPerPage.toString());
        
        // Add search filters
        if (appliedFilters.search && appliedFilters.search.trim()) {
          params.set('search', appliedFilters.search.trim());
        }
        if (appliedFilters.paymentStatus) {
          params.set('payment_status', appliedFilters.paymentStatus);
        }
        if (appliedFilters.campName && appliedFilters.campName.trim()) {
          params.set('camp_name', appliedFilters.campName.trim());
        }
        if (appliedFilters.dateFrom) {
          params.set('date_from', appliedFilters.dateFrom);
        }
        if (appliedFilters.dateTo) {
          params.set('date_to', appliedFilters.dateTo);
        }

        // Add column filters from modal (server-side filtering)
        // Map Polish display names to English DB values for status column
        const statusDisplayToDb: Record<string, string> = {
          'Opłacone w całości': 'paid',
          'Częściowo opłacone': 'partial',
          'Nieopłacone': 'unpaid',
          'Zwrócone': 'returned',
        };
        
        // Parse applied column filters from JSON string
        const parsedColumnFilters: Record<string, string[]> = JSON.parse(appliedColumnFilters || '{}');
        
        Object.entries(parsedColumnFilters).forEach(([colKey, filters]) => {
          if (filters && filters.length > 0) {
            if (colKey === 'status') {
              // Map Polish names to English DB values for status
              const dbValues = filters.map(f => statusDisplayToDb[f] || f);
              params.set('filter_status', dbValues.join(','));
            } else {
              params.set(`filter_${colKey}`, filters.join(','));
            }
          }
        });

        // Fetch paginated data from backend (includes payments and manual_payments)
        const response = await authenticatedApiCall<PaginatedPaymentsResponse>(
          `/api/payments/paginated?${params.toString()}`,
        );

        console.log(`Fetched ${response.items.length} reservations (page ${response.pagination.page}/${response.pagination.total_pages})`);
        setServerPagination(response.pagination);
        
        // Save filter options from backend (all unique values for each column)
        if (response.filter_options) {
          setFilterOptions(response.filter_options);
        }

        // Convert backend payments to PaymentResponse format for mapReservationToPaymentFormat
        const convertBackendPayment = (bp: BackendPaymentData): PaymentResponse => ({
          id: bp.id,
          transaction_id: bp.transaction_id || '',
          order_id: bp.order_id || '',
          amount: bp.amount,
          paid_amount: bp.paid_amount,
          description: null,
          status: bp.status,
          payer_email: '',
          payer_name: null,
          channel_id: bp.channel_id,
          payment_url: null,
          title: null,
          created_at: bp.created_at || '',
          paid_at: bp.paid_at || null,
          payment_date: null,
          webhook_received_at: null,
        });

        // Convert backend manual payments to ManualPaymentResponse format
        const convertBackendManualPayment = (bmp: BackendManualPaymentData): ManualPaymentResponse => ({
          id: bmp.id,
          reservation_id: bmp.reservation_id,
          user_id: 0,
          amount: bmp.amount,
          description: bmp.description || null,
          payment_method: bmp.payment_method || null,
          payment_date: bmp.payment_date || '',
          attachment_path: null,
          attachment_filename: null,
          created_at: bmp.created_at || '',
          updated_at: bmp.created_at || '',
          created_by: null,
        });

        // Get unique camp/property pairs for this page only
        const uniqueCampPropertyPairs = new Set<string>(
          response.items
            .filter(r => r.camp_id && r.property_id)
            .map(r => `${r.camp_id}_${r.property_id}`),
        );

        // Cache protections for this page's reservations
        const protectionsCache = new Map<string, Map<number, { name: string; price: number }>>();
        const protectionPromises = Array.from(uniqueCampPropertyPairs).map(async (pair) => {
          const [campId, propertyId] = pair.split('_').map(Number);
          try {
            const turnusProtectionsMap = await fetchTurnusProtectionPrices(campId, propertyId);
            protectionsCache.set(pair, turnusProtectionsMap);
          } catch (err) {
            console.warn(`Could not fetch protections for camp ${campId} property ${propertyId}:`, err);
          }
        });
        await Promise.allSettled(protectionPromises);

        // Map reservations to payment format (only for this page - 10-20 items)
        const mappedReservations = await Promise.all(
          response.items.map(async (reservation) => {
            // Convert backend data to format expected by mapReservationToPaymentFormat
            const reservationData = {
              id: reservation.id,
              camp_id: reservation.camp_id,
              property_id: reservation.property_id,
              status: reservation.status,
              payment_status: reservation.payment_status,  // Payment status from database
              total_price: reservation.total_price,
              deposit_amount: reservation.deposit_amount,
              created_at: reservation.created_at,
              camp_name: reservation.camp_name,
              property_name: reservation.property_name,
              property_city: reservation.property_city,
              property_period: reservation.property_period,
              property_tag: reservation.property_tag,
              property_start_date: reservation.property_start_date,
              property_end_date: reservation.property_end_date,
              participant_first_name: reservation.participant_first_name,
              participant_last_name: reservation.participant_last_name,
              participant_age: reservation.participant_age,
              participant_city: reservation.participant_city,
              parents_data: reservation.parents_data,
              invoice_email: reservation.invoice_email,
              selected_protection: reservation.selected_protection,
              selected_addons: reservation.selected_addons,
              selected_promotion: reservation.selected_promotion,
              promotion_name: reservation.promotion_name,
              departure_type: reservation.departure_type,
              departure_city: reservation.departure_city,
              return_type: reservation.return_type,
              return_city: reservation.return_city,
              contract_status: reservation.contract_status,
              qualification_card_status: reservation.qualification_card_status,
              payment_plan: reservation.payment_plan,
            };

            // Convert payments from backend response
            const paymentsData = reservation.payments.map(convertBackendPayment);
            const manualPaymentsData = reservation.manual_payments.map(convertBackendManualPayment);

            // Empty promotions cache - we already have promotion_name from backend
            const promotionsCache = new Map<string, any[]>();

            return mapReservationToPaymentFormat(
              reservationData,
              paymentsData,
              protectionsMap,
              addonsMap,
              manualPaymentsData,
              promotionsCache,
              protectionsCache,
            );
          }),
        );

        setReservations(mappedReservations);

        // Sync Tpay in background for pending payments (non-blocking)
        const allPendingPayments = response.items.flatMap(r => 
          r.payments.filter(p => p.status === 'pending' && p.transaction_id)
        );
        if (allPendingPayments.length > 0) {
          console.log(`🔄 Synchronizacja ${allPendingPayments.length} płatności z API Tpay w tle...`);
          Promise.allSettled(
            allPendingPayments.map(async (payment) => {
              try {
                await paymentService.syncPaymentStatus(payment.transaction_id!);
                return { success: true };
              } catch {
                return { success: false };
              }
            }),
          ).then((results) => {
            const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any)?.success).length;
            console.log(`✅ Zsynchronizowano ${successful} z ${allPendingPayments.length} płatności w tle`);
          });
        }

      } catch (err) {
        console.error('Error fetching payments data:', err);
        setError(err instanceof Error ? err.message : 'Błąd podczas ładowania danych płatności');
        setReservations([]);
        setServerPagination(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, [isProtectionsAndAddonsLoaded, currentPage, itemsPerPage, appliedFilters, protectionsMap, addonsMap, appliedColumnFilters]);

  // HTTP Polling dla wykrywania zmian w płatnościach (tylko gdy na stronie /admin-panel/payments)
  useEffect(() => {
    // Sprawdź czy jesteśmy na stronie płatności
    if (pathname !== '/admin-panel/payments') {
      return; // Nie polluj gdy nie jesteśmy na stronie płatności
    }

    // Sprawdź czy strona jest widoczna (Page Visibility API)
    const handleVisibilityChange = () => {
      // Strona jest ukryta/widoczna - polling automatycznie się zatrzyma/wznowi
      // przez sprawdzenie document.hidden w pollForChanges
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const POLLING_INTERVAL = 60000; // 60 sekund

    const pollForChanges = async () => {
      // Sprawdź czy strona jest widoczna
      if (document.hidden) {
        return; // Nie polluj gdy strona jest ukryta
      }

      try {
        // Pobierz timestamp ostatniego sprawdzenia z localStorage
        const lastCheckStr = localStorage.getItem('last_payment_check');
        const lastCheck = lastCheckStr
          ? new Date(lastCheckStr)
          : new Date(Date.now() - 24 * 60 * 60 * 1000); // Ostatnie 24h

        const { authenticatedApiCall } = await import('@/utils/api-auth');
        const response = await authenticatedApiCall<{
          has_changes: boolean;
          changed_payments: number;
          changed_manual: number;
          total_changed: number;
          last_update: string | null;
        }>(`/api/payments/changes?since=${lastCheck.toISOString()}`);

        // Sprawdź czy użytkownik już zamknął alert dla tych zmian
        const lastAlertDismissedStr = localStorage.getItem('last_alert_dismissed');
        if (lastAlertDismissedStr) {
          const lastAlertDismissed = new Date(lastAlertDismissedStr);
          const lastUpdate = response.last_update ? new Date(response.last_update) : null;

          // Pokazuj alert tylko jeśli zmiany są nowsze niż ostatnie zamknięcie
          if (lastUpdate && lastUpdate > lastAlertDismissed) {
            setPaymentChangesAlert({
              isVisible: true,
              changedCount: response.total_changed,
            });
          }
        } else if (response.has_changes) {
          // Pierwszy raz - pokaż alert
          setPaymentChangesAlert({
            isVisible: true,
            changedCount: response.total_changed,
          });
        }

        // Zaktualizuj timestamp ostatniego sprawdzenia
        localStorage.setItem('last_payment_check', new Date().toISOString());
      } catch (err) {
        console.error('Błąd podczas sprawdzania zmian w płatnościach:', err);
        // Nie pokazuj błędu użytkownikowi - polling działa w tle
      }
    };

    // Pierwsze sprawdzenie po 30 sekundach (daj czas na synchronizację Tpay)
    const initialTimeout = setTimeout(pollForChanges, 30000);

    // Następne sprawdzenia co 60 sekund
    const intervalId = setInterval(pollForChanges, POLLING_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname]); // Polling tylko gdy pathname się zmienia (przejście na stronę płatności)

  // Filter and sort reservations
  // Helper function to get column value for filtering
  const getColumnValue = (reservation: ReservationPayment, columnKey: string): string | null => {
    switch (columnKey) {
      case 'reservationName':
        return reservation.reservationName;
      case 'participantName':
        return reservation.participantName;
      case 'totalAmount':
        return reservation.paymentDetails.totalAmount.toFixed(2);
      case 'paidAmount':
        return reservation.paymentDetails.paidAmount.toFixed(2);
      case 'remainingAmount':
        return reservation.paymentDetails.remainingAmount.toFixed(2);
      case 'payment1Amount':
        return reservation.payment1?.amount ? reservation.payment1.amount.toFixed(2) : '-';
      case 'payment1Date':
        return reservation.payment1?.date || '-';
      case 'payment2Amount':
        return reservation.payment2?.amount ? reservation.payment2.amount.toFixed(2) : '-';
      case 'payment2Date':
        return reservation.payment2?.date || '-';
      case 'payment3Amount':
        return reservation.payment3?.amount ? reservation.payment3.amount.toFixed(2) : '-';
      case 'payment3Date':
        return reservation.payment3?.date || '-';
      case 'participantAge':
        return reservation.participantAge || '-';
      case 'participantCity':
        return reservation.participantCity || '-';
      case 'guardianName':
        return reservation.guardianName || '-';
      case 'guardianPhone':
        return reservation.guardianPhone || '-';
      case 'guardianEmail':
        return reservation.guardianEmail || '-';
      case 'campName':
        return reservation.campName || '-';
      case 'location':
        return reservation.location || '-';
      case 'propertyTag':
        return reservation.propertyTag || '-';
      case 'promotionName':
        return reservation.promotionName || '-';
      case 'createdAt':
        return new Date(reservation.createdAt).toLocaleDateString('pl-PL');
      case 'transportDeparture':
        return reservation.transportDeparture || '-';
      case 'transportReturn':
        return reservation.transportReturn || '-';
      case 'hasOaza':
        return reservation.hasOaza ? 'Tak' : 'Nie';
      case 'hasTarcza':
        return reservation.hasTarcza ? 'Tak' : 'Nie';
      case 'hasQuad':
        return reservation.hasQuad ? 'Tak' : 'Nie';
      case 'hasSkuter':
        return reservation.hasSkuter ? 'Tak' : 'Nie';
      case 'hasEnergylandia':
        return reservation.hasEnergylandia ? 'Tak' : 'Nie';
      case 'hasTermy':
        return reservation.hasTermy ? 'Tak' : 'Nie';
      case 'qualificationCardStatus':
        return reservation.qualificationCardStatus === 'approved' ? 'Zatwierdzona' 
          : reservation.qualificationCardStatus === 'rejected' ? 'Odrzucona'
          : reservation.qualificationCardStatus === 'pending' ? 'Oczekuje'
          : '-';
      case 'contractStatus':
        return reservation.contractStatus === 'approved' ? 'Zatwierdzona'
          : reservation.contractStatus === 'rejected' ? 'Odrzucona'
          : reservation.contractStatus === 'pending' ? 'Oczekuje'
          : '-';
      case 'status':
        // Use payment status from database (mapped to Polish for display)
        const statusMapCell: Record<string, string> = {
          'unpaid': 'Nieopłacone',
          'partial': 'Częściowo opłacone',
          'paid': 'Opłacone w całości',
          'returned': 'Zwrócone',
        };
        return statusMapCell[reservation.paymentStatus] || reservation.paymentStatus;
      case 'protectionNames':
        return reservation.protectionNames || '-';
      case 'depositAmount':
        return reservation.depositAmount ? reservation.depositAmount.toFixed(2) : '-';
      default:
        return null;
    }
  };

  // Client-side sorting only (filtering is now server-side)
  const filteredReservations = useMemo(() => {
    let filtered = [...reservations];

    // NOTE: Column filters are now server-side (sent as filter_xxx params)
    // NOTE: Search is server-side (appliedFilters)

    // Client-side sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortColumn) {
          case 'createdAt':
            // Sort by date (newest first by default)
            const aDate = new Date(a.createdAt).getTime();
            const bDate = new Date(b.createdAt).getTime();
            return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
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
          case 'payment1Amount':
            aValue = a.payment1?.amount || 0;
            bValue = b.payment1?.amount || 0;
            break;
          case 'payment2Amount':
            aValue = a.payment2?.amount || 0;
            bValue = b.payment2?.amount || 0;
            break;
          case 'payment3Amount':
            aValue = a.payment3?.amount || 0;
            bValue = b.payment3?.amount || 0;
            break;
          default:
            // For string columns, use localeCompare
            const aStr = getColumnValue(a, sortColumn) || '';
            const bStr = getColumnValue(b, sortColumn) || '';
            return sortDirection === 'asc'
              ? aStr.localeCompare(bStr)
              : bStr.localeCompare(aStr);
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
  }, [sortColumn, sortDirection, reservations, columnConfig]);

  // Server-side pagination (data is already paginated from backend)
  const totalPages = serverPagination?.total_pages || 1;
  // No client-side slicing needed - data is already paginated from server
  const paginatedReservations = filteredReservations;

  // Handle page change with URL update (server-side pagination)
  const handlePageChange = (page: number) => {
    const maxPages = serverPagination?.total_pages || 1;
    if (page >= 1 && page <= maxPages) {
      setCurrentPage(page);
      updatePageInUrl(page);
      setPageInputValue('');
    }
  };

  // Handle column sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
    updatePageInUrl(1);
  };

  // Toggle row expansion
  const toggleRowExpansion = async (reservationId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      const isCurrentlyExpanded = newSet.has(reservationId);

      if (isCurrentlyExpanded) {
        newSet.delete(reservationId);
      } else {
        newSet.add(reservationId);
        // Load invoices and payment history when expanding
        loadInvoicesForReservation(reservationId);
        loadPaymentHistoryForReservation(reservationId);
      }
      return newSet;
    });
  };

  // Load invoices for a reservation
  const loadInvoicesForReservation = async (reservationId: number) => {
    // Don't load if already loading or already loaded
    if (loadingInvoices.has(reservationId) || reservationInvoices.has(reservationId)) {
      return;
    }

    try {
      setLoadingInvoices(prev => new Set(prev).add(reservationId));
      const invoicesResponse = await invoiceService.getInvoicesByReservation(reservationId);
      setReservationInvoices(prev => {
        const newMap = new Map(prev);
        newMap.set(reservationId, invoicesResponse.invoices);
        return newMap;
      });
    } catch (error) {
      console.error('Error loading invoices:', error);
      // Set empty array on error
      setReservationInvoices(prev => {
        const newMap = new Map(prev);
        newMap.set(reservationId, []);
        return newMap;
      });
    } finally {
      setLoadingInvoices(prev => {
        const newSet = new Set(prev);
        newSet.delete(reservationId);
        return newSet;
      });
    }
  };

  // Load payment history for a reservation
  const loadPaymentHistoryForReservation = async (reservationId: number) => {
    // Don't load if already loaded
    if (reservationPaymentsHistory.has(reservationId)) {
      return;
    }

    try {
      const allPayments = await paymentService.listPayments(0, 1000);
      // Filter payments for this reservation (order_id format: "RES-{id}" or just "{id}" or "RES-{id}-{timestamp}")
      const reservationPayments = allPayments.filter(p => {
        const orderId = p.order_id || '';
        if (orderId === String(reservationId)) return true;
        if (orderId === `RES-${reservationId}`) return true;
        const match = orderId.match(/^RES-(\d+)(?:-|$)/);
        if (match && parseInt(match[1], 10) === reservationId) return true;
        return false;
      });

      // Sort by payment_date or created_at (newest first)
      const sortedPayments = reservationPayments.sort((a, b) => {
        const dateA = a.payment_date ? new Date(a.payment_date).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
        const dateB = b.payment_date ? new Date(b.payment_date).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
        return dateB - dateA;
      });

      setReservationPaymentsHistory(prev => {
        const newMap = new Map(prev);
        newMap.set(reservationId, sortedPayments);
        return newMap;
      });
    } catch (error) {
      console.error('Error loading payment history:', error);
      setReservationPaymentsHistory(prev => {
        const newMap = new Map(prev);
        newMap.set(reservationId, []);
        return newMap;
      });
    }
  };

  // Cancel invoice
  const handleCancelInvoice = async (invoice: InvoiceResponse, reservationId: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`Czy na pewno chcesz anulować fakturę ${invoice.invoice_number}?`)) {
      return;
    }

    try {
      setCancelingInvoice(invoice.id);
      await invoiceService.cancelInvoice(invoice.id);

      // Remove invoice from the list (or mark as canceled)
      setReservationInvoices(prev => {
        const newMap = new Map(prev);
        const invoices = newMap.get(reservationId) || [];
        const updatedInvoices = invoices.map(inv =>
          inv.id === invoice.id
            ? { ...inv, is_canceled: true, canceled_at: new Date().toISOString() }
            : inv,
        );
        newMap.set(reservationId, updatedInvoices);
        return newMap;
      });

      alert(`Faktura ${invoice.invoice_number} została anulowana.`);
    } catch (error) {
      console.error('Error canceling invoice:', error);
      alert(`Błąd podczas anulowania faktury: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    } finally {
      setCancelingInvoice(null);
    }
  };

  // Toggle item selection for invoice generation
  const toggleItemSelection = (reservationId: number, itemId: string) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev);
      // Create a new Set to ensure React detects the change
      const reservationItems = new Set(newMap.get(reservationId) || []);

      if (reservationItems.has(itemId)) {
        reservationItems.delete(itemId);
      } else {
        reservationItems.add(itemId);
      }

      if (reservationItems.size === 0) {
        newMap.delete(reservationId);
      } else {
        newMap.set(reservationId, reservationItems);
      }

      return newMap;
    });
  };

  // Check if item is selected
  const isItemSelected = (reservationId: number, itemId: string): boolean => {
    const items = selectedItems.get(reservationId);
    return items ? items.has(itemId) : false;
  };

  // Get selected items count for reservation
  const getSelectedItemsCount = (reservationId: number): number => {
    const items = selectedItems.get(reservationId);
    return items ? items.size : 0;
  };

  // Handle invoice generation
  const handleGenerateInvoice = async (reservation: ReservationPayment, e: React.MouseEvent) => {
    e.stopPropagation();

    const selected = selectedItems.get(reservation.id);
    if (!selected || selected.size === 0) {
      alert('Proszę zaznaczyć przynajmniej jeden element płatności do faktury');
      return;
    }

    try {
      setIsGeneratingInvoice(reservation.id);

      // Get buyer tax number if available (from reservation invoice data)
      const buyerTaxNo = undefined; // TODO: Get from reservation if available

      const invoice = await invoiceService.generateInvoice({
        reservation_id: reservation.id,
        selected_items: Array.from(selected),
        buyer_tax_no: buyerTaxNo,
      });

      // Clear selected items for this reservation
      setSelectedItems(prev => {
        const newMap = new Map(prev);
        newMap.delete(reservation.id);
        return newMap;
      });

      // Refresh current page to show new invoice
      const { mappedReservations, pagination } = await fetchCurrentPageData();
      setReservations(mappedReservations);
      setServerPagination(pagination);

      // Download the invoice PDF
      try {
        const blob = await invoiceService.downloadInvoice(invoice.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoice.invoice_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (pdfError) {
        console.error('Error downloading invoice PDF:', pdfError);
        // Still show success message even if PDF download fails
      }

      alert(`Faktura ${invoice.invoice_number} została wygenerowana pomyślnie!`);
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert(`Błąd podczas generowania faktury: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    } finally {
      setIsGeneratingInvoice(null);
    }
  };

  // Toggle payment item status (paid/unpaid, cannot toggle canceled)
  const _togglePaymentItem = (reservationId: number, itemId: string) => {
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
  const _toggleAllPayments = (reservationId: number) => {
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

  // Helper function to fetch current page data (reusable for refresh)
  const fetchCurrentPageData = useCallback(async () => {
    const params = new URLSearchParams();
    params.set('page', currentPage.toString());
    params.set('limit', itemsPerPage.toString());
    
    // Add search filters
    if (appliedFilters.search && appliedFilters.search.trim()) {
      params.set('search', appliedFilters.search.trim());
    }
    if (appliedFilters.paymentStatus) {
      params.set('payment_status', appliedFilters.paymentStatus);
    }
    if (appliedFilters.campName && appliedFilters.campName.trim()) {
      params.set('camp_name', appliedFilters.campName.trim());
    }
    if (appliedFilters.dateFrom) {
      params.set('date_from', appliedFilters.dateFrom);
    }
    if (appliedFilters.dateTo) {
      params.set('date_to', appliedFilters.dateTo);
    }

    const response = await authenticatedApiCall<PaginatedPaymentsResponse>(
      `/api/payments/paginated?${params.toString()}`,
    );

    // Convert backend data for mapping
    const convertBackendPayment = (bp: BackendPaymentData): PaymentResponse => ({
      id: bp.id,
      transaction_id: bp.transaction_id || '',
      order_id: bp.order_id || '',
      amount: bp.amount,
      paid_amount: bp.paid_amount,
      description: null,
      status: bp.status,
      payer_email: '',
      payer_name: null,
      channel_id: bp.channel_id,
      payment_url: null,
      title: null,
      created_at: bp.created_at || '',
      paid_at: bp.paid_at || null,
      payment_date: null,
      webhook_received_at: null,
    });

    const convertBackendManualPayment = (bmp: BackendManualPaymentData): ManualPaymentResponse => ({
      id: bmp.id,
      reservation_id: bmp.reservation_id,
      user_id: 0,
      amount: bmp.amount,
      description: bmp.description || null,
      payment_method: bmp.payment_method || null,
      payment_date: bmp.payment_date || '',
      attachment_path: null,
      attachment_filename: null,
      created_at: bmp.created_at || '',
      updated_at: bmp.created_at || '',
      created_by: null,
    });

    // Get protections for this page
    const uniqueCampPropertyPairs = new Set<string>(
      response.items
        .filter(r => r.camp_id && r.property_id)
        .map(r => `${r.camp_id}_${r.property_id}`),
    );
    const protectionsCache = new Map<string, Map<number, { name: string; price: number }>>();
    await Promise.allSettled(
      Array.from(uniqueCampPropertyPairs).map(async (pair) => {
        const [campId, propertyId] = pair.split('_').map(Number);
        try {
          const turnusProtectionsMap = await fetchTurnusProtectionPrices(campId, propertyId);
          protectionsCache.set(pair, turnusProtectionsMap);
        } catch (err) {
          console.warn(`Could not fetch protections for camp ${campId} property ${propertyId}:`, err);
        }
      }),
    );

    // Map reservations
    const mappedReservations = await Promise.all(
      response.items.map(async (reservation) => {
        const reservationData = {
          id: reservation.id,
          camp_id: reservation.camp_id,
          property_id: reservation.property_id,
          status: reservation.status,
          payment_status: reservation.payment_status,  // Payment status from database
          total_price: reservation.total_price,
          deposit_amount: reservation.deposit_amount,
          created_at: reservation.created_at,
          camp_name: reservation.camp_name,
          property_name: reservation.property_name,
          property_city: reservation.property_city,
          property_period: reservation.property_period,
          property_tag: reservation.property_tag,
          property_start_date: reservation.property_start_date,
          property_end_date: reservation.property_end_date,
          participant_first_name: reservation.participant_first_name,
          participant_last_name: reservation.participant_last_name,
          participant_age: reservation.participant_age,
          participant_city: reservation.participant_city,
          parents_data: reservation.parents_data,
          invoice_email: reservation.invoice_email,
          selected_protection: reservation.selected_protection,
          selected_addons: reservation.selected_addons,
          selected_promotion: reservation.selected_promotion,
          promotion_name: reservation.promotion_name,
          departure_type: reservation.departure_type,
          departure_city: reservation.departure_city,
          return_type: reservation.return_type,
          return_city: reservation.return_city,
          contract_status: reservation.contract_status,
          qualification_card_status: reservation.qualification_card_status,
          payment_plan: reservation.payment_plan,
        };

        const paymentsData = reservation.payments.map(convertBackendPayment);
        const manualPaymentsData = reservation.manual_payments.map(convertBackendManualPayment);
        const promotionsCache = new Map<string, any[]>();

        return mapReservationToPaymentFormat(
          reservationData,
          paymentsData,
          protectionsMap,
          addonsMap,
          manualPaymentsData,
          promotionsCache,
          protectionsCache,
        );
      }),
    );

    return { mappedReservations, pagination: response.pagination };
  }, [currentPage, appliedFilters, protectionsMap, addonsMap]);

  // Funkcja odświeżania danych płatności (uses current page)
  const refreshPaymentsData = async () => {
    try {
      setIsLoading(true);
      const { mappedReservations, pagination } = await fetchCurrentPageData();
      setReservations(mappedReservations);
      setServerPagination(pagination);
      localStorage.setItem('last_payment_check', new Date().toISOString());
    } catch (err) {
      console.error('Błąd odświeżania danych:', err);
    } finally {
      setIsLoading(false);
    }
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

      // Refresh current page data
      const { mappedReservations, pagination } = await fetchCurrentPageData();
      setReservations(mappedReservations);
      setServerPagination(pagination);

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

  // Map English payment status from database to Polish display text
  const getPaymentStatusDisplay = (status: string): string => {
    const statusMap: Record<string, string> = {
      'unpaid': 'Nieopłacone',
      'partial': 'Częściowo opłacone',
      'paid': 'Opłacone w całości',
      'returned': 'Zwrócone',
    };
    return statusMap[status] || status;
  };

  // Format phone number with country code and return WhatsApp link
  const formatPhoneWithWhatsApp = (phone: string | null | undefined) => {
    if (!phone) return { display: '-', whatsappLink: null };
    
    // Remove all non-digit characters
    let cleanPhone = phone.replace(/\D/g, '');
    
    // If starts with 48, it already has country code
    // If 9 digits (Polish mobile), add 48
    if (cleanPhone.length === 9) {
      cleanPhone = '48' + cleanPhone;
    } else if (cleanPhone.startsWith('0048')) {
      cleanPhone = cleanPhone.substring(2);
    } else if (!cleanPhone.startsWith('48') && cleanPhone.length === 11) {
      // Could be with leading 0, remove it
      cleanPhone = '48' + cleanPhone.substring(1);
    }
    
    // Format for display: +48 XXX XXX XXX
    const displayPhone = cleanPhone.length >= 11 
      ? `+${cleanPhone.substring(0, 2)} ${cleanPhone.substring(2, 5)} ${cleanPhone.substring(5, 8)} ${cleanPhone.substring(8)}`
      : `+48 ${phone}`;
    
    // WhatsApp link format: https://wa.me/48XXXXXXXXX
    const whatsappLink = `https://wa.me/${cleanPhone}`;
    
    return { display: displayPhone, whatsappLink };
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

  // Skeleton row component
  const SkeletonRow = ({ columns }: { columns: number }) => (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200" style={{ width: `${60 + Math.random() * 40}%` }}></div>
        </td>
      ))}
    </tr>
  );

  // Loading state - skeleton UI
  if (isLoading) {
    const skeletonColumns = 8; // Number of visible columns in skeleton
    const skeletonRows = 10; // Number of rows to show

    return (
      <div className="min-h-full">
        {/* Skeleton toolbar - Title + Filters in one line - sticky at top */}
        <div className="bg-white shadow-md p-3 sticky top-0 z-20 animate-pulse">
          {/* All in one row skeleton */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Title skeleton */}
            <div className="h-5 bg-gray-300 w-24"></div>
            {/* Search skeleton */}
            <div className="h-8 bg-gray-200 flex-1 min-w-[180px] max-w-[250px]"></div>
            {/* Status skeleton */}
            <div className="h-8 bg-gray-200 w-[140px]"></div>
            {/* Camp skeleton */}
            <div className="h-8 bg-gray-200 w-[120px]"></div>
            {/* Date from skeleton */}
            <div className="h-8 bg-gray-200 w-[140px]"></div>
            {/* Date to skeleton */}
            <div className="h-8 bg-gray-200 w-[140px]"></div>
            {/* Divider */}
            <div className="h-6 w-px bg-gray-300 mx-1 hidden sm:block"></div>
            {/* Buttons skeleton */}
            <div className="h-8 bg-gray-200 w-[80px]"></div>
            <div className="h-8 bg-gray-200 w-[70px]"></div>
            <div className="h-8 bg-gray-200 w-[70px]"></div>
            <div className="h-8 bg-gray-200 w-[80px]"></div>
            
            {/* Results count skeleton - pushed to right */}
            <div className="ml-auto h-3 bg-gray-200 w-48"></div>
          </div>
        </div>

        {/* Skeleton table */}
        <div className="bg-white shadow overflow-hidden flex-1 flex flex-col min-h-0 mt-2">
          <div className="overflow-auto flex-1 payments-table-scroll">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="animate-pulse">
                  {Array.from({ length: skeletonColumns }).map((_, i) => (
                    <th key={i} className="px-4 py-2">
                      <div className="h-4 bg-gray-300" style={{ width: `${50 + Math.random() * 50}%` }}></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.from({ length: skeletonRows }).map((_, i) => (
                  <SkeletonRow key={i} columns={skeletonColumns} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Skeleton pagination */}
        <div className="bg-white border-t border-gray-200 p-3 animate-pulse">
          <div className="flex items-center justify-center gap-2">
            <div className="h-8 bg-gray-200 w-24"></div>
            <div className="h-8 bg-gray-200 w-8"></div>
            <div className="h-8 bg-gray-200 w-8"></div>
            <div className="h-8 bg-gray-200 w-8"></div>
            <div className="h-8 bg-gray-200 w-24"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col">
        {/* Title bar for error state */}
        <div className="bg-white shadow-md p-3 mb-2">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">Płatności</h1>
        </div>
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-red-700 font-semibold">Błąd</p>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors text-sm"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Compact toolbar: Title + Filters + Actions in one line - sticky at top */}
      <div className="bg-slate-800 shadow-md p-3 sticky top-0 z-20">
        {/* All in one row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Title */}
          <h1 className="text-lg font-bold text-white whitespace-nowrap">Płatności</h1>
          {/* General search */}
          <div className="relative flex-1 min-w-[180px] max-w-[250px]">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Szukaj..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-600 focus:ring-2 focus:ring-[#03adf0] focus:border-transparent text-sm bg-slate-700 text-white placeholder:text-slate-400"
            />
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
          
          {/* Payment status */}
          <select
            value={filters.paymentStatus}
            onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
            className="px-3 py-1.5 border border-slate-600 focus:ring-2 focus:ring-[#03adf0] focus:border-transparent text-sm bg-slate-700 text-white min-w-[140px]"
          >
            <option value="">Status...</option>
            <option value="paid">Opłacone</option>
            <option value="partial">Częściowe</option>
            <option value="unpaid">Nieopłacone</option>
          </select>
          
          {/* Camp name */}
          <input
            type="text"
            value={filters.campName}
            onChange={(e) => handleFilterChange('campName', e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Obóz..."
            className="px-3 py-1.5 border border-slate-600 focus:ring-2 focus:ring-[#03adf0] focus:border-transparent text-sm bg-slate-700 text-white placeholder:text-slate-400 min-w-[100px] max-w-[150px]"
          />
          
          {/* Date from */}
          <div className="relative">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="pl-8 pr-2 py-1.5 border border-slate-600 focus:ring-2 focus:ring-[#03adf0] focus:border-transparent text-sm bg-slate-700 text-white w-[140px]"
              title="Data od"
            />
            <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
          
          {/* Date to */}
          <div className="relative">
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="pl-8 pr-2 py-1.5 border border-slate-600 focus:ring-2 focus:ring-[#03adf0] focus:border-transparent text-sm bg-slate-700 text-white w-[140px]"
              title="Data do"
            />
            <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-500 mx-1 hidden sm:block" />

          {/* Search button */}
          <button
            onClick={handleImmediateSearch}
            disabled={isLoading}
            className="px-3 py-1.5 bg-[#03adf0] text-white font-medium hover:bg-[#0288c7] transition-colors text-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            {isLoading ? 'Szukanie...' : 'Szukaj'}
          </button>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-colors text-sm flex items-center gap-1.5"
            >
              <XIcon className="w-3.5 h-3.5" />
              Wyczyść
            </button>
          )}

          {/* Divider */}
          <div className="h-6 w-px bg-slate-500 mx-1 hidden lg:block" />

          {/* Action buttons */}
          <button
            onClick={handleExportToExcel}
            disabled={isExporting}
            className="px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 transition-colors text-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Pobierz Excel"
          >
            {isExporting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            <span className="hidden xl:inline">{isExporting ? 'Eksport...' : 'Excel'}</span>
          </button>
          
          <button
            onClick={handleOpenColumnModal}
            className="px-3 py-1.5 bg-slate-600 text-white hover:bg-slate-500 transition-colors text-sm flex items-center gap-1.5 cursor-pointer"
            title="Wybierz kolumny"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Kolumny</span>
          </button>
          
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3 py-1.5 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-colors text-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zweryfikuj płatności Tpay"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden xl:inline">{isSyncing ? 'Sync...' : 'Weryfikuj'}</span>
          </button>
          
          {/* Results count - pushed to right */}
          <span className="ml-auto text-xs text-slate-300 whitespace-nowrap">Znaleziono: <strong className="text-white">{serverPagination?.total || 0}</strong> | Na stronie: <strong className="text-white">{itemsPerPage}</strong></span>
        </div>
        
        {/* Active column filters - small orange buttons with X to remove */}
        {(() => {
          const activeFilters: { columnKey: string; columnName: string; value: string }[] = [];
          columnConfig.forEach(col => {
            if (col.filters && col.filters.length > 0) {
              const columnName = COLUMN_DEFINITIONS[col.key as keyof typeof COLUMN_DEFINITIONS] || col.key;
              col.filters.forEach(value => {
                activeFilters.push({ columnKey: col.key, columnName, value });
              });
            }
          });
          
          if (activeFilters.length === 0) return null;
          
          return (
            <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-200">
              <span className="text-xs text-gray-500 self-center mr-1">Aktywne filtry:</span>
              {activeFilters.map((filter, idx) => (
                <button
                  key={`${filter.columnKey}-${filter.value}-${idx}`}
                  onClick={() => handleRemoveFilter(filter.columnKey, filter.value)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500 text-white text-xs hover:bg-orange-600 transition-colors group"
                  title={`Usuń filtr: ${filter.columnName} = ${filter.value}`}
                >
                  <span className="font-medium">{filter.columnName}:</span>
                  <span>{filter.value}</span>
                  <XIcon className="w-3 h-3 text-white group-hover:text-orange-100" />
                </button>
              ))}
              {activeFilters.length > 1 && (
                <button
                  onClick={() => {
                    // Clear all column filters
                    const updated = columnConfig.map(col => ({ ...col, filters: [] }));
                    setColumnConfig(updated);
                    saveColumnPreferences(updated);
                    updateFiltersInUrl({});
                    setAppliedColumnFilters('{}');
                    updatePageInUrl(1);
                  }}
                  className="text-xs text-orange-600 hover:text-orange-800 underline ml-2"
                >
                  Wyczyść wszystkie
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Alert o zmianach w płatnościach */}
      {paymentChangesAlert.isVisible && (
        <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Zaktualizowano płatności
              </p>
              <p className="text-sm text-blue-700">
                {paymentChangesAlert.changedCount > 0
                  ? `Znaleziono ${paymentChangesAlert.changedCount} ${paymentChangesAlert.changedCount === 1 ? 'zmienioną płatność' : 'zmienionych płatności'}.`
                  : 'Znaleziono zmiany w płatnościach.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              // Zapisz timestamp zamknięcia alertu
              localStorage.setItem('last_alert_dismissed', new Date().toISOString());
              setPaymentChangesAlert({ isVisible: false, changedCount: 0 });

              // Odśwież dane
              refreshPaymentsData();
            }}
            className="text-blue-600 hover:text-blue-800 transition-colors p-1 hover:bg-blue-100"
            aria-label="Zamknij i odśwież"
            title="Zamknij i odśwież dane"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-white shadow mt-2">
        <div className="overflow-x-auto payments-table-scroll">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-[52px] z-20">
              <tr>
                {orderedVisibleColumns.map((col) => {
                  const columnKey = col.key;
                  const columnLabel = COLUMN_DEFINITIONS[columnKey as keyof typeof COLUMN_DEFINITIONS] || columnKey;
                  const isFilterOpen = openFilterColumn === columnKey;
                  const hasFilters = columnHasActiveFilters(columnKey);

                  return (
                    <th
                      key={columnKey}
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors relative"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex items-center gap-1">
                        <div
                          className="flex items-center gap-1 flex-1"
                          onClick={() => handleSort(columnKey)}
                        >
                          {columnLabel}
                          <SortIcon column={columnKey} />
                        </div>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isFilterOpen) {
                                handleCloseFilterModal();
                              } else {
                                handleOpenFilterModal(columnKey);
                              }
                            }}
                            className={`p-1 hover:bg-gray-200 transition-colors ${
                              hasFilters ? 'text-orange-500' : 'text-gray-400'
                            }`}
                            title="Filtruj"
                          >
                            <Filter className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </th>
                  );
                })}
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
                  const paymentsUrl = currentPage > 1
                    ? `/admin-panel/rezerwacja/${reservation.reservationName}/payments?fromPage=${currentPage}`
                    : `/admin-panel/rezerwacja/${reservation.reservationName}/payments`;

                  return (
                    <Fragment key={reservation.id}>
                      <tr
                        className={`hover:bg-gray-50 transition-all duration-200 ${isExpanded ? 'bg-blue-50' : ''}`}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('button, a, input, select')) return;
                          router.push(paymentsUrl);
                        }}
                        onAuxClick={(e) => {
                          if (e.button !== 1) return;
                          const target = e.target as HTMLElement;
                          if (target.closest('button, a, input, select')) return;
                          e.preventDefault();
                          window.open(paymentsUrl, '_blank', 'noopener,noreferrer');
                        }}
                        onContextMenu={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('button, a, input, select')) return;
                          e.preventDefault();
                          setRowContextMenu({ x: e.clientX, y: e.clientY, url: paymentsUrl });
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {orderedVisibleColumns.map((col) => {
                          const columnKey = col.key;
                          if (columnKey === 'reservationName') {
                            return (
                              <td key={columnKey} className="px-4 py-2">
                                <Link
                                  href={paymentsUrl}
                                  className="flex flex-col text-inherit no-underline hover:underline focus:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="text-sm font-medium text-gray-900">
                                    {reservation.reservationName}
                                  </span>
                                  {(reservation.propertyStartDate || reservation.propertyEndDate || reservation.participantFirstName || reservation.participantLastName) && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      {reservation.propertyStartDate && reservation.propertyEndDate && (
                                        <span>
                                          {formatDate(reservation.propertyStartDate)} - {formatDate(reservation.propertyEndDate)}
                                        </span>
                                      )}
                                      {reservation.participantFirstName && reservation.participantLastName && (
                                        <>
                                          {reservation.propertyStartDate && reservation.propertyEndDate && ' | '}
                                          <span>{reservation.participantFirstName} {reservation.participantLastName}</span>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </Link>
                              </td>
                            );
                          } else if (columnKey === 'createdAt') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-600">
                                  {new Date(reservation.createdAt).toLocaleDateString('pl-PL', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'participantName') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-900">
                                  {reservation.participantName}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'totalAmount') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm font-medium text-gray-900">
                                  {formatCurrency(reservation.paymentDetails.totalAmount)}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'paidAmount') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-green-600 font-medium">
                                  {formatCurrency(reservation.paymentDetails.paidAmount)}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'remainingAmount') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className={`text-sm font-medium ${hasRemaining ? 'text-red-600' : 'text-gray-500'}`}>
                                  {formatCurrency(reservation.paymentDetails.remainingAmount)}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'payment1Amount') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-900">
                                  {reservation.payment1?.amount ? formatCurrency(reservation.payment1.amount) : '-'}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'payment1Date') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-600">
                                  {reservation.payment1?.date ? formatDate(reservation.payment1.date) : '-'}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'payment2Amount') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-900">
                                  {reservation.payment2?.amount ? formatCurrency(reservation.payment2.amount) : '-'}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'payment2Date') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-600">
                                  {reservation.payment2?.date ? formatDate(reservation.payment2.date) : '-'}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'payment3Amount') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-900">
                                  {reservation.payment3?.amount ? formatCurrency(reservation.payment3.amount) : '-'}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'payment3Date') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-600">
                                  {reservation.payment3?.date ? formatDate(reservation.payment3.date) : '-'}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'participantAge') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-900">
                                  {reservation.participantAge || '-'}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'participantCity') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-900">
                                  {reservation.participantCity || '-'}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'guardianName') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-900">
                                  {reservation.guardianName || '-'}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'guardianPhone') {
                            const phoneData = formatPhoneWithWhatsApp(reservation.guardianPhone);
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                {phoneData.whatsappLink ? (
                                  <a 
                                    href={phoneData.whatsappLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-green-600 hover:text-green-800 hover:underline flex items-center gap-1"
                                    title="Otwórz w WhatsApp"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>
                                    {phoneData.display}
                                  </a>
                                ) : (
                                  <span className="text-sm text-gray-900">-</span>
                                )}
                              </td>
                            );
                          } else if (columnKey === 'guardianEmail') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-900">
                                  {reservation.guardianEmail || '-'}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'campName') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-900">
                                  {reservation.campName || '-'}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'location') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-900">
                                  {reservation.location || '-'}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'propertyTag') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-900">
                                  {reservation.propertyTag || '-'}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'promotionName') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-600">
                                  {reservation.promotionName || '-'}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'transportDeparture') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-900">
                                  {reservation.transportDeparture || '-'}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'transportReturn') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-900">
                                  {reservation.transportReturn || '-'}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'hasOaza') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap text-center">
                                {reservation.hasOaza ? (
                                  <Check className="w-5 h-5 text-green-600 mx-auto" />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          } else if (columnKey === 'hasTarcza') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap text-center">
                                {reservation.hasTarcza ? (
                                  <Check className="w-5 h-5 text-green-600 mx-auto" />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          } else if (columnKey === 'hasQuad') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap text-center">
                                {reservation.hasQuad ? (
                                  <Check className="w-5 h-5 text-green-600 mx-auto" />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          } else if (columnKey === 'hasSkuter') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap text-center">
                                {reservation.hasSkuter ? (
                                  <Check className="w-5 h-5 text-green-600 mx-auto" />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          } else if (columnKey === 'hasEnergylandia') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap text-center">
                                {reservation.hasEnergylandia ? (
                                  <Check className="w-5 h-5 text-green-600 mx-auto" />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          } else if (columnKey === 'hasTermy') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap text-center">
                                {reservation.hasTermy ? (
                                  <Check className="w-5 h-5 text-green-600 mx-auto" />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          } else if (columnKey === 'qualificationCardStatus') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                {reservation.qualificationCardStatus === 'approved' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                                    Zatwierdzona
                                  </span>
                                ) : reservation.qualificationCardStatus === 'rejected' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                                    Odrzucona
                                  </span>
                                ) : reservation.qualificationCardStatus === 'pending' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Oczekuje
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          } else if (columnKey === 'contractStatus') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                {reservation.contractStatus === 'approved' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                                    Zatwierdzona
                                  </span>
                                ) : reservation.contractStatus === 'rejected' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                                    Odrzucona
                                  </span>
                                ) : reservation.contractStatus === 'pending' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Oczekuje
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          } else if (columnKey === 'status') {
                            // Use paymentStatus from database instead of calculating dynamically
                            const statusColors: Record<string, string> = {
                              'returned': 'bg-purple-100 text-purple-800',
                              'paid': 'bg-green-100 text-green-800',
                              'partial': 'bg-blue-100 text-blue-800',
                              'unpaid': 'bg-yellow-100 text-yellow-800',
                            };
                            const statusClass = statusColors[reservation.paymentStatus] || 'bg-gray-100 text-gray-800';
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium ${statusClass}`}>
                                  {getPaymentStatusDisplay(reservation.paymentStatus)}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'protectionNames') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-600">
                                  {reservation.protectionNames || '-'}
                                </span>
                              </td>
                            );
                          } else if (columnKey === 'depositAmount') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm font-medium text-gray-900">
                                  {reservation.depositAmount ? formatCurrency(reservation.depositAmount) : '-'}
                                </span>
                              </td>
                            );
                          }
                          return null;
                        })}
                      </tr>
                      {isExpanded && (
                        <tr className="bg-blue-50 animate-slideDown">
                          <td colSpan={orderedVisibleColumns.length} className="px-4 py-4">
                            <div className="space-y-4">
                              {/* Reservation Details Summary - Table Data */}
                              <div className="bg-white p-4 border border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Szczegóły rezerwacji</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Nazwa rezerwacji</p>
                                    <p className="text-sm font-medium text-gray-900">
                                      {reservation.reservationName}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Data utworzenia</p>
                                    <p className="text-sm text-gray-900">
                                      {new Date(reservation.createdAt).toLocaleDateString('pl-PL', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Uczestnik</p>
                                    <p className="text-sm font-medium text-gray-900">
                                      {reservation.participantName}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Status</p>
                                    <div>
                                      {(() => {
                                        const statusColors: Record<string, string> = {
                                          'returned': 'bg-purple-100 text-purple-800',
                                          'paid': 'bg-green-100 text-green-800',
                                          'partial': 'bg-blue-100 text-blue-800',
                                          'unpaid': 'bg-yellow-100 text-yellow-800',
                                        };
                                        const statusClass = statusColors[reservation.paymentStatus] || 'bg-gray-100 text-gray-800';
                                        return (
                                          <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium ${statusClass}`}>
                                            {getPaymentStatusDisplay(reservation.paymentStatus)}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Payment Summary */}
                              <div className="bg-white p-4 border border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Podsumowanie płatności</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                    {reservation.paymentStatus === 'paid' && (
                                      <p className="text-xs text-green-600 mt-1">✓ Płatność w całości</p>
                                    )}
                                    {reservation.paymentStatus === 'partial' && (
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

                                {/* Payment Items */}
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Elementy płatności</h4>
                                  <div className="space-y-2">
                                  {reservation.paymentDetails.items.map((item) => {
                                    const isItemChecked = isItemSelected(reservation.id, item.id);
                                    const isCanceled = item.status === 'canceled';
                                    const isPaid = item.status === 'paid';
                                    const isPartiallyPaid = item.status === 'partially_paid';
                                    const isUnpaid = item.status === 'unpaid';
                                    const isReturned = item.status === 'returned';

                                    return (
                                      <Fragment key={item.id}>
                                        <div
                                          className={`flex items-center justify-between p-3 border ${
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
                                            {/* Checkbox for invoice generation (left side) */}
                                            {!isCanceled && !isReturned && (
                                              <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                  type="checkbox"
                                                  name={`invoice-item-${reservation.id}-${item.id}`}
                                                  id={`invoice-item-${reservation.id}-${item.id}`}
                                                  checked={isItemChecked}
                                                  onChange={(e) => {
                                                    e.stopPropagation();
                                                    toggleItemSelection(reservation.id, item.id);
                                                  }}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                  }}
                                                  className="w-4 h-4 text-[#03adf0] border-gray-300 focus:ring-[#03adf0] cursor-pointer"
                                                  style={{ borderRadius: 0 }}
                                                />
                                              </div>
                                            )}
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
                                                {/* Show payment plan info if installments exist */}
                                                {item.installments && item.installments.length > 0 && (
                                                  <span className="ml-2 text-xs text-gray-500 font-normal">
                                                    ({item.installments.length === 2 ? 'Płatność w dwóch ratach' : item.installments.length === 3 ? 'Płatność w trzech ratach' : 'Pełna płatność'})
                                                  </span>
                                                )}
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
                                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                                                  <XCircle className="w-3 h-3 mr-1" />
                                                  Anulowane
                                                </span>
                                              ) : isReturned ? (
                                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800">
                                                  <RotateCcw className="w-3 h-3 mr-1" />
                                                  Zwrócone
                                                </span>
                                              ) : isPaid ? (
                                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                                                  <Check className="w-3 h-3 mr-1" />
                                                  Opłacone
                                                </span>
                                              ) : isPartiallyPaid ? (
                                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                                                  <Check className="w-3 h-3 mr-1" />
                                                  Częściowo opłacone
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">
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

                                            </div>
                                          </div>
                                        </div>
                                        {/* Installments sub-items - only show if partially_paid and has installments */}
                                        {isPartiallyPaid && item.installments && item.installments.length > 0 && (
                                          <div className="ml-8 mt-2 space-y-1">
                                            {item.installments.map((installment) => {
                                              // Check if this is deposit (number === 0)
                                              const isDeposit = installment.number === 0;

                                              return (
                                                <div
                                                  key={`installment-${installment.number}`}
                                                  className={`flex items-center justify-between p-2 border ${
                                                    installment.paid
                                                      ? 'bg-green-50 border-green-200'
                                                      : 'bg-gray-50 border-gray-200'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2 flex-1">
                                                    {/* No checkbox for installments */}
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                      <div className="w-2 h-2 bg-gray-400"></div>
                                                    </div>
                                                    <div className="flex-1">
                                                      <p className={`text-xs font-medium ${
                                                        installment.paid ? 'text-green-700' : 'text-gray-600'
                                                      }`}>
                                                        {isDeposit ? 'Zaliczka' : `Rata ${installment.number}/${installment.total}`}
                                                      </p>
                                                      {installment.paid && installment.paidDate && (
                                                        <p className="text-xs text-green-600">
                                                          Opłacone: {formatDate(installment.paidDate)}
                                                          {installment.paymentMethod ? ` (${installment.paymentMethod})` : ''}
                                                        </p>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-4">
                                                    <span className={`text-xs font-medium min-w-[60px] text-right ${
                                                      installment.paid ? 'text-green-700' : 'text-gray-600'
                                                    }`}>
                                                      {formatCurrency(installment.amount)}
                                                    </span>
                                                    {installment.paid && (
                                                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                                                        <Check className="w-3 h-3 mr-1" />
                                                        Opłacone
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </Fragment>
                                    );
                                  })}
                                  </div>
                                </div>

                                {/* Invoice Status and Actions */}
                                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                                  {/* Wants Invoice Info */}
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Czy klient chce fakturę</p>
                                      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium ${
                                        reservation.paymentDetails.wantsInvoice
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {reservation.paymentDetails.wantsInvoice ? 'Tak' : 'Nie'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Invoice Status */}
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Status faktury</p>
                                      {reservation.paymentDetails.invoicePaid ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                                          Opłacona
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800">
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
                                    {/* Generate Invoice Button */}
                                    {getSelectedItemsCount(reservation.id) > 0 && (
                                      <button
                                        onClick={(e) => handleGenerateInvoice(reservation, e)}
                                        disabled={isGeneratingInvoice === reservation.id}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-[#03adf0] text-white hover:bg-[#0288c7] disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 text-xs font-medium"
                                        style={{ borderRadius: 0, cursor: isGeneratingInvoice === reservation.id ? 'not-allowed' : 'pointer' }}
                                      >
                                        {isGeneratingInvoice === reservation.id ? (
                                          <>
                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                            Generowanie...
                                          </>
                                        ) : (
                                          <>
                                            <FileText className="w-3 h-3" />
                                            Wystaw fakturę ({getSelectedItemsCount(reservation.id)})
                                          </>
                                        )}
                                      </button>
                                    )}

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

                                {/* Invoices and Payment History Section - Full Width Layout */}
                                <div className="mt-6 pt-4 border-t border-gray-200">
                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Column 1: Invoices */}
                                    <div className="lg:col-span-2">
                                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Faktury dla tej rezerwacji</h4>

                                      {loadingInvoices.has(reservation.id) ? (
                                        <div className="animate-pulse space-y-2">
                                          {/* Skeleton for invoice rows */}
                                          {[1, 2].map((i) => (
                                            <div key={i} className="flex items-center justify-between p-3 border border-gray-200 bg-white">
                                              <div className="flex items-center gap-3 flex-1">
                                                <div className="h-4 bg-gray-200 w-24"></div>
                                                <div className="h-4 bg-gray-200 w-20"></div>
                                                <div className="h-4 bg-gray-200 w-16"></div>
                                              </div>
                                              <div className="flex gap-2">
                                                <div className="h-8 bg-gray-200 w-8"></div>
                                                <div className="h-8 bg-gray-200 w-8"></div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        (() => {
                                          const invoices = reservationInvoices.get(reservation.id) || [];

                                          if (invoices.length === 0) {
                                            return (
                                              <div className="bg-gray-50 p-4 text-center">
                                                <p className="text-sm text-gray-500">Brak faktur dla tej rezerwacji</p>
                                              </div>
                                            );
                                          }

                                          return (
                                            <div className="space-y-2">
                                              {invoices.map((invoice) => (
                                                <div
                                                  key={invoice.id}
                                                  className={`flex items-center justify-between p-3 border ${
                                                    invoice.is_canceled
                                                      ? 'bg-red-50 border-red-200'
                                                      : invoice.is_paid
                                                      ? 'bg-green-50 border-green-200'
                                                      : 'bg-white border-gray-200'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-3 flex-1">
                                                    <FileText className={`w-4 h-4 ${
                                                      invoice.is_canceled ? 'text-red-600' :
                                                      invoice.is_paid ? 'text-green-600' :
                                                      'text-gray-600'
                                                    }`} />
                                                    <div className="flex-1">
                                                      <p className={`text-sm font-medium ${
                                                        invoice.is_canceled ? 'text-red-700 line-through' : 'text-gray-900'
                                                      }`}>
                                                        {invoice.invoice_number}
                                                      </p>
                                                      <p className="text-xs text-gray-500">
                                                        {formatDate(invoice.issue_date)} • {formatCurrency(invoice.total_amount)}
                                                        {invoice.is_canceled && invoice.canceled_at && (
                                                          <span className="text-red-600 ml-2">
                                                            • Anulowana: {formatDate(invoice.canceled_at)}
                                                          </span>
                                                        )}
                                                      </p>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    {invoice.is_canceled ? (
                                                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                                                        <XCircle className="w-3 h-3 mr-1" />
                                                        Anulowana
                                                      </span>
                                                    ) : invoice.is_paid ? (
                                                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                                                        <Check className="w-3 h-3 mr-1" />
                                                        Opłacona
                                                      </span>
                                                    ) : (
                                                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        Nieopłacona
                                                      </span>
                                                    )}

                                                    {!invoice.is_canceled && (
                                                      <>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(invoiceService.getInvoicePdfUrl(invoice.id), '_blank');
                                                          }}
                                                          className="p-1.5 text-[#03adf0] hover:bg-blue-50 transition-all duration-200"
                                                          title="Pobierz fakturę"
                                                          style={{ borderRadius: 0, cursor: 'pointer' }}
                                                        >
                                                          <Download className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                          onClick={(e) => handleCancelInvoice(invoice, reservation.id, e)}
                                                          disabled={cancelingInvoice === invoice.id}
                                                          className="p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                                          title="Anuluj fakturę"
                                                          style={{ borderRadius: 0, cursor: cancelingInvoice === invoice.id ? 'not-allowed' : 'pointer' }}
                                                        >
                                                          {cancelingInvoice === invoice.id ? (
                                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                                          ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                          )}
                                                        </button>
                                                      </>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          );
                                        })()
                                      )}
                                    </div>

                                    {/* Column 2: Payment History */}
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Historia wpłat</h4>

                                      {(() => {
                                        const payments = reservationPaymentsHistory.get(reservation.id) || [];
                                        const successfulPayments = payments.filter(p =>
                                          p.status === 'success' || (p.status === 'pending' && p.amount && p.amount > 0),
                                        );

                                        if (successfulPayments.length === 0) {
                                          return (
                                            <div className="bg-gray-50 p-4 text-center">
                                              <p className="text-sm text-gray-500">Brak wpłat dla tej rezerwacji</p>
                                            </div>
                                          );
                                        }

                                        return (
                                          <div className="space-y-2">
                                            {successfulPayments.map((payment) => {
                                              const paymentDate = payment.payment_date
                                                ? formatDate(payment.payment_date)
                                                : (payment.paid_at
                                                    ? formatDate(payment.paid_at)
                                                    : (payment.created_at
                                                        ? formatDate(payment.created_at)
                                                        : 'Brak daty'));
                                              const paymentAmount = payment.paid_amount || payment.amount || 0;
                                              const paymentMethod = payment.channel_id === 64 ? 'BLIK' :
                                                                    payment.channel_id === 53 ? 'Karta' : 'Online';

                                              return (
                                                <div
                                                  key={payment.id}
                                                  className="flex items-center justify-between p-3 border bg-white border-gray-200"
                                                >
                                                  <div className="flex items-center gap-3 flex-1">
                                                    <CreditCard className="w-4 h-4 text-gray-600" />
                                                    <div className="flex-1">
                                                      <p className="text-sm font-medium text-gray-900">
                                                        {formatCurrency(paymentAmount)}
                                                      </p>
                                                      <p className="text-xs text-gray-500">
                                                        {paymentDate} • {paymentMethod}
                                                      </p>
                                                      {payment.transaction_id && (
                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                          ID: {payment.transaction_id}
                                                        </p>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    {payment.status === 'success' ? (
                                                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                                                        <Check className="w-3 h-3 mr-1" />
                                                        Zrealizowana
                                                      </span>
                                                    ) : (
                                                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        Oczekująca
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        );
                                      })()}

                                      {/* Bank Account Details Section */}
                                      {bankAccount && (
                                        <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400">
                                          <h6 className="text-sm font-semibold text-gray-900 mb-3">
                                            Dane do przelewu tradycyjnego
                                          </h6>
                                          <div className="space-y-1.5 text-xs sm:text-sm">
                                            <div>
                                              <span className="font-medium text-gray-700">Odbiorca:</span>
                                              <span className="ml-2 text-gray-900">{bankAccount.account_holder}</span>
                                            </div>
                                            <div>
                                              <span className="font-medium text-gray-700">Numer konta:</span>
                                              <span className="ml-2 text-gray-900 font-mono">{bankAccount.account_number}</span>
                                            </div>
                                            {bankAccount.bank_name && (
                                              <div>
                                                <span className="font-medium text-gray-700">Bank:</span>
                                                <span className="ml-2 text-gray-900">{bankAccount.bank_name}</span>
                                              </div>
                                            )}
                                            {bankAccount.address && (
                                              <div>
                                                <span className="font-medium text-gray-700">Adres:</span>
                                                <span className="ml-2 text-gray-900">{bankAccount.address}</span>
                                              </div>
                                            )}
                                            {bankAccount.transfer_title_template && (
                                              <div className="pt-2 border-t border-gray-200">
                                                <span className="font-medium text-gray-700">Tytuł przelewu:</span>
                                                <p className="mt-1 text-gray-900 italic">{bankAccount.transfer_title_template}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
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
                  <td colSpan={orderedVisibleColumns.length} className="px-4 py-8 text-center text-sm text-gray-500">
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
            <div className="text-sm text-gray-700">
              Wyświetlanie {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, serverPagination?.total || 0)} z {serverPagination?.total || 0} płatności
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  style={{ borderRadius: 0 }}
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
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 text-sm font-medium transition-all duration-200 ${
                          currentPage === page
                            ? 'bg-[#03adf0] text-white border border-[#03adf0]'
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
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  style={{ borderRadius: 0 }}
                >
                  Następna
                </button>
              </div>
              {/* Page input field */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={pageInputValue}
                  onChange={handlePageInputChange}
                  onKeyDown={handlePageInputKeyDown}
                  placeholder={`1-${totalPages}`}
                  className="w-16 px-2 py-1 text-xs border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#03adf0] transition-all duration-200 text-center"
                  style={{ borderRadius: 0 }}
                />
                <span className="text-xs text-gray-500">(Enter)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <UniversalModal
        isOpen={!!openFilterColumn}
        onClose={handleCloseFilterModal}
        title={`Filtruj ${openFilterColumn ? (COLUMN_DEFINITIONS[openFilterColumn as keyof typeof COLUMN_DEFINITIONS] || openFilterColumn) : ''}`}
        maxWidth="md"
      >
        {openFilterColumn && (
          <div className="p-4 sm:p-6">
            {/* Header with clear button */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-medium text-gray-900">
                Wybierz wartości do filtrowania
              </span>
              {columnHasActiveFilters(openFilterColumn) && (
                <button
                  onClick={() => handleClearColumnFilters(openFilterColumn)}
                  className="text-xs text-[#03adf0] hover:text-[#0288c7]"
                >
                  Wyczyść
                </button>
              )}
            </div>
            
            {/* Search input */}
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filterSearchQuery}
                  onChange={(e) => {
                    // For amount columns, don't call backend search - filter locally
                    if (openFilterColumn && isAmountColumn(openFilterColumn)) {
                      setFilterSearchQuery(e.target.value);
                    } else {
                      handleFilterSearch(e.target.value, openFilterColumn);
                    }
                  }}
                  placeholder={openFilterColumn && isAmountColumn(openFilterColumn) 
                    ? "Wpisz kwotę (np. 100 lub 100,50)..." 
                    : "Szukaj w bazie..."}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                  style={{ borderRadius: 0 }}
                />
                {filterSearchQuery && (
                  <button
                    onClick={() => {
                      setFilterSearchQuery('');
                      setFilterSearchResults([]);
                      setIsFilterSearching(false);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              {filterSearchQuery && (
                <p className="mt-1 text-xs text-gray-500">
                  {openFilterColumn && isAmountColumn(openFilterColumn) 
                    ? `Znaleziono: ${getFilterDisplayValues(openFilterColumn).length} wyników`
                    : (isFilterSearching ? 'Szukam...' : `Znaleziono: ${filterSearchResults.length} wyników`)
                  }
                </p>
              )}
            </div>
            
            {/* Values list - fixed height container */}
            <div className="border border-gray-200" style={{ borderRadius: 0 }}>
              <div className="h-[320px] overflow-y-auto">
                {/* Skeleton loader during search */}
                {isFilterSearching ? (
                  <div className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2">
                        <div className="w-4 h-4 bg-gray-200"></div>
                        <div className="h-4 bg-gray-200 flex-1" style={{ width: `${60 + Math.random() * 30}%` }}></div>
                      </div>
                    ))}
                  </div>
                ) : getFilterDisplayValues(openFilterColumn).length > 0 ? (
                  getFilterDisplayValues(openFilterColumn).map((value) => {
                    const columnFilters = columnConfig.find(c => c.key === openFilterColumn)?.filters || [];
                    const isSelected = columnFilters.includes(value);
                    return (
                      <label
                        key={value}
                        className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-orange-50' : ''
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleFilterToggle(openFilterColumn, value)}
                            className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500 accent-orange-500"
                            style={{ borderRadius: 0, cursor: 'pointer' }}
                          />
                        </div>
                        <span className="text-xs sm:text-sm text-gray-900 flex-1 truncate" title={value}>
                          {value}
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <div className="px-3 py-6 text-xs text-gray-500 text-center">
                    {filterSearchQuery ? 'Brak wyników dla podanej frazy' : 'Brak danych'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </UniversalModal>

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isOpen={paymentModalOpen}
        reservationName={selectedReservationForPayment ? selectedReservationForPayment.reservationName : ''}
        participantName={selectedReservationForPayment ? selectedReservationForPayment.participantName : ''}
        totalAmount={selectedReservationForPayment && selectedReservationForPayment.paymentDetails ? selectedReservationForPayment.paymentDetails.totalAmount : 0}
        onConfirm={handlePaymentConfirm}
        onCancel={() => {
          setPaymentModalOpen(false);
          setSelectedReservationForPayment(null);
        }}
      />

      {/* Refund Confirmation Modal (First - Request Refund) */}
      <RefundConfirmationModal
        isOpen={refundModalOpen}
        itemName={selectedItemForRefund && selectedItemForRefund.item ? selectedItemForRefund.item.name : ''}
        amount={selectedItemForRefund && selectedItemForRefund.item ? selectedItemForRefund.item.amount : 0}
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
        itemName={selectedItemForRefund && selectedItemForRefund.item ? selectedItemForRefund.item.name : ''}
        amount={selectedItemForRefund && selectedItemForRefund.item ? selectedItemForRefund.item.amount : 0}
        isFinalConfirmation={true}
        onConfirm={handleRefundFinalConfirm}
        onCancel={() => {
          setRefundFinalModalOpen(false);
          setSelectedItemForRefund(null);
        }}
      />

      {/* Column Selection Modal */}
      <UniversalModal
        isOpen={columnModalOpen}
        onClose={handleCloseColumnModal}
        title="Wybierz kolumny"
        maxWidth="md"
      >
        <div className="p-4 sm:p-6">
          {/* Header with hint */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs sm:text-sm font-medium text-gray-900">
              Wybierz i przeciągnij aby zmienić kolejność
            </span>
            <button
              onClick={handleResetColumnPreferences}
              className="text-xs text-[#03adf0] hover:text-[#0288c7]"
            >
              Resetuj
            </button>
          </div>
          
          {/* Columns list - fixed height container */}
          <div className="border border-gray-200" style={{ borderRadius: 0 }}>
            <div className="h-[320px] overflow-y-auto">
              {tempColumnConfig.map((col, index) => (
                <div
                  key={col.key}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-move transition-colors ${
                    draggedOverIndex === index ? 'bg-blue-50' : ''
                  } ${draggedColumnIndex === index ? 'opacity-50' : ''} ${col.visible ? 'bg-blue-50' : ''}`}
                  style={{ cursor: 'grab' }}
                >
                  <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="checkbox"
                    checked={col.visible}
                    onChange={() => handleColumnToggle(col.key)}
                    className="w-4 h-4 text-[#03adf0] border-gray-300 focus:ring-[#03adf0]"
                    style={{ borderRadius: 0, cursor: 'pointer' }}
                  />
                  <span className="text-xs sm:text-sm text-gray-900 flex-1 truncate" title={COLUMN_DEFINITIONS[col.key as keyof typeof COLUMN_DEFINITIONS] || col.key}>
                    {COLUMN_DEFINITIONS[col.key as keyof typeof COLUMN_DEFINITIONS] || col.key}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Footer with buttons */}
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleCloseColumnModal}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              style={{ borderRadius: 0 }}
            >
              Anuluj
            </button>
            <button
              onClick={handleSaveColumnPreferences}
              className="px-4 py-2 text-sm text-white bg-[#03adf0] hover:bg-[#0288c7] transition-colors"
              style={{ borderRadius: 0 }}
            >
              Zapisz
            </button>
          </div>
        </div>
      </UniversalModal>

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

        /* Always visible horizontal scrollbar for payments table */
        .payments-table-scroll {
          overflow-x: scroll !important;
        }
        
        .payments-table-scroll::-webkit-scrollbar {
          height: 12px;
          background-color: #f1f1f1;
        }
        
        .payments-table-scroll::-webkit-scrollbar-track {
          background-color: #f1f1f1;
          border-radius: 0;
        }
        
        .payments-table-scroll::-webkit-scrollbar-thumb {
          background-color: #c1c1c1;
          border-radius: 6px;
          border: 2px solid #f1f1f1;
        }
        
        .payments-table-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #a1a1a1;
        }
      `}</style>
      {rowContextMenu && (
        <div
          ref={rowContextMenuRef}
          className="fixed z-[100] min-w-[180px] py-1 bg-white border border-gray-200 rounded shadow-lg"
          style={{ left: rowContextMenu.x, top: rowContextMenu.y }}
        >
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => {
              window.open(rowContextMenu.url, '_blank', 'noopener,noreferrer');
              setRowContextMenu(null);
            }}
          >
            Otwórz w nowej karcie
          </button>
        </div>
      )}
    </div>
  );
}