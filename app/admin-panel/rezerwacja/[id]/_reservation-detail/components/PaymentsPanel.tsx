'use client';

import type { ManualPaymentResponse } from '@/lib/services/ManualPaymentService';
import type { PaymentResponse } from '@/lib/services/PaymentService';

import { formatDate, formatCurrency } from '../formatters';
import type { ReservationDetails } from '../types';

export interface PaymentsPanelProps {
  reservation: ReservationDetails;
  payments: PaymentResponse[];
  manualPayments: ManualPaymentResponse[];
  onManagePayments: () => void;
}

export function PaymentsPanel({
  reservation,
  payments,
  manualPayments,
  onManagePayments,
}: PaymentsPanelProps) {
  const tpayPaid = payments
    .filter(p => p.status === 'paid' || p.status === 'completed' || p.status === 'success')
    .reduce((sum, p) => sum + (p.paid_amount || p.amount || 0), 0);
  const manualPaid = manualPayments.reduce((sum, mp) => sum + (mp.amount || 0), 0);
  const totalPaid = tpayPaid + manualPaid;
  const totalAmount = reservation.total_price || 0;
  const remainingAmount = Math.max(0, totalAmount - totalPaid);

  const allPaymentsList = [
    ...payments
      .filter(p => p.status === 'paid' || p.status === 'completed' || p.status === 'success')
      .map(p => ({
        amount: p.paid_amount || p.amount || 0,
        date: p.paid_at || p.created_at,
        method: p.channel_id === 64 ? 'BLIK' : p.channel_id === 53 ? 'Karta' : 'Online',
        source: 'tpay' as const,
      })),
    ...manualPayments.map(mp => ({
      amount: mp.amount || 0,
      date: mp.created_at,
      method: mp.payment_method || 'Ręczna',
      source: 'manual' as const,
    })),
  ].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-slate-700">Płatności</h2>
        <button
          onClick={onManagePayments}
          className="text-xs text-[#03adf0] hover:text-[#0288c7] hover:underline"
        >
          Zarządzaj płatnościami
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded">
          <p className="text-xs text-gray-500 mb-1">Kwota całkowita</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded">
          <p className="text-xs text-gray-500 mb-1">Wpłacono</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className={`text-center p-3 rounded ${remainingAmount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
          <p className="text-xs text-gray-500 mb-1">Pozostało</p>
          <p className={`text-lg font-bold ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(remainingAmount)}
          </p>
        </div>
      </div>
      {allPaymentsList.length > 0 ? (
        <div>
          <p className="text-xs text-gray-500 mb-2">Historia wpłat ({allPaymentsList.length})</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {allPaymentsList.map((payment, idx) => (
              <div key={idx} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-600">
                  {payment.method} - {formatDate(payment.date)}
                </span>
                <span className="text-gray-900 font-medium">{formatCurrency(payment.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">Brak zarejestrowanych wpłat</p>
      )}
    </div>
  );
}