'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Download, Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import DashedLine from '../DashedLine';
import { contractService } from '@/lib/services/ContractService';
import { qualificationCardService, QualificationCardResponse } from '@/lib/services/QualificationCardService';
import { certificateService, CertificateResponse } from '@/lib/services/CertificateService';
import { ReservationResponse } from '@/lib/services/ReservationService';
import { paymentService, PaymentResponse } from '@/lib/services/PaymentService';
import UniversalModal from '../admin/UniversalModal';

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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileHistory, setFileHistory] = useState<FileHistoryItem[]>([]);
  const [isFullyPaid, setIsFullyPaid] = useState(false);
  const [hasContract, setHasContract] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const certificateInputRef = useRef<HTMLInputElement>(null);

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
            id: `qualification-${card.id}`,
            type: 'qualification_card',
            name: card.file_name,
            date: card.uploaded_at,
            fileUrl: card.file_url
          });
        }
      } catch (error) {
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
              fileUrl: cert.file_url
            });
          });
        }
      } catch (error) {
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
            fileUrl: contractService.getContractDownloadUrl(reservationIdNum)
          });
        }
      } catch (error) {
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
    }
  }, [reservationId]);

  const loadQualificationCard = async () => {
    if (!isValidReservationId) return;
    
    try {
      setLoadingCard(true);
      const card = await qualificationCardService.getQualificationCard(reservationIdNum);
      setQualificationCard(card); // Will be null if card doesn't exist (404)
    } catch (error: any) {
      // Only log unexpected errors (not 404)
      console.error('Error loading qualification card:', error);
      setQualificationCard(null);
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
      
      // Generate contract if it doesn't exist, then download
      // The backend endpoint will generate it automatically if needed
      await contractService.downloadContract(reservationIdNum);
      
      // After successful generation and download, redirect to downloads tab
      router.push('/profil/do-pobrania');
    } catch (error) {
      console.error('Error generating/downloading contract:', error);
      alert('Nie udało się wygenerować/pobrać umowy. Spróbuj ponownie.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadClick = () => {
    setShowUploadModal(true);
    setUploadError(null);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.pdf')) {
      setUploadError('Tylko pliki PDF są dozwolone');
      return;
    }

    // Validate file size (e.g., max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Plik jest zbyt duży. Maksymalny rozmiar to 10MB');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      const result = await qualificationCardService.uploadQualificationCard(reservationIdNum, file);
      setQualificationCard({
        id: result.id,
        reservation_id: result.reservation_id,
        file_path: '',
        file_name: result.file_name,
        uploaded_at: result.uploaded_at,
        updated_at: result.uploaded_at,
        file_url: result.file_url
      });
      
      // Add to file history
      const newHistory = [...fileHistory, {
        id: `qualification-${result.id}`,
        type: 'qualification_card' as const,
        name: 'Karta kwalifikacyjna',
        date: result.uploaded_at,
        fileUrl: result.file_url
      }];
      setFileHistory(newHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      
      setShowUploadModal(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading qualification card:', error);
      setUploadError(error.message || 'Nie udało się przesłać karty kwalifikacyjnej. Spróbuj ponownie.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadCard = async () => {
    if (!qualificationCard) return;
    
    try {
      const blob = await qualificationCardService.downloadQualificationCard(qualificationCard.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = qualificationCard.file_name;
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
      console.error('Error downloading qualification card:', error);
      alert('Nie udało się pobrać karty kwalifikacyjnej. Spróbuj ponownie.');
    }
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
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-400 rounded-full" />
            </div>
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              <p className="text-[10px] sm:text-xs text-gray-600 text-center">Umowa</p>
              <button 
                onClick={handleDownloadContract}
                disabled={isGenerating}
                className="w-full px-1.5 sm:px-2 py-1 sm:py-1.5 border border-gray-300 text-[10px] sm:text-xs rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Generowanie...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3" />
                    <span>Pobierz umowę</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Qualification Card */}
        <div>
          <p className="text-[10px] sm:text-xs font-medium text-gray-700 mb-1 sm:mb-2">Karta kwalifikacyjna</p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 bg-white relative">
            <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2">
              {qualificationCard ? (
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full" />
              ) : (
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full" />
              )}
            </div>
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              <p className="text-[10px] sm:text-xs text-gray-600 text-center">
                {loadingCard ? 'Ładowanie...' : (qualificationCard ? 'Karta kwalifikacyjna' : 'Karta kwalifikacyjna')}
              </p>
              <button 
                onClick={handleUploadClick}
                className="w-full px-1.5 sm:px-2 py-1 sm:py-1.5 border border-gray-300 text-[10px] sm:text-xs rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                <Upload className="w-3 h-3" />
                <span>dodaj</span>
              </button>
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
                    minute: '2-digit'
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
                      certificateService.uploadCertificate(reservationIdNum, file)
                    );
                    
                    const uploadedCertificates = await Promise.all(uploadPromises);
                    
                    // Reload file history
                    const loadFileHistory = async () => {
                      const history: FileHistoryItem[] = [];
                      
                      // Reload qualification card
                      try {
                        const card = await qualificationCardService.getQualificationCard(reservationIdNum);
                        // Card can be null if it doesn't exist - that's OK
                        if (card) {
                          history.push({
                            id: `qualification-${card.id}`,
                            type: 'qualification_card',
                            name: card.file_name,
                            date: card.uploaded_at,
                            fileUrl: card.file_url
                          });
                        }
                      } catch (error) {
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
                              fileUrl: cert.file_url
                            });
                          });
                        }
                      } catch (error) {
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
                            fileUrl: contractService.getContractDownloadUrl(reservationIdNum)
                          });
                        }
                      } catch (error) {
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

      {/* Upload Qualification Card Modal */}
      <UniversalModal
        isOpen={showUploadModal}
        title="Prześlij kartę kwalifikacyjną"
        onClose={() => {
          setShowUploadModal(false);
          setUploadError(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
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
              <label htmlFor="qualification-card-file" className="block text-sm font-medium text-gray-700 mb-2">
                Wybierz plik PDF <span className="text-red-500">*</span>
              </label>
              <input
                id="qualification-card-file"
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                disabled={uploading}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm"
                style={{ borderRadius: 0 }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Tylko pliki PDF. Maksymalny rozmiar: 10MB
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
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
    </div>
  );
}

