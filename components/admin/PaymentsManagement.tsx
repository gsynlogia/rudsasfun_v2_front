'use client';

import { Search, ChevronUp, ChevronDown, Check, CreditCard, FileText, Building2, Shield, Utensils, Plus, AlertCircle, Download, XCircle, RotateCcw, RefreshCw, Trash2 } from 'lucide-react';
import { useState, useMemo, useEffect, Fragment } from 'react';

import { invoiceService, InvoiceResponse } from '@/lib/services/InvoiceService';
import { paymentService, PaymentResponse } from '@/lib/services/PaymentService';
import { reservationService } from '@/lib/services/ReservationService';
import { getApiBaseUrlRuntime } from '@/utils/api-config';

import PaymentConfirmationModal from './PaymentConfirmationModal';
import RefundConfirmationModal from './RefundConfirmationModal';


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
  email: string;
  campName: string;
  tripName: string;
  status: string;
  createdAt: string;
  paymentDetails: PaymentDetails;
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
): Promise<ReservationPayment> => {
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

  return {
    id: reservation.id,
    reservationName: `REZ-${new Date(reservation.created_at).getFullYear()}-${String(reservation.id).padStart(3, '0')}`,
    participantName: participantName || 'Brak danych',
    email: email,
    campName: campName,
    tripName: tripName,
    status: status,
    createdAt: reservation.created_at.split('T')[0],
    paymentDetails: await generatePaymentDetails(reservation, payments, protectionsMap, addonsMap),
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
  const [sortColumn, setSortColumn] = useState<string | null>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
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

  // State for invoice generation
  const [selectedItems, setSelectedItems] = useState<Map<number, Set<string>>>(new Map()); // reservationId -> Set of item IDs
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState<number | null>(null); // reservation ID being processed

  // State for protections and addons data
  const [protectionsMap, setProtectionsMap] = useState<Map<number, { name: string; price: number }>>(new Map());
  const [addonsMap, setAddonsMap] = useState<Map<string, { name: string; price: number }>>(new Map());
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
      }
    };

    fetchProtectionsAndAddons();
  }, []);

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

        // Map reservations to payment format (use current protectionsMap and addonsMap)
        const mappedReservations = await Promise.all(
          reservationsData.map(reservation =>
            mapReservationToPaymentFormat(reservation, paymentsData, protectionsMap, addonsMap),
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
  }, [protectionsMap, addonsMap]);

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
                  onClick={() => handleSort('createdAt')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Data utworzenia
                    <SortIcon column="createdAt" />
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
                          <td colSpan={7} className="px-4 py-4">
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

