'use client';

import { FileText, Download, CheckCircle, XCircle, Calendar, CreditCard } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'overdue';
  reservationName: string;
  participantName: string;
  downloadLink?: string;
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  description: string;
  invoiceNumber?: string;
}

/**
 * InvoicesAndPayments Component
 * Displays user's invoices and payment history
 */
export default function InvoicesAndPayments() {
  // TODO: Load invoices and payments from API
  const invoices: Invoice[] = [
    {
      id: '1',
      invoiceNumber: 'FV/2023/001',
      date: '10.05.2023',
      amount: 500.00,
      status: 'paid',
      reservationName: 'Laserowy Paintball',
      participantName: 'Franciszek Kowalski',
      downloadLink: '#',
    },
    {
      id: '2',
      invoiceNumber: 'FV/2023/002',
      date: '12.06.2023',
      amount: 850.00,
      status: 'paid',
      reservationName: 'Laserowy Paintball',
      participantName: 'Franciszek Kowalski',
      downloadLink: '#',
    },
    {
      id: '3',
      invoiceNumber: 'FV/2023/003',
      date: '15.07.2023',
      amount: 1000.00,
      status: 'unpaid',
      reservationName: 'Laserowy Paintball',
      participantName: 'Franciszek Kowalski',
      downloadLink: '#',
    },
    {
      id: '4',
      invoiceNumber: 'FV/2022/045',
      date: '20.05.2022',
      amount: 1200.00,
      status: 'paid',
      reservationName: 'Obozowy Paintball',
      participantName: 'Anna Nowak',
      downloadLink: '#',
    },
  ];

  const payments: Payment[] = [
    {
      id: '1',
      date: '10.05.2023',
      amount: 500.00,
      method: 'Przelew bankowy',
      description: 'Zaliczka - Laserowy Paintball',
      invoiceNumber: 'FV/2023/001',
    },
    {
      id: '2',
      date: '12.06.2023',
      amount: 850.00,
      method: 'BLIK',
      description: 'Częściowa wpłata - Laserowy Paintball',
      invoiceNumber: 'FV/2023/002',
    },
    {
      id: '3',
      date: '20.05.2022',
      amount: 1200.00,
      method: 'Przelew bankowy',
      description: 'Pełna wpłata - Obozowy Paintball',
      invoiceNumber: 'FV/2022/045',
    },
  ];

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return (
          <span className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-green-50 text-green-700 text-[10px] sm:text-xs font-medium rounded-full w-fit">
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            Opłacona
          </span>
        );
      case 'unpaid':
        return (
          <span className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-yellow-50 text-yellow-700 text-[10px] sm:text-xs font-medium rounded-full w-fit">
            <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            Nieopłacona
          </span>
        );
      case 'overdue':
        return (
          <span className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-red-50 text-red-700 text-[10px] sm:text-xs font-medium rounded-full w-fit">
            <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            Przeterminowana
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Invoices Section */}
      <div>
        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
          Faktury
        </h3>
        
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                    Numer faktury
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                    Data
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                    Rezerwacja
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                    Kwota
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 font-medium">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        {invoice.date}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                      <div>
                        <div className="font-medium text-gray-900">{invoice.reservationName}</div>
                        <div className="text-[10px] sm:text-xs text-gray-500">{invoice.participantName}</div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">
                      {invoice.amount.toFixed(2)} zł
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                      <button className="flex items-center gap-1 text-[#03adf0] text-[10px] sm:text-xs hover:text-[#0288c7]">
                        <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                        Pobierz
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment History Section */}
      <div>
        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
          Historia płatności
        </h3>
        
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                    Data
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                    Kwota
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                    Metoda płatności
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                    Opis
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                    Faktura
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        {payment.date}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">
                      {payment.amount.toFixed(2)} zł
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />
                        {payment.method}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                      {payment.description}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                      {payment.invoiceNumber ? (
                        <span className="text-[#03adf0]">{payment.invoiceNumber}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

