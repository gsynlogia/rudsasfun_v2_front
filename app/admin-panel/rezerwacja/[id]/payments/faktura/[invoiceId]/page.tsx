'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import { authenticatedApiCall } from '@/utils/api-auth';
import { manualInvoiceService, ManualInvoiceResponse } from '@/lib/services/ManualInvoiceService';
import { invoiceService, InvoiceResponse } from '@/lib/services/InvoiceService';
import { useToast } from '@/components/ToastContainer';

interface ReservationDetails {
  id: number;
  user_id?: number;
}

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const reservationNumber = params.id as string;
  const invoiceId = parseInt(params.invoiceId as string, 10);
  const { showSuccess, showError } = useToast();

  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [invoice, setInvoice] = useState<ManualInvoiceResponse | InvoiceResponse | null>(null);
  const [invoiceType, setInvoiceType] = useState<'manual' | 'fakturownia'>('manual');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [netAmount, setNetAmount] = useState<string>('');
  const [taxAmount, setTaxAmount] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>('');
  const [sellDate, setSellDate] = useState<string>('');
  const [paymentTo, setPaymentTo] = useState<string>('');
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerTaxNo, setBuyerTaxNo] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [isCanceled, setIsCanceled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        const reservationData = await authenticatedApiCall<ReservationDetails>(
          `/api/reservations/by-number/${reservationNumber}`
        );
        setReservation(reservationData);

        // Try to fetch as manual invoice first
        try {
          const manualInvoiceData = await manualInvoiceService.getById(invoiceId);
          setInvoice(manualInvoiceData);
          setInvoiceType('manual');
          setInvoiceNumber(manualInvoiceData.invoice_number);
          setTotalAmount(manualInvoiceData.total_amount.toString());
          setNetAmount(manualInvoiceData.net_amount.toString());
          setTaxAmount(manualInvoiceData.tax_amount.toString());
          setIssueDate(manualInvoiceData.issue_date.split('T')[0]);
          setSellDate(manualInvoiceData.sell_date.split('T')[0]);
          setPaymentTo(manualInvoiceData.payment_to.split('T')[0]);
          setBuyerName(manualInvoiceData.buyer_name);
          setBuyerTaxNo(manualInvoiceData.buyer_tax_no || '');
          setBuyerEmail(manualInvoiceData.buyer_email || '');
          setNotes(manualInvoiceData.notes || '');
          setIsPaid(manualInvoiceData.is_paid);
          setIsCanceled(manualInvoiceData.is_canceled);
        } catch (manualErr) {
          // If not found as manual, try Fakturownia invoice
          try {
            const fakturowniaInvoiceData = await invoiceService.getById(invoiceId);
            setInvoice(fakturowniaInvoiceData);
            setInvoiceType('fakturownia');
            setInvoiceNumber(fakturowniaInvoiceData.invoice_number);
            setTotalAmount(fakturowniaInvoiceData.total_amount.toString());
            setNetAmount(fakturowniaInvoiceData.net_amount.toString());
            setTaxAmount(fakturowniaInvoiceData.tax_amount.toString());
            setIssueDate(fakturowniaInvoiceData.issue_date.split('T')[0]);
            setSellDate(fakturowniaInvoiceData.sell_date.split('T')[0]);
            setPaymentTo(fakturowniaInvoiceData.payment_to.split('T')[0]);
            setBuyerName(fakturowniaInvoiceData.buyer_name);
            setBuyerTaxNo(fakturowniaInvoiceData.buyer_tax_no || '');
            setBuyerEmail(fakturowniaInvoiceData.buyer_email || '');
            setIsPaid(fakturowniaInvoiceData.is_paid);
            setIsCanceled(fakturowniaInvoiceData.is_canceled || false);
          } catch (fakturowniaErr) {
            throw new Error('Faktura nie została znaleziona');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Błąd podczas ładowania danych');
      } finally {
        setIsLoading(false);
      }
    };

    if (reservationNumber && invoiceId) {
      fetchData();
    }
  }, [reservationNumber, invoiceId]);

  const handleAmountChange = (value: string, type: 'total' | 'net' | 'tax') => {
    const num = parseFloat(value) || 0;
    if (type === 'total') {
      setTotalAmount(value);
      const net = num / 1.23;
      const tax = num - net;
      setNetAmount(net.toFixed(2));
      setTaxAmount(tax.toFixed(2));
    } else if (type === 'net') {
      setNetAmount(value);
      const net = parseFloat(value) || 0;
      const tax = net * 0.23;
      const total = net + tax;
      setTotalAmount(total.toFixed(2));
      setTaxAmount(tax.toFixed(2));
    } else {
      setTaxAmount(value);
      const tax = parseFloat(value) || 0;
      const net = parseFloat(netAmount) || 0;
      const total = net + tax;
      setTotalAmount(total.toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invoice) return;
    
    const totalNum = parseFloat(totalAmount);
    const netNum = parseFloat(netAmount);
    const taxNum = parseFloat(taxAmount);
    
    if (isNaN(totalNum) || totalNum <= 0) {
      showError('Kwota całkowita musi być większa od 0');
      return;
    }

    if (!invoiceNumber.trim()) {
      showError('Numer faktury jest wymagany');
      return;
    }

    if (!buyerName.trim()) {
      showError('Nazwa nabywcy jest wymagana');
      return;
    }

    setIsSaving(true);
    try {
      if (invoiceType === 'manual') {
        await manualInvoiceService.update(invoiceId, {
          invoice_number: invoiceNumber.trim(),
          total_amount: totalNum,
          net_amount: netNum,
          tax_amount: taxNum,
          issue_date: new Date(issueDate).toISOString(),
          sell_date: new Date(sellDate).toISOString(),
          payment_to: new Date(paymentTo).toISOString(),
          buyer_name: buyerName.trim(),
          buyer_tax_no: buyerTaxNo.trim() || null,
          buyer_email: buyerEmail.trim() || null,
          notes: notes.trim() || null,
          is_paid: isPaid,
          is_canceled: isCanceled,
        });
      } else {
        // Fakturownia invoices are read-only, show error
        showError('Faktury z Fakturowni nie można edytować');
        return;
      }

      showSuccess('Faktura została zaktualizowana pomyślnie');
      router.push(`/admin-panel/rezerwacja/${reservationNumber}/payments`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Błąd podczas aktualizacji faktury');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SectionGuard section="payments">
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
              <div className="text-gray-500">Ładowanie...</div>
            </div>
          </div>
        </AdminLayout>
      </SectionGuard>
    );
  }

  if (error || !reservation || !invoice) {
    return (
      <SectionGuard section="payments">
        <AdminLayout>
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-sm text-red-700">{error || 'Faktura nie została znaleziona'}</p>
          </div>
        </AdminLayout>
      </SectionGuard>
    );
  }

  const isReadOnly = invoiceType === 'fakturownia';

  return (
    <SectionGuard section="payments">
      <AdminLayout>
        <div className="h-full flex flex-col">
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => router.push(`/admin-panel/rezerwacja/${reservationNumber}/payments`)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 rounded"
              style={{ borderRadius: 0, cursor: 'pointer' }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {isReadOnly ? 'Szczegóły faktury' : 'Edytuj fakturę'}: {reservationNumber}
            </h1>
          </div>

          {isReadOnly && (
            <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p className="text-sm text-yellow-700">
                Ta faktura pochodzi z Fakturowni i nie może być edytowana. Możesz tylko przeglądać szczegóły.
              </p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Numer faktury <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="invoiceNumber"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  required
                  disabled={isReadOnly}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent disabled:bg-gray-100"
                  style={{ borderRadius: 0 }}
                  placeholder="FV/2025/001"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700 mb-2">
                    Kwota całkowita (brutto) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="totalAmount"
                    step="0.01"
                    min="0.01"
                    value={totalAmount}
                    onChange={(e) => handleAmountChange(e.target.value, 'total')}
                    required
                    disabled={isReadOnly}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent disabled:bg-gray-100"
                    style={{ borderRadius: 0 }}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="netAmount" className="block text-sm font-medium text-gray-700 mb-2">
                    Kwota netto
                  </label>
                  <input
                    type="number"
                    id="netAmount"
                    step="0.01"
                    min="0"
                    value={netAmount}
                    onChange={(e) => handleAmountChange(e.target.value, 'net')}
                    disabled={isReadOnly}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent disabled:bg-gray-100"
                    style={{ borderRadius: 0 }}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="taxAmount" className="block text-sm font-medium text-gray-700 mb-2">
                    VAT
                  </label>
                  <input
                    type="number"
                    id="taxAmount"
                    step="0.01"
                    min="0"
                    value={taxAmount}
                    onChange={(e) => handleAmountChange(e.target.value, 'tax')}
                    disabled={isReadOnly}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent disabled:bg-gray-100"
                    style={{ borderRadius: 0 }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="issueDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Data wystawienia <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="issueDate"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    required
                    disabled={isReadOnly}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent disabled:bg-gray-100"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label htmlFor="sellDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Data sprzedaży <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="sellDate"
                    value={sellDate}
                    onChange={(e) => setSellDate(e.target.value)}
                    required
                    disabled={isReadOnly}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent disabled:bg-gray-100"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label htmlFor="paymentTo" className="block text-sm font-medium text-gray-700 mb-2">
                    Termin płatności <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="paymentTo"
                    value={paymentTo}
                    onChange={(e) => setPaymentTo(e.target.value)}
                    required
                    disabled={isReadOnly}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent disabled:bg-gray-100"
                    style={{ borderRadius: 0 }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="buyerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nazwa nabywcy <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="buyerName"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  required
                  disabled={isReadOnly}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent disabled:bg-gray-100"
                  style={{ borderRadius: 0 }}
                  placeholder="Imię i nazwisko lub nazwa firmy"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="buyerTaxNo" className="block text-sm font-medium text-gray-700 mb-2">
                    NIP
                  </label>
                  <input
                    type="text"
                    id="buyerTaxNo"
                    value={buyerTaxNo}
                    onChange={(e) => setBuyerTaxNo(e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent disabled:bg-gray-100"
                    style={{ borderRadius: 0 }}
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <label htmlFor="buyerEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="buyerEmail"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent disabled:bg-gray-100"
                    style={{ borderRadius: 0 }}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              {invoiceType === 'manual' && (
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Notatki
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent resize-y"
                    style={{ borderRadius: 0 }}
                    placeholder="Opcjonalne notatki..."
                  />
                </div>
              )}

              {invoiceType === 'manual' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPaid"
                      checked={isPaid}
                      onChange={(e) => setIsPaid(e.target.checked)}
                      className="w-4 h-4 text-[#03adf0] border-gray-300 focus:ring-[#03adf0]"
                      style={{ borderRadius: 0 }}
                    />
                    <label htmlFor="isPaid" className="text-sm font-medium text-gray-700">
                      Faktura opłacona
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isCanceled"
                      checked={isCanceled}
                      onChange={(e) => setIsCanceled(e.target.checked)}
                      className="w-4 h-4 text-[#03adf0] border-gray-300 focus:ring-[#03adf0]"
                      style={{ borderRadius: 0 }}
                    />
                    <label htmlFor="isCanceled" className="text-sm font-medium text-gray-700">
                      Faktura anulowana
                    </label>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 pt-4">
                {!isReadOnly && (
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-all duration-200 disabled:opacity-50"
                    style={{ borderRadius: 0 }}
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => router.push(`/admin-panel/rezerwacja/${reservationNumber}/payments`)}
                  className="px-6 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all duration-200"
                  style={{ borderRadius: 0 }}
                >
                  {isReadOnly ? 'Wróć' : 'Anuluj'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}





