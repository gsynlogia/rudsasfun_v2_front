'use client';

import { FileText, Download, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';


import { certificateService, CertificateResponse } from '@/lib/services/CertificateService';
import { contractService } from '@/lib/services/ContractService';
import { paymentService } from '@/lib/services/PaymentService';
import { qualificationCardService, QualificationCardResponse } from '@/lib/services/QualificationCardService';
import { ReservationResponse } from '@/lib/services/ReservationService';

import UniversalModal from '../admin/UniversalModal';
import DashedLine from '../DashedLine';

import QualificationCardModal from './QualificationCardModal';

interface ReservationSidebarProps {
  reservationId: string;
  reservation: ReservationResponse;
  isDetailsExpanded: boolean;
}

interface FileHistoryItem {
  id: string;
  type: 'contract' | 'qualification_card' | 'certificate' | 'invoice';
  name: string;
  date: string;
  fileUrl?: string;
}

/**
 * ReservationSidebar Component
 * Right sidebar showing reservation progress and document status
 */
export default function ReservationSidebar({ reservationId, reservation, isDetailsExpanded }: ReservationSidebarProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [qualificationCard, setQualificationCard] = useState<QualificationCardResponse | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileHistory, setFileHistory] = useState<FileHistoryItem[]>([]);
  const [isFullyPaid, setIsFullyPaid] = useState(false);
  const [hasContract, setHasContract] = useState(false);
  const [loadingContract, setLoadingContract] = useState(false);
  const [generatingCard, setGeneratingCard] = useState(false);
  const certificateInputRef = useRef<HTMLInputElement>(null);
  const contractInputRef = useRef<HTMLInputElement>(null);
  const qualificationCardInputRef = useRef<HTMLInputElement>(null);
  const [uploadingContract, setUploadingContract] = useState(false);
  const [uploadingCard, setUploadingCard] = useState(false);
  const [showQualificationCardModal, setShowQualificationCardModal] = useState(false);
  const [cardDataCompleted, setCardDataCompleted] = useState(false);

  const reservationIdNum = parseInt(reservationId);
  const isValidReservationId = !isNaN(reservationIdNum);

  // Check if reservation is fully paid
  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const allPayments = await paymentService.listPayments(0, 1000);
        const reservationPayments = allPayments.filter(p => p.order_id === String(reservation.id));
        const totalPaid = reservationPayments
          .filter(p => p.status === 'paid' || p.status === 'success')
          .reduce((sum, p) => sum + (p.paid_amount || p.amount), 0);
        setIsFullyPaid(totalPaid >= reservation.total_price);
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    };
    checkPaymentStatus();
  }, [reservation.id, reservation.total_price]);

  // Load file history
  useEffect(() => {
    const loadFileHistory = async () => {
      if (!isValidReservationId) return;

      const history: FileHistoryItem[] = [];

      // Check for qualification card
      try {
        const card = await qualificationCardService.getQualificationCard(reservationIdNum);
        if (card) {
          history.push({
            id: `qualification-${card.reservation_id}`,
            type: 'qualification_card',
            name: card.card_filename || 'Karta kwalifikacyjna',
            date: card.created_at,
            fileUrl: qualificationCardService.getQualificationCardDownloadUrl(reservationIdNum),
          });
        }
      } catch {
        // Qualification card doesn't exist, ignore
      }

      // Check for certificates
      try {
        const certResponse = await certificateService.getCertificates(reservationIdNum);
        if (certResponse.certificates && certResponse.certificates.length > 0) {
          certResponse.certificates.forEach((cert: CertificateResponse) => {
            history.push({
              id: `certificate-${cert.id}`,
              type: 'certificate',
              name: cert.file_name,
              date: cert.uploaded_at,
              fileUrl: cert.file_url || undefined,
            });
          });
        }
      } catch {
        // Certificates don't exist, ignore
      }

      // Check for contract
      try {
        const contracts = await contractService.listMyContracts();
        const contract = contracts.find(c => c.reservation_id === reservationIdNum);
        if (contract) {
          history.push({
            id: `contract-${reservationIdNum}`,
            type: 'contract',
            name: 'Umowa',
            date: contract.created_at || new Date().toISOString(),
            fileUrl: contractService.getContractDownloadUrl(reservationIdNum),
          });
        }
      } catch {
        // Contract doesn't exist, skip
      }

      setFileHistory(history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    if (isDetailsExpanded) {
      loadFileHistory();
    }
  }, [reservationIdNum, isDetailsExpanded, isValidReservationId]);

  // Load qualification card on mount
  useEffect(() => {
    if (isValidReservationId) {
      loadQualificationCard();
      loadContractStatus();
    }
  }, [reservationId]);

  // Load contract status
  const loadContractStatus = async () => {
    if (!isValidReservationId) return;

    try {
      setLoadingContract(true);
      const contracts = await contractService.listMyContracts();
      const contract = contracts.find(c => c.reservation_id === reservationIdNum);
      setHasContract(!!contract);
    } catch (error) {
      console.error('Error loading contract status:', error);
      setHasContract(false);
    } finally {
      setLoadingContract(false);
    }
  };

  const loadQualificationCard = async () => {
    if (!isValidReservationId) return;

    try {
      setLoadingCard(true);
      const card = await qualificationCardService.getQualificationCard(reservationIdNum);
      setQualificationCard(card); // Will be null if card doesn't exist

      // Check if card data is completed
      try {
        const canGen = await qualificationCardService.canGenerateQualificationCard(reservationIdNum);
        setCardDataCompleted(canGen.can_generate);
      } catch {
        setCardDataCompleted(false);
      }
    } catch (error: any) {
      // Only log unexpected errors
      console.error('Error loading qualification card:', error);
      setQualificationCard(null);
      setCardDataCompleted(false);
    } finally {
      setLoadingCard(false);
    }
  };

  const handleDownloadContract = async () => {
    try {
      setIsGenerating(true);
      if (!isValidReservationId) {
        throw new Error('Invalid reservation ID');
      }

      // Check if contract exists and generate if needed
      if (!hasContract) {
        // Contract doesn't exist, generate it first
        try {
          await contractService.generateContract(reservationIdNum);
          // Reload contract status after generation
          await loadContractStatus();
        } catch (generateError: any) {
          console.error('Error generating contract:', generateError);
          alert('Nie udało się wygenerować umowy. Spróbuj ponownie.');
          return;
        }
      }

      // Contract exists (either was already there or just generated)
      // Redirect to downloads page
      router.push('/profil/do-pobrania');
    } catch (error) {
      console.error('Error handling contract:', error);
      alert('Nie udało się przetworzyć umowy. Spróbuj ponownie.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCard = async () => {
    if (!isValidReservationId) {
      alert('Nieprawidłowy numer rezerwacji');
      return;
    }

    try {
      // If card doesn't exist and data is not completed, open modal
      if (!qualificationCard && !cardDataCompleted) {
        setShowQualificationCardModal(true);
        return;
      }

      // If card doesn't exist but data is completed, generate it first
      if (!qualificationCard && cardDataCompleted) {
        setGeneratingCard(true);
        try {
          await qualificationCardService.generateQualificationCard(reservationIdNum);
          // Reload card status after generation
          await loadQualificationCard();
        } catch (generateError: any) {
          console.error('Error generating qualification card:', generateError);
          alert(generateError.message || 'Nie udało się wygenerować karty kwalifikacyjnej. Upewnij się, że wszystkie wymagane pola są wypełnione.');
          return;
        } finally {
          setGeneratingCard(false);
        }
      }

      // Redirect to downloads page instead of downloading directly
      router.push('/profil/do-pobrania');
    } catch (error: any) {
      console.error('Error with qualification card:', error);
      alert(error.message || 'Nie udało się przetworzyć karty kwalifikacyjnej. Spróbuj ponownie.');
    } finally {
      setDownloadingCard(false);
    }
  };

  const handleQualificationCardModalSuccess = async () => {
    // Reload card data after modal success
    await loadQualificationCard();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">
          Postęp rezerwacji
        </h3>
        <p className="text-[10px] sm:text-xs text-gray-500">Zaliczka</p>
      </div>

      {/* Document Cards */}
      <div className="space-y-3 sm:space-y-4">
        {/* Agreement Card */}
        <div>
          <p className="text-[10px] sm:text-xs font-medium text-gray-700 mb-1 sm:mb-2">Umowa</p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 bg-white relative">
            <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2">
              {(() => {
                const status = reservation.contract_status;
                if (status === 'approved') {
                  return <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full" />;
                } else if (status === 'rejected') {
                  return <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full" />;
                } else {
                  return <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-400 rounded-full" />;
                }
              })()}
            </div>
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              <p className="text-[10px] sm:text-xs text-gray-600 text-center">Umowa</p>
              <div className="w-full flex flex-col gap-1.5 sm:gap-2">
                <button
                  onClick={handleDownloadContract}
                  disabled={isGenerating || loadingContract}
                  className="w-full px-1.5 sm:px-2 py-1 sm:py-1.5 border border-gray-300 text-[10px] sm:text-xs rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  {isGenerating || loadingContract ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>{isGenerating ? (hasContract ? 'Pobieranie...' : 'Generowanie...') : 'Sprawdzanie...'}</span>
                    </>
                  ) : (
                    <>
                      {hasContract ? (
                        <>
                          <Download className="w-3 h-3" />
                          <span>Pobierz umowę</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3 h-3" />
                          <span>Podpisz umowę</span>
                        </>
                      )}
                    </>
                  )}
                </button>
                <input
                  ref={contractInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    try {
                      setUploadingContract(true);
                      await contractService.uploadContract(reservationIdNum, file);
                      alert('Umowa została przesłana pomyślnie');
                      await loadContractStatus();
                      if (contractInputRef.current) {
                        contractInputRef.current.value = '';
                      }
                    } catch (error: any) {
                      alert(error.message || 'Nie udało się przesłać umowy');
                    } finally {
                      setUploadingContract(false);
                    }
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => contractInputRef.current?.click()}
                  disabled={uploadingContract}
                  className="w-full px-1.5 sm:px-2 py-1 sm:py-1.5 border border-gray-300 text-[10px] sm:text-xs rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  {uploadingContract ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Przesyłanie...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3 h-3" />
                      <span>Wgraj podpisaną umowę</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Umowa Information */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-2 sm:p-3 rounded">
          <div className="flex items-start gap-1.5 sm:gap-2">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[9px] sm:text-[10px] font-semibold text-blue-900 mb-0.5 sm:mb-1">
                Ważne informacje
              </p>
              <p className="text-[9px] sm:text-[10px] text-blue-800 leading-tight">
                Masz <strong>2 dni</strong> na wgranie podpisanej umowy. Możesz podpisać umowę <strong>odręcznie</strong> lub <strong>podpisem zaufanym</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Qualification Card */}
        <div>
          <p className="text-[10px] sm:text-xs font-medium text-gray-700 mb-1 sm:mb-2">Karta kwalifikacyjna</p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 bg-white relative">
            <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2">
              {(() => {
                const status = reservation.qualification_card_status;
                if (status === 'approved') {
                  return <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full" />;
                } else if (status === 'rejected') {
                  return <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full" />;
                } else {
                  return <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-400 rounded-full" />;
                }
              })()}
            </div>
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              <p className="text-[10px] sm:text-xs text-gray-600 text-center">
                {loadingCard ? 'Ładowanie...' : (qualificationCard ? 'Karta kwalifikacyjna' : 'Karta kwalifikacyjna')}
              </p>
              <div className="w-full flex flex-col gap-1.5 sm:gap-2">
                <button
                  onClick={handleDownloadCard}
                  disabled={downloadingCard || loadingCard || generatingCard}
                  className="w-full px-1.5 sm:px-2 py-1 sm:py-1.5 border border-gray-300 text-[10px] sm:text-xs rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  {downloadingCard || generatingCard || loadingCard ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>
                        {generatingCard ? 'Generowanie...' : downloadingCard ? 'Pobieranie...' : 'Sprawdzanie...'}
                      </span>
                    </>
                  ) : (
                    <>
                      {qualificationCard ? (
                        <>
                          <Download className="w-3 h-3" />
                          <span>Pobierz</span>
                        </>
                      ) : cardDataCompleted ? (
                        <>
                          <FileText className="w-3 h-3" />
                          <span>Pobierz kartę</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3 h-3" />
                          <span>Wypełnij ankietę</span>
                        </>
                      )}
                    </>
                  )}
                </button>
                <input
                  ref={qualificationCardInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    try {
                      setUploadingCard(true);
                      await qualificationCardService.uploadQualificationCard(reservationIdNum, file);
                      alert('Karta kwalifikacyjna została przesłana pomyślnie');
                      await loadQualificationCard();
                      if (qualificationCardInputRef.current) {
                        qualificationCardInputRef.current.value = '';
                      }
                    } catch (error: any) {
                      alert(error.message || 'Nie udało się przesłać karty kwalifikacyjnej');
                    } finally {
                      setUploadingCard(false);
                    }
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => qualificationCardInputRef.current?.click()}
                  disabled={uploadingCard}
                  className="w-full px-1.5 sm:px-2 py-1 sm:py-1.5 border border-gray-300 text-[10px] sm:text-xs rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  {uploadingCard ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Przesyłanie...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3 h-3" />
                      <span>Wgraj podpisaną i wypełnioną kartę</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Section - Everything after Qualification Card */}
      {isDetailsExpanded && (
        <>
          <DashedLine />

          {/* Full Payment Status */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {isFullyPaid ? (
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
            )}
            <span className={`text-xs sm:text-sm ${isFullyPaid ? 'text-green-700' : 'text-gray-700'}`}>
              Pełna wpłata
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-1.5 sm:space-y-2">
            <button
              onClick={() => router.push('/profil/faktury-i-platnosci')}
              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-[#03adf0] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#0288c7] transition-colors"
            >
              faktury vat
            </button>
            <button
              onClick={() => setShowCertificateModal(true)}
              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-[#03adf0] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#0288c7] transition-colors"
            >
              zaświadczenia
            </button>
          </div>

          <DashedLine />

          {/* File History */}
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Historia plików</h4>
            {fileHistory.length > 0 ? (
              <div className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs text-gray-600">
                {fileHistory.map((file) => {
                  const date = new Date(file.date);
                  const formattedDate = date.toLocaleDateString('pl-PL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  const handleDownload = async () => {
                    if (file.type === 'certificate' && file.id.startsWith('certificate-')) {
                      const certId = parseInt(file.id.replace('certificate-', ''));
                      try {
                        const blob = await certificateService.downloadCertificate(certId);
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = file.name;
                        a.style.display = 'none';
                        document.body.appendChild(a);
                        a.click();
                        setTimeout(() => {
                          window.URL.revokeObjectURL(url);
                          if (document.body.contains(a)) {
                            document.body.removeChild(a);
                          }
                        }, 100);
                      } catch (error) {
                        console.error('Error downloading certificate:', error);
                        alert('Nie udało się pobrać zaświadczenia. Spróbuj ponownie.');
                      }
                    } else if (file.fileUrl) {
                      window.open(file.fileUrl, '_blank');
                    }
                  };

                  return (
                    <div key={file.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{formattedDate}</div>
                        <div>{file.name} {file.type === 'qualification_card' ? '(wgranie)' : ''}</div>
                      </div>
                      {(file.type === 'certificate' || file.fileUrl) && (
                        <button
                          onClick={handleDownload}
                          className="ml-2 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-[10px] sm:text-xs text-gray-500">Brak przesłanych plików</div>
            )}
          </div>
        </>
      )}

      {/* Upload Certificate Modal */}
      <UniversalModal
        isOpen={showCertificateModal}
        title="Prześlij zaświadczenia"
        onClose={() => {
          setShowCertificateModal(false);
          setUploadError(null);
          if (certificateInputRef.current) {
            certificateInputRef.current.value = '';
          }
        }}
        maxWidth="md"
      >
        <div className="p-6">
          {uploadError && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <p className="text-sm text-red-700">{uploadError}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="certificate-files" className="block text-sm font-medium text-gray-700 mb-2">
                Wybierz pliki PDF <span className="text-red-500">*</span>
              </label>
              <input
                id="certificate-files"
                ref={certificateInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;

                  // Validate all files
                  for (const file of files) {
                    if (!file.name.endsWith('.pdf')) {
                      setUploadError('Tylko pliki PDF są dozwolone');
                      return;
                    }
                    if (file.size > 10 * 1024 * 1024) {
                      setUploadError('Plik jest zbyt duży. Maksymalny rozmiar to 10MB');
                      return;
                    }
                  }

                  try {
                    setUploading(true);
                    setUploadError(null);

                    // Upload all files
                    const uploadPromises = files.map(file =>
                      certificateService.uploadCertificate(reservationIdNum, file),
                    );

                    const _uploadedCertificates = await Promise.all(uploadPromises);

                    // Reload file history
                    const loadFileHistory = async () => {
                      const history: FileHistoryItem[] = [];

                      // Reload qualification card
                      try {
                        const card = await qualificationCardService.getQualificationCard(reservationIdNum);
                        // Card can be null if it doesn't exist - that's OK
                        if (card) {
                          history.push({
                            id: `qualification-${card.reservation_id}`,
                            type: 'qualification_card',
                            name: card.card_filename || 'Karta kwalifikacyjna',
                            date: card.created_at,
                            fileUrl: qualificationCardService.getQualificationCardDownloadUrl(reservationIdNum),
                          });
                        }
                      } catch {
                        // Ignore
                      }

                      // Reload certificates
                      try {
                        const certResponse = await certificateService.getCertificates(reservationIdNum);
                        if (certResponse.certificates && certResponse.certificates.length > 0) {
                          certResponse.certificates.forEach((cert: CertificateResponse) => {
                            history.push({
                              id: `certificate-${cert.id}`,
                              type: 'certificate',
                              name: cert.file_name,
                              date: cert.uploaded_at,
                              fileUrl: cert.file_url || undefined,
                            });
                          });
                        }
                      } catch {
                        // Ignore
                      }

                      // Reload contract
                      try {
                        const contracts = await contractService.listMyContracts();
                        const contract = contracts.find(c => c.reservation_id === reservationIdNum);
                        if (contract) {
                          history.push({
                            id: `contract-${reservationIdNum}`,
                            type: 'contract',
                            name: 'Umowa',
                            date: contract.created_at || new Date().toISOString(),
                            fileUrl: contractService.getContractDownloadUrl(reservationIdNum),
                          });
                        }
                      } catch {
                        // Ignore
                      }

                      setFileHistory(history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    };

                    await loadFileHistory();

                    setShowCertificateModal(false);
                    if (certificateInputRef.current) {
                      certificateInputRef.current.value = '';
                    }
                  } catch (error: any) {
                    console.error('Error uploading certificates:', error);
                    setUploadError(error.message || 'Nie udało się przesłać zaświadczeń. Spróbuj ponownie.');
                  } finally {
                    setUploading(false);
                  }
                }}
                disabled={uploading}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm"
                style={{ borderRadius: 0 }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Możesz wybrać wiele plików PDF. Maksymalny rozmiar każdego pliku: 10MB
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCertificateModal(false);
                  setUploadError(null);
                  if (certificateInputRef.current) {
                    certificateInputRef.current.value = '';
                  }
                }}
                disabled={uploading}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: 0 }}
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      </UniversalModal>

      {/* Qualification Card Modal */}
      <QualificationCardModal
        reservation={reservation}
        isOpen={showQualificationCardModal}
        onClose={() => setShowQualificationCardModal(false)}
        onSuccess={handleQualificationCardModalSuccess}
      />
    </div>
  );
}

