'use client';

import { FileText, Download, XCircle } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

import { certificateService, CertificateResponse } from '@/lib/services/CertificateService';
import { contractService } from '@/lib/services/ContractService';
import { manualPaymentService, ManualPaymentResponse } from '@/lib/services/ManualPaymentService';
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
  /** Base path for navigation (e.g., '/profil' or '/client-view/123') */
  basePath?: string;
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
export default function ReservationSidebar({ reservationId, reservation, isDetailsExpanded, basePath = '/profil' }: ReservationSidebarProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const isDetailPage = /\/aktualne-rezerwacje\/[^/]+$/.test(pathname);
  const [_isGenerating, setIsGenerating] = useState(false);
  const [qualificationCard, setQualificationCard] = useState<QualificationCardResponse | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [_downloadingCard, setDownloadingCard] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileHistory, setFileHistory] = useState<FileHistoryItem[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<Array<{ date: string; amount: number; label: string }>>([]);
  const [isFullyPaid, setIsFullyPaid] = useState(false);
  const [_hasContract, setHasContract] = useState(false);
  const [_loadingContract, setLoadingContract] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [_generatingCard, setGeneratingCard] = useState(false);
  const certificateInputRef = useRef<HTMLInputElement>(null);
  const _contractInputRef = useRef<HTMLInputElement>(null);
  const _qualificationCardInputRef = useRef<HTMLInputElement>(null);
  const [_uploadingContract, setUploadingContract] = useState(false);
  const [_uploadingCard, setUploadingCard] = useState(false);
  const [showQualificationCardModal, setShowQualificationCardModal] = useState(false);
  const [cardDataCompleted, setCardDataCompleted] = useState(false);
  const [autoContractTriggered, setAutoContractTriggered] = useState(false);

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

  // Load payment history (widoczna na liście i na szczegółach)
  useEffect(() => {
    const loadPaymentHistory = async () => {
      if (!isValidReservationId) return;
      try {
        const [paymentsRes, manualPayments] = await Promise.all([
          paymentService.listPayments(0, 1000),
          manualPaymentService.getByReservation(reservationIdNum),
        ]);
        const online = (paymentsRes || [])
          .filter((p: { order_id: string }) => p.order_id === String(reservation.id))
          .filter((p: { status: string }) => p.status === 'paid' || p.status === 'success')
          .map((p: { paid_at: string | null; created_at: string; amount: number; paid_amount: number | null }) => ({
            date: p.paid_at || p.created_at,
            amount: p.paid_amount ?? p.amount,
            label: 'Płatność online',
          }));
        const manual = (manualPayments || []).map((p: ManualPaymentResponse) => ({
          date: p.payment_date,
          amount: p.amount,
          label: p.payment_method ? `Wpłata ręczna (${p.payment_method})` : 'Wpłata ręczna',
        }));
        const merged = [...online, ...manual].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setPaymentHistory(merged);
      } catch (error) {
        console.error('Error loading payment history:', error);
        setPaymentHistory([]);
      }
    };
    loadPaymentHistory();
  }, [reservation.id, reservationIdNum, isValidReservationId]);

  // Load qualification card on mount
  useEffect(() => {
    if (isValidReservationId) {
      loadQualificationCard();
      loadContractStatus();
    }
  }, [reservationId]);

  // Auto-generate contract on view load if missing
  useEffect(() => {
    const autoGenerate = async () => {
      if (!isValidReservationId || autoContractTriggered) return;
      try {
        setAutoContractTriggered(true);
        setIsGenerating(true);
        await contractService.generateContract(reservationIdNum);
        await loadContractStatus();
      } catch (err) {
        console.warn('Auto contract generation failed', err);
      } finally {
        setIsGenerating(false);
      }
    };
    autoGenerate();
  }, [isValidReservationId, reservationIdNum, autoContractTriggered]);

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

  const _handleDownloadContract = async () => {
    try {
      setIsGenerating(true);
      if (!isValidReservationId) {
        throw new Error('Invalid reservation ID');
      }

      // Always check directly if contract exists before redirecting
      // This ensures we have the most up-to-date status
      let contractExists = false;
      try {
        const contracts = await contractService.listMyContracts();
        console.log(`[Contract Check] Checking contracts for reservation ${reservationIdNum}:`, contracts);
        contractExists = contracts.some(c => c.reservation_id === reservationIdNum);
        console.log(`[Contract Check] Contract exists: ${contractExists}`);
      } catch (error) {
        console.error('Error checking contract status:', error);
        // If check fails, assume contract doesn't exist and try to generate
        contractExists = false;
      }

      // If contract doesn't exist, generate it first
      if (!contractExists) {
        console.log(`[Contract Generation] Generating contract for reservation ${reservationIdNum}...`);
        try {
          const generateResult = await contractService.generateContract(reservationIdNum);
          console.log(`[Contract Generation] Contract generation result:`, generateResult);
          console.log(`[Contract Generation] Contract generated successfully for reservation ${reservationIdNum}`);

          // Wait a bit to ensure contract is saved to database
          await new Promise(resolve => setTimeout(resolve, 500));

          // Reload contract status after generation
          await loadContractStatus();

          // Verify contract was actually created
          const verifyContracts = await contractService.listMyContracts();
          const verifyExists = verifyContracts.some(c => c.reservation_id === reservationIdNum);
          console.log(`[Contract Verification] Contract exists after generation: ${verifyExists}`);

          if (!verifyExists) {
            console.error(`[Contract Verification] Contract was not created for reservation ${reservationIdNum}`);
            alert('Umowa nie została wygenerowana. Spróbuj ponownie.');
            return;
          }
        } catch (generateError: any) {
          console.error('Error generating contract:', generateError);
          alert('Nie udało się wygenerować umowy. Spróbuj ponownie.');
          return;
        }
      } else {
        console.log(`[Contract Check] Contract already exists for reservation ${reservationIdNum}, skipping generation`);
      }

      // Contract exists (either was already there or just generated)
      // Redirect to downloads page
      console.log(`[Redirect] Redirecting to downloads page for reservation ${reservationIdNum}`);
      router.push(`${basePath}/do-pobrania`);
    } catch (error) {
      console.error('Error handling contract:', error);
      alert('Nie udało się przetworzyć umowy. Spróbuj ponownie.');
    } finally {
      setIsGenerating(false);
    }
  };

  const _handleDownloadCard = async () => {
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
      router.push(`${basePath}/do-pobrania`);
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
                if (status === 'approved' || status === 'accepted') {
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
              <button
                onClick={() => {
                  const formatReservationNumber = (reservationId: number, createdAt: string) => {
                    const year = new Date(createdAt).getFullYear();
                    const paddedId = String(reservationId).padStart(3, '0');
                    return `REZ-${year}-${paddedId}`;
                  };
                  const reservationNumber = formatReservationNumber(reservationIdNum, reservation.created_at);
                  const url = `${basePath}/aktualne-rezerwacje/${reservationNumber}/umowa`;
                  window.open(url, '_blank');
                }}
                className="w-full px-1.5 sm:px-2 py-1 sm:py-1.5 bg-[#03adf0] text-white text-[10px] sm:text-xs rounded hover:bg-[#0288c7] transition-colors flex items-center justify-center gap-1"
              >
                <FileText className="w-3 h-3" />
                <span>Umowa</span>
              </button>
            </div>
          </div>
        </div>
        {/*
        ORIGINAL AGREEMENT CARD - COMMENTED OUT FOR UPDATE
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
                  onClick={() => {
                    router.push(`${basePath}/do-pobrania`);
                  }}
                  className="w-full px-1.5 sm:px-2 py-1 sm:py-1.5 bg-[#03adf0] text-white text-[10px] sm:text-xs rounded hover:bg-[#0288c7] transition-colors flex items-center justify-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  <span>Pobierz umowę</span>
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
        END OF ORIGINAL AGREEMENT CARD
        */}

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
                {loadingCard ? 'Ładowanie...' : 'Karta kwalifikacyjna'}
              </p>
              <button
                onClick={async () => {
                  try {
                    if (!cardDataCompleted) {
                      setShowQualificationCardModal(true);
                      return;
                    }
                    const formatReservationNumber = (reservationId: number, createdAt: string) => {
                      const year = new Date(createdAt).getFullYear();
                      const paddedId = String(reservationId).padStart(3, '0');
                      return `REZ-${year}-${paddedId}`;
                    };
                    const reservationNumber = formatReservationNumber(reservationIdNum, reservation.created_at);
                    const url = `${basePath}/aktualne-rezerwacje/${reservationNumber}/karta-kwalifikacyjna`;
                    window.open(url, '_blank');
                  } catch (error: any) {
                    console.error('Error opening qualification card:', error);
                    alert(error.message || 'Nie udało się otworzyć karty kwalifikacyjnej. Spróbuj ponownie.');
                  }
                }}
                className="w-full px-1.5 sm:px-2 py-1 sm:py-1.5 bg-[#03adf0] hover:bg-[#0299d6] text-white text-[10px] sm:text-xs rounded transition-colors text-center"
              >
                Karta kwalifikacyjna
              </button>
            </div>
          </div>
        </div>

        {/* Authorization Card */}
        <div>
          <p className="text-[10px] sm:text-xs font-medium text-gray-700 mb-1 sm:mb-2">Upoważnienia</p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 bg-white relative">
            <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-400 rounded-full" />
            </div>
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              <p className="text-[10px] sm:text-xs text-gray-600 text-center">Upoważnienia</p>
              <button
                onClick={() => {
                  const formatReservationNumber = (reservationId: number, createdAt: string) => {
                    const year = new Date(createdAt).getFullYear();
                    const paddedId = String(reservationId).padStart(3, '0');
                    return `REZ-${year}-${paddedId}`;
                  };
                  const reservationNumber = formatReservationNumber(reservationIdNum, reservation.created_at);
                  const url = `${basePath}/aktualne-rezerwacje/${reservationNumber}/upowaznienia`;
                  window.open(url, '_blank');
                }}
                className="w-full px-1.5 sm:px-2 py-1 sm:py-1.5 bg-[#03adf0] text-white text-[10px] sm:text-xs rounded hover:bg-[#0288c7] transition-colors flex items-center justify-center gap-1"
              >
                <FileText className="w-3 h-3" />
                <span>Upoważnienia</span>
              </button>
            </div>
          </div>
        </div>
        {/*
        ORIGINAL QUALIFICATION CARD - COMMENTED OUT FOR UPDATE
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
                  onClick={async () => {
                    try {
                      if (!cardDataCompleted) {
                        setShowQualificationCardModal(true);
                        return;
                      }
                      const formatReservationNumber = (reservationId: number, createdAt: string) => {
                        const year = new Date(createdAt).getFullYear();
                        const paddedId = String(reservationId).padStart(3, '0');
                        return `REZ-${year}-${paddedId}`;
                      };
                      const reservationNumber = formatReservationNumber(reservationIdNum, reservation.created_at);
                      const url = `${basePath}/aktualne-rezerwacje/${reservationNumber}/karta-kwalifikacyjna`;
                      window.open(url, '_blank');
                    } catch (error: any) {
                      console.error('Error opening qualification card:', error);
                      alert(error.message || 'Nie udało się otworzyć karty kwalifikacyjnej. Spróbuj ponownie.');
                    }
                  }}
                  className="w-full px-1.5 sm:px-2 py-1 sm:py-1.5 bg-[#03adf0] hover:bg-[#0299d6] text-white text-[10px] sm:text-xs rounded transition-colors text-center"
                >
                  Karta kwalifikacyjna
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
                      <span>Wgraj podpisaną kartę kwalifikacyjną</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        */}
      </div>

      {/* Collapsible: tylko przycisk rezygnacja (na stronie szczegółów) */}
      {isDetailsExpanded && isDetailPage && (
        <>
          <DashedLine />
          <div className="space-y-1.5 sm:space-y-2">
            <button
              onClick={() => setShowCancellationModal(true)}
              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-[#03adf0] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#0288c7] transition-colors"
            >
              rezygnacja
            </button>
          </div>
        </>
      )}

      {/* Historia wpłat – zawsze widoczna (lista i szczegóły), pod Upoważnieniami */}
      <DashedLine />
      <div>
        <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Historia wpłat</h4>
        {paymentHistory.length > 0 ? (
          <div className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs text-gray-600">
            {paymentHistory.map((entry, idx) => {
              const date = new Date(entry.date);
              const formattedDate = date.toLocaleDateString('pl-PL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              const amountStr = new Intl.NumberFormat('pl-PL', {
                style: 'currency',
                currency: 'PLN',
                minimumFractionDigits: 2,
              }).format(entry.amount);
              return (
                <div key={`pay-${idx}`} className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{formattedDate}</div>
                    <div>{entry.label}</div>
                  </div>
                  <div className="font-medium text-gray-900">{amountStr}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-[10px] sm:text-xs text-gray-500">Brak wpłat</div>
        )}
      </div>

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

      {/* Cancellation Modal */}
      <UniversalModal
        isOpen={showCancellationModal}
        title="Rezygnacja z rezerwacji"
        onClose={() => setShowCancellationModal(false)}
        maxWidth="md"
      >
        <div className="p-6">
          <div className="space-y-4">
            <p className="text-sm sm:text-base text-gray-700">
              Aby zrezygnować z rezerwacji, prosimy o kontakt z nami:
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-[#03adf0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-900 mb-1">Napisz do nas</p>
                  <a
                    href="mailto:lato@radsas-fun.pl"
                    className="text-sm sm:text-base text-[#03adf0] hover:text-[#0288c7] hover:underline"
                  >
                    lato@radsas-fun.pl
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-[#03adf0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-900 mb-1">Zadzwoń do nas</p>
                  <a
                    href="tel:+48513726102"
                    className="text-sm sm:text-base text-[#03adf0] hover:text-[#0288c7] hover:underline"
                  >
                    +48 513 726 102
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs sm:text-sm text-gray-600">
                Odpowiemy na Twoją wiadomość najszybciej jak to możliwe i pomożemy w procesie rezygnacji.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-gray-200">
            <button
              onClick={() => setShowCancellationModal(false)}
              className="px-4 sm:px-6 py-2 text-sm sm:text-base text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
              style={{ borderRadius: 0 }}
            >
              Zamknij
            </button>
          </div>
        </div>
      </UniversalModal>
    </div>
  );
}