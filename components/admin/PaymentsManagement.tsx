'use client';

import { Search, ChevronUp, ChevronDown, Check, CreditCard, FileText, Building2, Shield, Utensils, Plus, AlertCircle, Download, XCircle, RotateCcw, RefreshCw, Trash2, Columns, GripVertical, Filter, X as XIcon, Info } from 'lucide-react';
import { useState, useMemo, useEffect, Fragment } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

import { invoiceService, InvoiceResponse } from '@/lib/services/InvoiceService';
import { paymentService, PaymentResponse } from '@/lib/services/PaymentService';
import { manualPaymentService, ManualPaymentResponse } from '@/lib/services/ManualPaymentService';
import { reservationService } from '@/lib/services/ReservationService';
import { getApiBaseUrlRuntime } from '@/utils/api-config';

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
    mp => mp.reservation_id === reservation.id
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

  // Fetch promotion details from cache (zamiast wywołania API)
  let promotionName: string | null = null;
  if (reservation.selected_promotion && reservation.camp_id && reservation.property_id) {
    const cacheKey = `${reservation.camp_id}_${reservation.property_id}`;
    const turnusPromotions = promotionsCache.get(cacheKey);
    
    if (turnusPromotions) {
      try {
        const relationId = typeof reservation.selected_promotion === 'number' 
          ? reservation.selected_promotion 
          : parseInt(String(reservation.selected_promotion));
        if (!isNaN(relationId)) {
          const foundPromotion = turnusPromotions.find(
            (p: any) => p.relation_id === relationId || p.id === relationId
          );
          if (foundPromotion && foundPromotion.general_promotion_id) {
            try {
              const { authenticatedApiCall } = await import('@/utils/api-auth');
              const generalPromotion = await authenticatedApiCall<any>(
                `/api/general-promotions/${foundPromotion.general_promotion_id}`
              );
              promotionName = generalPromotion.name || null;
            } catch (err) {
              console.warn('Could not fetch general promotion:', err);
              promotionName = foundPromotion.name || null;
            }
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
  const [reservations, setReservations] = useState<ReservationPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Initialize currentPage from URL params or default to 1
  const pageFromUrl = searchParams.get('page');
  const [currentPage, setCurrentPage] = useState(pageFromUrl ? parseInt(pageFromUrl, 10) : 1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pageInputValue, setPageInputValue] = useState('');
  
  // State dla alertu o zmianach w płatnościach
  const [paymentChangesAlert, setPaymentChangesAlert] = useState<{
    isVisible: boolean;
    changedCount: number;
  }>({
    isVisible: false,
    changedCount: 0,
  });
  
  // Sync currentPage with URL params on mount and when searchParams change
  useEffect(() => {
    const pageParam = searchParams.get('page');
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
    const params = new URLSearchParams(searchParams.toString());
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
  
  // Handle Enter key in page input
  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (pageInputValue === '') return;
      const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
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
  type ColumnConfig = {
    key: string;
    visible: boolean;
    filters?: string[]; // Selected filter values for this column
  };
  
  // Column definitions with labels
  const COLUMN_DEFINITIONS = {
    reservationName: 'Numer rezerwacji',
    createdAt: 'Data utworzenia',
    participantName: 'Uczestnik',
    totalAmount: 'Kwota całkowita',
    paidAmount: 'Całkowite wpływy',
    remainingAmount: 'Pozostało do zapłaty',
    promotionName: 'Promocja',
    protectionNames: 'Ochrona',
    depositAmount: 'Zaliczka',
    status: 'Status',
  };
  
  // Default column order and visibility
  const DEFAULT_COLUMN_ORDER = ['reservationName', 'createdAt', 'participantName', 'totalAmount', 'paidAmount', 'remainingAmount', 'promotionName', 'protectionNames', 'depositAmount', 'status'];
  const DEFAULT_COLUMNS = DEFAULT_COLUMN_ORDER.map(key => ({ key, visible: true }));
  
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [tempColumnConfig, setTempColumnConfig] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  
  // Filter dropdown state: which column has filter dropdown open
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  
  // Load column configuration from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
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
      console.error('Error loading column preferences:', err);
    }
  }, []);
  
  // Load filters from URL on mount
  useEffect(() => {
    const filtersFromUrl: Record<string, string[]> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith('filter_')) {
        const columnKey = key.replace('filter_', '');
        filtersFromUrl[columnKey] = value.split(',').filter(v => v);
      }
    });
    
    if (Object.keys(filtersFromUrl).length > 0) {
      setColumnConfig(prev => {
        const hasFilters = prev.some(col => col.filters && col.filters.length > 0);
        if (hasFilters) return prev; // Don't overwrite if already has filters
        
        return prev.map(col => {
          if (filtersFromUrl[col.key]) {
            return { ...col, filters: filtersFromUrl[col.key] };
          }
          return col;
        });
      });
    }
  }, []);
  
  // Save column configuration to localStorage
  const saveColumnPreferences = (config: ColumnConfig[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setColumnConfig([...config]);
    } catch (err) {
      console.error('Error saving column preferences:', err);
    }
  };
  
  // Get unique values for a column from all reservations
  const getUniqueColumnValues = (columnKey: string): string[] => {
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
        case 'promotionName':
          value = reservation.promotionName || '-';
          break;
        case 'protectionNames':
          value = reservation.protectionNames || '-';
          break;
        case 'depositAmount':
          value = reservation.depositAmount ? reservation.depositAmount.toFixed(2) : '-';
          break;
        case 'status':
          value = reservation.status;
          break;
        case 'createdAt':
          value = new Date(reservation.createdAt).toLocaleDateString('pl-PL');
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
    
    const filtersForUrl: Record<string, string[]> = {};
    updated.forEach(col => {
      if (col.filters && col.filters.length > 0) {
        filtersForUrl[col.key] = col.filters;
      }
    });
    updateFiltersInUrl(filtersForUrl);
    
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
    
    updatePageInUrl(1);
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
    
    updatePageInUrl(1);
  };
  
  // Check if column has active filters
  const hasActiveFilters = (columnKey: string): boolean => {
    const col = columnConfig.find(c => c.key === columnKey);
    return col ? (col.filters?.length || 0) > 0 : false;
  };
  
  // Handle column modal open
  const handleOpenColumnModal = () => {
    setTempColumnConfig([...columnConfig]);
    setColumnModalOpen(true);
  };
  
  // Handle column modal close
  const handleCloseColumnModal = () => {
    setColumnModalOpen(false);
    setTempColumnConfig([...columnConfig]);
  };
  
  // Handle column toggle
  const handleColumnToggle = (key: string) => {
    setTempColumnConfig(prev => prev.map(col => 
      col.key === key ? { ...col, visible: !col.visible } : col
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
  
  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openFilterColumn && !(event.target as Element).closest('th')) {
        setOpenFilterColumn(null);
      }
    };
    if (openFilterColumn) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openFilterColumn]);

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

  // Load reservations and payments from API
  // WAIT for protectionsMap and addonsMap to be loaded first
  useEffect(() => {
    // Don't fetch data if protectionsMap and addonsMap are not loaded yet
    if (!isProtectionsAndAddonsLoaded) {
      return;
    }

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

        // Automatyczna synchronizacja statusu płatności w tle (nie blokuje ładowania)
        // Webhook nie działa w środowisku lokalnym (localhost), więc synchronizujemy ręcznie
        const pendingPayments = paymentsData.filter(p => p.status === 'pending' && p.transaction_id);
        
        if (pendingPayments.length > 0) {
          console.log(`🔄 Synchronizacja ${pendingPayments.length} płatności z API Tpay (sandbox) w tle...`);
          
          // Uruchom synchronizację w tle - NIE CZEKAJ na wynik
          Promise.allSettled(
            pendingPayments.map(async (payment) => {
              try {
                console.log(`Synchronizacja płatności ${payment.transaction_id}...`);
                const syncedPayment = await paymentService.syncPaymentStatus(payment.transaction_id);
                // Zaktualizuj płatność w tablicy (opcjonalnie - dla przyszłego użycia)
                const index = paymentsData.findIndex(p => p.id === payment.id);
                if (index !== -1) {
                  paymentsData[index] = syncedPayment;
                }
                console.log(`✅ Zsynchronizowano płatność ${payment.transaction_id} - status: ${syncedPayment.status}`);
                return { success: true, payment: syncedPayment };
              } catch (err) {
                console.warn(`⚠️ Nie można zsynchronizować płatności ${payment.transaction_id}:`, err);
                return { success: false, payment: null };
              }
            })
          ).then((results) => {
            // Logowanie wyników (opcjonalnie)
            const successful = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
            console.log(`✅ Zsynchronizowano ${successful} z ${pendingPayments.length} płatności w tle`);
          });
          // ⚠️ NIE MA AWAIT - synchronizacja działa w tle, nie blokuje ładowania
        }

        console.log(`Fetched ${reservationsData.length} reservations and ${paymentsData.length} payments`);

        // Pobierz wszystkie płatności manualne raz (zamiast 144 wywołań API)
        let allManualPayments: ManualPaymentResponse[] = [];
        try {
          allManualPayments = await manualPaymentService.getAll(0, 1000);
          console.log(`Fetched ${allManualPayments.length} manual payments`);
        } catch (err) {
          console.warn('Warning: Could not fetch all manual payments, continuing with empty array:', err);
          // Continue with empty array - reservations will still work
        }

        // Pobierz unikalne kombinacje camp_id + property_id dla cache promocji i ochron
        const uniqueCampPropertyPairs = new Set<string>(
          reservationsData
            .filter(r => r.camp_id && r.property_id)
            .map(r => `${r.camp_id}_${r.property_id}`)
        );

        // Cache dla promocji (pobierz tylko unikalne kombinacje) - równolegle
        const promotionsCache = new Map<string, any[]>();
        const promotionPromises = Array.from(uniqueCampPropertyPairs).map(async (pair) => {
          const [campId, propertyId] = pair.split('_').map(Number);
          try {
            const { authenticatedApiCall } = await import('@/utils/api-auth');
            const turnusPromotions = await authenticatedApiCall<any[]>(
              `/api/camps/${campId}/properties/${propertyId}/promotions`
            );
            promotionsCache.set(pair, turnusPromotions);
          } catch (err) {
            console.warn(`Could not fetch promotions for camp ${campId} property ${propertyId}:`, err);
          }
        });
        await Promise.allSettled(promotionPromises);
        console.log(`Cached promotions for ${promotionsCache.size} unique camp/property combinations`);

        // Cache dla ochron (pobierz tylko unikalne kombinacje) - równolegle
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
        console.log(`Cached protections for ${protectionsCache.size} unique camp/property combinations`);

        // Map reservations to payment format (use cached data)
        const mappedReservations = await Promise.all(
          reservationsData.map(reservation =>
            mapReservationToPaymentFormat(
              reservation, 
              paymentsData, 
              protectionsMap, 
              addonsMap,
              allManualPayments,
              promotionsCache,
              protectionsCache
            ),
          ),
        );

        setReservations(mappedReservations);
      } catch (err) {
        console.error('Error fetching payments data:', err);
        setError(err instanceof Error ? err.message : 'Błąd podczas ładowania danych płatności');
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch data after protections and addons are loaded (even if empty)
    // We use a flag to ensure we only fetch once after initial load
    fetchData();
  }, [isProtectionsAndAddonsLoaded]);

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
  const filteredReservations = useMemo(() => {
    let filtered = [...reservations];

    // Apply column filters
    columnConfig.forEach(col => {
      if (col.filters && col.filters.length > 0) {
        filtered = filtered.filter(reservation => {
          let value: string | null = null;
          switch (col.key) {
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
            case 'promotionName':
              value = reservation.promotionName || '-';
              break;
            case 'protectionNames':
              value = reservation.protectionNames || '-';
              break;
            case 'depositAmount':
              value = reservation.depositAmount ? reservation.depositAmount.toFixed(2) : '-';
              break;
            case 'status':
              value = reservation.status;
              break;
            case 'createdAt':
              value = new Date(reservation.createdAt).toLocaleDateString('pl-PL');
              break;
          }
          return value !== null && col.filters && col.filters.includes(value);
        });
      }
    });

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        res =>
          res.reservationName.toLowerCase().includes(query) ||
          res.participantName.toLowerCase().includes(query) ||
          res.email.toLowerCase().includes(query) ||
          res.campName.toLowerCase().includes(query),
      );
    }

    // Sorting
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
  }, [searchQuery, sortColumn, sortDirection, reservations, columnConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReservations = filteredReservations.slice(startIndex, endIndex);
  
  // Handle page change with URL update
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
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

      // Refresh reservations to show new invoice
      const reservationsData = await reservationService.listReservations(0, 1000);
      const paymentsData = await paymentService.listPayments(0, 1000);
      const mappedReservations = await Promise.all(
        reservationsData.map(r =>
          mapReservationToPaymentFormat(r, paymentsData, protectionsMap, addonsMap),
        ),
      );
      setReservations(mappedReservations);

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

  // Funkcja odświeżania danych płatności
  const refreshPaymentsData = async () => {
    try {
      setIsLoading(true);
      
      // Pobierz zaktualizowane dane
      const reservationsData = await reservationService.listReservations(0, 1000);
      const paymentsData = await paymentService.listPayments(0, 1000);
      
      // Zmapuj rezerwacje
      const mappedReservations = await Promise.all(
        reservationsData.map(reservation =>
          mapReservationToPaymentFormat(reservation, paymentsData, protectionsMap, addonsMap),
        ),
      );
      
      setReservations(mappedReservations);
      
      // Zaktualizuj timestamp ostatniego sprawdzenia
      localStorage.setItem('last_payment_check', new Date().toISOString());
    } catch (err) {
      console.error('Błąd odświeżania danych:', err);
      // Opcjonalnie: pokaż toast z błędem
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

      // Refresh data
      const reservationsData = await reservationService.listReservations(0, 1000);
      const updatedPayments = await paymentService.listPayments(0, 1000);
      const mappedReservations = await Promise.all(
        reservationsData.map(reservation =>
          mapReservationToPaymentFormat(reservation, updatedPayments, protectionsMap, addonsMap),
        ),
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
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenColumnModal}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <Columns className="w-4 h-4" />
            Wybierz kolumny
          </button>
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-[#03adf0] text-white rounded-lg hover:bg-[#0288c7] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Synchronizacja...' : 'Zweryfikuj płatności'}
          </button>
        </div>
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
              updatePageInUrl(1);
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
              updatePageInUrl(1);
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

      {/* Alert o zmianach w płatnościach */}
      {paymentChangesAlert.isVisible && (
        <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg flex items-center justify-between shadow-sm">
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
            className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded hover:bg-blue-100"
            aria-label="Zamknij i odśwież"
            title="Zamknij i odśwież dane"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {orderedVisibleColumns.map((col) => {
                  const columnKey = col.key;
                  const columnLabel = COLUMN_DEFINITIONS[columnKey as keyof typeof COLUMN_DEFINITIONS] || columnKey;
                  const isFilterOpen = openFilterColumn === columnKey;
                  const hasFilters = hasActiveFilters(columnKey);
                  const uniqueValues = getUniqueColumnValues(columnKey);
                  const columnFilters = columnConfig.find(c => c.key === columnKey)?.filters || [];
                  
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
                              setOpenFilterColumn(isFilterOpen ? null : columnKey);
                            }}
                            className={`p-1 hover:bg-gray-200 transition-colors ${
                              hasFilters ? 'text-[#03adf0]' : 'text-gray-400'
                            }`}
                            title="Filtruj"
                          >
                            <Filter className="w-4 h-4" />
                          </button>
                          {isFilterOpen && (
                            <div 
                              className="absolute right-0 top-full mt-1 bg-white border border-gray-300 shadow-lg z-50 min-w-[200px] max-w-[300px] max-h-[400px] flex flex-col"
                              onClick={(e) => e.stopPropagation()}
                              style={{ borderRadius: 0 }}
                            >
                              {/* Filter header */}
                              <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                                <span className="text-xs font-medium text-gray-900">Filtruj {columnLabel}</span>
                                {hasFilters && (
                                  <button
                                    onClick={() => handleClearColumnFilters(columnKey)}
                                    className="text-xs text-[#03adf0] hover:text-[#0288c7]"
                                  >
                                    Wyczyść
                                  </button>
                                )}
                              </div>
                              
                              {/* Filter options */}
                              <div className="overflow-y-auto flex-1 max-h-[320px]">
                                {uniqueValues.length > 0 ? (
                                  uniqueValues.map((value) => {
                                    const isSelected = columnFilters.includes(value);
                                    return (
                                      <label
                                        key={value}
                                        className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors ${
                                          isSelected ? 'bg-blue-50' : ''
                                        }`}
                                        style={{ cursor: 'pointer' }}
                                      >
                                        <div className="relative flex items-center">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleFilterToggle(columnKey, value)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-4 h-4 text-[#03adf0] border-gray-300 focus:ring-[#03adf0]"
                                            style={{ borderRadius: 0, cursor: 'pointer' }}
                                          />
                                        </div>
                                        <span className="text-xs text-gray-900 flex-1 truncate" title={value}>
                                          {value}
                                        </span>
                                      </label>
                                    );
                                  })
                                ) : (
                                  <div className="px-3 py-4 text-xs text-gray-500 text-center">
                                    Brak danych
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
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
                  const hasReturnedItems = reservation.paymentDetails.items.some(item => item.status === 'returned');
                  const isFullPayment = reservation.paymentDetails.paidAmount >= reservation.paymentDetails.totalAmount && allPaid;
                  const isPartialPayment = reservation.paymentDetails.paidAmount > 0 && reservation.paymentDetails.paidAmount < reservation.paymentDetails.totalAmount;

                  return (
                    <Fragment key={reservation.id}>
                      <tr
                        className={`hover:bg-gray-50 transition-all duration-200 ${isExpanded ? 'bg-blue-50' : ''}`}
                        onClick={(e) => {
                          // If clicking on expandable row content, don't navigate
                          const target = e.target as HTMLElement;
                          if (target.closest('button, a, input, select')) {
                            return;
                          }
                          // Navigate to payments detail page with fromPage param
                          const paymentsUrl = currentPage > 1 
                            ? `/admin-panel/rezerwacja/${reservation.reservationName}/payments?fromPage=${currentPage}`
                            : `/admin-panel/rezerwacja/${reservation.reservationName}/payments`;
                          router.push(paymentsUrl);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {orderedVisibleColumns.map((col) => {
                          const columnKey = col.key;
                          if (columnKey === 'reservationName') {
                            return (
                              <td key={columnKey} className="px-4 py-2">
                                <div className="flex flex-col">
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
                                </div>
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
                          } else if (columnKey === 'promotionName') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-600">
                                  {reservation.promotionName || '-'}
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
                          } else if (columnKey === 'status') {
                            return (
                              <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
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
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
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
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Payment Summary */}
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
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
                                                  className={`flex items-center justify-between p-2 rounded border ${
                                                    installment.paid
                                                      ? 'bg-green-50 border-green-200'
                                                      : 'bg-gray-50 border-gray-200'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2 flex-1">
                                                    {/* No checkbox for installments */}
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>
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
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
                                        <div className="text-center py-4">
                                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#03adf0]"></div>
                                          <p className="text-xs text-gray-500 mt-2">Ładowanie faktur...</p>
                                        </div>
                                      ) : (
                                        (() => {
                                          const invoices = reservationInvoices.get(reservation.id) || [];

                                          if (invoices.length === 0) {
                                            return (
                                              <div className="bg-gray-50 rounded-lg p-4 text-center">
                                                <p className="text-sm text-gray-500">Brak faktur dla tej rezerwacji</p>
                                              </div>
                                            );
                                          }

                                          return (
                                            <div className="space-y-2">
                                              {invoices.map((invoice) => (
                                                <div
                                                  key={invoice.id}
                                                  className={`flex items-center justify-between p-3 rounded border ${
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
                                            <div className="bg-gray-50 rounded-lg p-4 text-center">
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
                                                  className="flex items-center justify-between p-3 rounded border bg-white border-gray-200"
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
                                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <Check className="w-3 h-3 mr-1" />
                                                        Zrealizowana
                                                      </span>
                                                    ) : (
                                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
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
                                        <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
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
              Wyświetlanie {startIndex + 1} - {Math.min(endIndex, filteredReservations.length)} z {filteredReservations.length} płatności
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
      >
        <div className="space-y-4">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {tempColumnConfig.map((col, index) => (
              <div
                key={col.key}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-move transition-colors ${
                  draggedOverIndex === index ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
                } ${draggedColumnIndex === index ? 'opacity-50' : ''}`}
              >
                <GripVertical className="w-5 h-5 text-gray-400" />
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => handleColumnToggle(col.key)}
                  className="w-4 h-4 text-[#03adf0] border-gray-300 rounded focus:ring-[#03adf0]"
                />
                <label className="flex-1 text-sm text-gray-700 cursor-pointer">
                  {COLUMN_DEFINITIONS[col.key as keyof typeof COLUMN_DEFINITIONS] || col.key}
                </label>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-4 border-t">
            <button
              onClick={handleResetColumnPreferences}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Resetuj ustawienia
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleCloseColumnModal}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleSaveColumnPreferences}
                className="px-4 py-2 text-sm text-white bg-[#03adf0] rounded-lg hover:bg-[#0288c7] transition-colors"
              >
                Zapisz
              </button>
            </div>
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
      `}</style>
    </div>
  );
}

