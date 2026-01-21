'use client';

import { ArrowLeft, Save, Upload, X, FileText, Download } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import { useToast } from '@/components/ToastContainer';
import { manualPaymentService } from '@/lib/services/ManualPaymentService';
import { authenticatedApiCall } from '@/utils/api-auth';

interface ReservationDetails {
  id: number;
  user_id?: number;
}

export default function NewPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const reservationNumber = params.id as string;
  const { showSuccess, showError } = useToast();

  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('przelew');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        const reservationData = await authenticatedApiCall<ReservationDetails>(
          `/api/reservations/by-number/${reservationNumber}`,
        );
        setReservation(reservationData);

        // Set default payment date to today
        const today = new Date().toISOString().split('T')[0];
        setPaymentDate(today);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Błąd podczas ładowania rezerwacji');
      } finally {
        setIsLoading(false);
      }
    };

    if (reservationNumber) {
      fetchReservation();
    }
  }, [reservationNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reservation) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showError('Kwota musi być większa od 0');
      return;
    }

    if (!paymentDate) {
      showError('Data wpłaty jest wymagana');
      return;
    }

    setIsSaving(true);
    try {
      const payment = await manualPaymentService.create({
        reservation_id: reservation.id,
        user_id: reservation.user_id || 0,
        amount: amountNum,
        description: description || null,
        payment_method: paymentMethod || null,
        payment_date: new Date(paymentDate).toISOString(),
      });

      // Upload attachment if file is selected
      if (selectedFile) {
        try {
          await manualPaymentService.uploadAttachment(payment.id, selectedFile);
        } catch (uploadErr) {
          console.error('Error uploading attachment:', uploadErr);
          showError('Wpłata została dodana, ale nie udało się przesłać załącznika');
        }
      }

      showSuccess('Wpłata została dodana pomyślnie');
      router.push(`/admin-panel/rezerwacja/${reservationNumber}/payments`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Błąd podczas dodawania wpłaty');
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
              Dodaj wpłatę: {reservationNumber}
            </h1>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Kwota wpłacona <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="amount"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                  style={{ borderRadius: 0 }}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Data wpłaty <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="paymentDate"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                  style={{ borderRadius: 0 }}
                />
              </div>

              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
                  Metoda płatności
                </label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                  style={{ borderRadius: 0 }}
                >
                  <option value="przelew">Przelew</option>
                  <option value="gotówka">Gotówka</option>
                  <option value="karta">Karta</option>
                  <option value="inne">Inne</option>
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Opis / Notatki
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent resize-y"
                  style={{ borderRadius: 0 }}
                  placeholder="Opcjonalne notatki dotyczące wpłaty..."
                />
              </div>

              <div>
                <label htmlFor="attachment" className="block text-sm font-medium text-gray-700 mb-2">
                  Załącznik (opcjonalnie)
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="attachment"
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                      style={{ borderRadius: 0 }}
                    >
                      <Upload className="w-4 h-4" />
                      Wybierz plik
                    </label>
                    <input
                      type="file"
                      id="attachment"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedFile(file);
                      }}
                      className="hidden"
                    />
                    {selectedFile && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <FileText className="w-4 h-4" />
                        <span>{selectedFile.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Dozwolone formaty: PDF, JPG, PNG, GIF, DOC, DOCX, XLS, XLSX, TXT
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-all duration-200 disabled:opacity-50"
                  style={{ borderRadius: 0 }}
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Zapisywanie...' : 'Zapisz wpłatę'}
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/admin-panel/rezerwacja/${reservationNumber}/payments`)}
                  className="px-6 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all duration-200"
                  style={{ borderRadius: 0 }}
                >
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}