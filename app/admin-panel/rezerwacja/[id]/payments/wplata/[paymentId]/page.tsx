'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Upload, X, FileText, Download, Trash2, AlertTriangle } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import { authenticatedApiCall } from '@/utils/api-auth';
import { manualPaymentService, ManualPaymentResponse } from '@/lib/services/ManualPaymentService';
import { useToast } from '@/components/ToastContainer';

interface ReservationDetails {
  id: number;
  user_id?: number;
}

export default function EditPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const reservationNumber = params.id as string;
  const paymentId = parseInt(params.paymentId as string, 10);
  const { showSuccess, showError } = useToast();

  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [payment, setPayment] = useState<ManualPaymentResponse | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('przelew');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingAttachment, setIsDeletingAttachment] = useState(false);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);
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

        const paymentData = await manualPaymentService.getById(paymentId);
        setPayment(paymentData);
        setAmount(paymentData.amount.toString());
        setDescription(paymentData.description || '');
        setPaymentMethod(paymentData.payment_method || 'przelew');
        setPaymentDate(paymentData.payment_date.split('T')[0]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Błąd podczas ładowania danych');
      } finally {
        setIsLoading(false);
      }
    };

    if (reservationNumber && paymentId) {
      fetchData();
    }
  }, [reservationNumber, paymentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!payment) return;
    
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
      await manualPaymentService.update(paymentId, {
        amount: amountNum,
        description: description || null,
        payment_method: paymentMethod || null,
        payment_date: new Date(paymentDate).toISOString(),
      });

      // Upload attachment if new file is selected
      if (selectedFile) {
        try {
          setIsUploading(true);
          await manualPaymentService.uploadAttachment(paymentId, selectedFile);
          showSuccess('Wpłata i załącznik zostały zaktualizowane pomyślnie');
        } catch (uploadErr) {
          console.error('Error uploading attachment:', uploadErr);
          showError('Wpłata została zaktualizowana, ale nie udało się przesłać załącznika');
        } finally {
          setIsUploading(false);
        }
      } else {
        showSuccess('Wpłata została zaktualizowana pomyślnie');
      }

      router.push(`/admin-panel/rezerwacja/${reservationNumber}/payments`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Błąd podczas aktualizacji wpłaty');
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

  if (error || !reservation || !payment) {
    return (
      <SectionGuard section="payments">
        <AdminLayout>
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-sm text-red-700">{error || 'Wpłata nie została znaleziona'}</p>
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
              Edytuj wpłatę: {reservationNumber}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Załącznik
                </label>
                {payment.attachment_path ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <span className="flex-1 text-sm text-gray-900">{payment.attachment_filename || 'Załącznik'}</span>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          try {
                            const { authenticatedFetch } = await import('@/utils/api-auth');
                            const { API_BASE_URL } = await import('@/utils/api-config');
                            const response = await authenticatedFetch(
                              `${API_BASE_URL}/api/manual-payments/${paymentId}/attachment`
                            );
                            if (response.ok) {
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = payment.attachment_filename || 'attachment';
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                            } else {
                              showError('Błąd podczas pobierania załącznika');
                            }
                          } catch (err) {
                            showError(err instanceof Error ? err.message : 'Błąd podczas pobierania załącznika');
                          }
                        }}
                        className="p-1.5 text-[#03adf0] hover:bg-blue-50 transition-colors"
                        style={{ borderRadius: 0 }}
                        title="Pobierz załącznik"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('Czy na pewno chcesz usunąć załącznik?')) {
                            setIsDeletingAttachment(true);
                            try {
                              await manualPaymentService.deleteAttachment(paymentId);
                              setPayment({ ...payment, attachment_path: null, attachment_filename: null });
                              showSuccess('Załącznik został usunięty');
                            } catch (err) {
                              showError(err instanceof Error ? err.message : 'Błąd podczas usuwania załącznika');
                            } finally {
                              setIsDeletingAttachment(false);
                            }
                          }
                        }}
                        disabled={isDeletingAttachment}
                        className="p-1.5 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        style={{ borderRadius: 0 }}
                        title="Usuń załącznik"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Aby zmienić załącznik, wybierz nowy plik poniżej</p>
                  </div>
                ) : null}
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="attachment"
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                      style={{ borderRadius: 0 }}
                    >
                      <Upload className="w-4 h-4" />
                      {payment.attachment_path ? 'Zmień załącznik' : 'Wybierz plik'}
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

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-all duration-200 disabled:opacity-50"
                    style={{ borderRadius: 0 }}
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
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
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Czy na pewno chcesz usunąć tę wpłatę? Ta operacja jest nieodwracalna i usunie również załącznik (jeśli istnieje).')) {
                      setIsDeletingPayment(true);
                      try {
                        await manualPaymentService.delete(paymentId);
                        showSuccess('Wpłata została usunięta pomyślnie');
                        router.push(`/admin-panel/rezerwacja/${reservationNumber}/payments`);
                      } catch (err) {
                        showError(err instanceof Error ? err.message : 'Błąd podczas usuwania wpłaty');
                      } finally {
                        setIsDeletingPayment(false);
                      }
                    }
                  }}
                  disabled={isDeletingPayment}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white hover:bg-red-700 transition-all duration-200 disabled:opacity-50"
                  style={{ borderRadius: 0 }}
                >
                  <AlertTriangle className="w-4 h-4" />
                  {isDeletingPayment ? 'Usuwanie...' : 'Usuń wpłatę'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}

