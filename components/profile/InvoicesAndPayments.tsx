'use client';

import { FileText, Download, CheckCircle, XCircle, Calendar, CreditCard, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { contractService } from '@/lib/services/ContractService';
import { invoiceService, InvoiceResponse } from '@/lib/services/InvoiceService';
import { reservationService, type ReservationResponse } from '@/lib/services/ReservationService';

interface Document {
  id: string;
  type: 'contract' | 'invoice';
  name: string;
  reservationId: number;
  reservationName?: string;
  participantName?: string;
  date: string;
  amount?: number;
  status: 'available' | 'pending' | 'unavailable';
  downloadUrl?: string;
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
 * Displays user's documents (contracts, invoices) and payment history
 */
export default function InvoicesAndPayments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  // Load user's invoices and payments
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get user's invoices
        const invoicesResponse = await invoiceService.getMyInvoices();

        // Get reservations to match with invoices
        const reservations: ReservationResponse[] = await reservationService.getMyReservations(0, 100);
        const reservationsMap = new Map(reservations.map(r => [r.id, r]));

        // Map invoices to documents
        const documentsList: Document[] = invoicesResponse.invoices.map((invoice: InvoiceResponse) => {
          const reservation = reservationsMap.get(invoice.reservation_id);
          const participantName = reservation
            ? `${reservation.participant_first_name || ''} ${reservation.participant_last_name || ''}`.trim()
            : '';

          return {
            id: `invoice-${invoice.id}`,
            type: 'invoice' as const,
            name: `Faktura ${invoice.invoice_number}`,
            reservationId: invoice.reservation_id,
            reservationName: reservation ? `REZ-${new Date(reservation.created_at).getFullYear()}-${String(reservation.id).padStart(3, '0')}` : undefined,
            participantName: participantName || undefined,
            date: invoice.issue_date,
            amount: invoice.total_amount,
            status: 'available' as const, // Invoices are always available
          };
        });

        setDocuments(documentsList);

        // Load payments from reservations (for now, keep empty - payments are shown separately)
        setPayments([]);
      } catch (err) {
        console.error('Error loading invoices:', err);
        setError(err instanceof Error ? err.message : 'Nie udało się załadować faktur');
        setDocuments([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, []);

  const handleDownloadDocument = async (doc: Document) => {
    if (doc.type === 'contract') {
      try {
        setDownloadingIds(prev => new Set(prev).add(doc.id));
        await contractService.downloadContract(doc.reservationId);
      } catch (error) {
        console.error('Error downloading contract:', error);
        alert('Nie udało się pobrać dokumentu. Spróbuj ponownie.');
      } finally {
        setDownloadingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(doc.id);
          return newSet;
        });
      }
    } else if (doc.type === 'invoice') {
      try {
        setDownloadingIds(prev => new Set(prev).add(doc.id));
        // Extract invoice ID from doc.id (format: "invoice-{id}")
        const invoiceId = parseInt(doc.id.replace('invoice-', ''));
        const blob = await invoiceService.downloadInvoice(invoiceId);

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.name || 'faktura'}.pdf`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        // Clean up after a short delay
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          if (document.body.contains(a)) {
            document.body.removeChild(a);
          }
        }, 100);
      } catch (error) {
        console.error('Error downloading invoice:', error);
        alert('Nie udało się pobrać faktury. Spróbuj ponownie.');
      } finally {
        setDownloadingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(doc.id);
          return newSet;
        });
      }
    }
  };

  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'available':
        return (
          <span className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-green-50 text-green-700 text-[10px] sm:text-xs font-medium rounded-full w-fit">
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            Dostępny
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-yellow-50 text-yellow-700 text-[10px] sm:text-xs font-medium rounded-full w-fit">
            <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            W przygotowaniu
          </span>
        );
      case 'unavailable':
        return (
          <span className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-red-50 text-red-700 text-[10px] sm:text-xs font-medium rounded-full w-fit">
            <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            Niedostępny
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#03adf0]" />
        <span className="ml-3 text-gray-600">Ładowanie dokumentów...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Invoices Section */}
      <div>
        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
          Faktury
        </h3>

        {documents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Brak faktur</p>
          </div>
        ) : (
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
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 font-medium">
                        {doc.name}
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                          {doc.date}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                        <div>
                          <div className="font-medium text-gray-900">{doc.reservationName}</div>
                          <div className="text-[10px] sm:text-xs text-gray-500">{doc.participantName}</div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">
                        {doc.amount ? `${doc.amount.toFixed(2)} zł` : '-'}
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        {getStatusBadge(doc.status)}
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          disabled={doc.status !== 'available' || downloadingIds.has(doc.id)}
                          className="flex items-center gap-1 text-[#03adf0] text-[10px] sm:text-xs hover:text-[#0288c7] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {downloadingIds.has(doc.id) ? (
                            <>
                              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                              Pobieranie...
                            </>
                          ) : (
                            <>
                              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                              Pobierz
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Payment History Section */}
      {payments.length > 0 && (
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
      )}
    </div>
  );
}

