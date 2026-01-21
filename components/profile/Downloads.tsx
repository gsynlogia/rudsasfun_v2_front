'use client';

import { FileText, Download, CheckCircle, XCircle, Calendar, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { contractService } from '@/lib/services/ContractService';
import { qualificationCardService } from '@/lib/services/QualificationCardService';
import { reservationService, type ReservationResponse } from '@/lib/services/ReservationService';
import { API_BASE_URL } from '@/utils/api-config';

interface Document {
  id: string;
  type: 'contract' | 'qualification_card' | 'invoice' | 'uploaded_contract' | 'uploaded_qualification_card' | 'cms_document';
  name: string;
  reservationId?: number;
  reservationName?: string;
  participantName?: string;
  date: string;
  amount?: number;
  status: 'available' | 'pending' | 'unavailable';
  contract_status?: string | null; // 'pending', 'approved', 'rejected'
  fileId?: number; // For uploaded files
  source?: string; // 'user' or 'system'
  fileUrl?: string; // For CMS documents
  isHtml?: boolean; // True if document is HTML (for contracts/cards)
}

/**
 * Downloads Component
 * Displays all downloadable documents except invoices (contracts, etc.)
 */
export default function Downloads() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  // Load user's contracts from backend
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get user's reservations to get contract_status
        const reservations: ReservationResponse[] = await reservationService.getMyReservations(0, 1000);
        const reservationsMap = new Map(reservations.map(r => [r.id, r]));
        
        // Store reservations for later use
        const reservationsList = reservations;

        // Fetch contract files; systemowe zamieniamy na link HTML, user-uploads zostawiamy do pobrania
        const allContractsList: Document[] = [];
        
        for (const reservation of reservations) {
          try {
            // Get ALL contract files for this reservation (both system-generated and user-uploaded)
            const contractFiles = await contractService.getContractFiles(reservation.id);
            const campName = reservation.camp_name || 'Brak danych';
            const participantName = reservation.participant_first_name && reservation.participant_last_name
              ? `${reservation.participant_first_name} ${reservation.participant_last_name}`
              : 'Brak danych';

            // User-uploaded contracts (zostawiamy do pobrania)
            contractFiles
              .filter(file => file.source === 'user')
              .forEach((file) => {
                const date = new Date(file.uploaded_at);
                const dateStr = date.toLocaleDateString('pl-PL', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                });
                
                allContractsList.push({
                  id: `uploaded-contract-${file.id}`,
                  type: 'uploaded_contract',
                  name: `Umowa wgrana (${dateStr}) - ${campName}`,
                  reservationId: reservation.id,
                  reservationName: campName,
                  participantName,
                  date: dateStr,
                  amount: reservation.total_price || 0,
                  status: 'available',
                  fileId: file.id,
                  source: file.source,
                  contract_status: reservation.contract_status || null,
                });
              });

            // Systemowe kontrakty prezentujemy jako HTML link (zawsze)
            const dateStr = reservation.created_at
              ? new Date(reservation.created_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            allContractsList.push({
              id: `contract-html-${reservation.id}`,
              type: 'contract',
              name: `Umowa (HTML) - ${campName}`,
              reservationId: reservation.id,
              reservationName: campName,
              participantName,
              date: dateStr,
              amount: reservation.total_price || 0,
              status: 'available',
              source: 'system',
              contract_status: reservation.contract_status || null,
              isHtml: true,
            });
          } catch (error) {
            // Ignore errors for individual reservations
            console.error(`Error loading contract files for reservation ${reservation.id}:`, error);
          }
        }

        // Pobierz listę kart kwalifikacyjnych (do fallbacku, gdy brak plików)
        let userQualificationCards: Awaited<ReturnType<typeof qualificationCardService.listMyQualificationCards>> = [];
        try {
          userQualificationCards = await qualificationCardService.listMyQualificationCards();
        } catch (error) {
          console.error('Error loading user qualification cards list:', error);
        }

        // Fetch ALL qualification card files for each reservation (both SYSTEM and USER)
        const allQualificationCardsList: Document[] = [];
        
        for (const reservation of reservations) {
          const campName = reservation.camp_name || 'Brak danych';
          const participantName = reservation.participant_first_name && reservation.participant_last_name
            ? `${reservation.participant_first_name} ${reservation.participant_last_name}`
            : 'Brak danych';

          let cardFiles: Awaited<ReturnType<typeof qualificationCardService.getQualificationCardFiles>> = [];
          let cardFromGet: Awaited<ReturnType<typeof qualificationCardService.getQualificationCard>> | null = null;
          let hasHtmlEndpoint = false;
          try {
            cardFiles = await qualificationCardService.getQualificationCardFiles(reservation.id);
          } catch (error) {
            console.error(`Error loading qualification card files for reservation ${reservation.id}:`, error);
          }
          try {
            cardFromGet = await qualificationCardService.getQualificationCard(reservation.id);
          } catch (error) {
            console.error(`Error loading qualification card (single) for reservation ${reservation.id}:`, error);
          }
          try {
            const { authService } = await import('@/lib/services/AuthService');
            const token = authService.getToken();
            if (token) {
              const htmlResp = await fetch(`${API_BASE_URL}/api/qualification-cards/${reservation.id}/html`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              hasHtmlEndpoint = htmlResp.ok;
            }
          } catch (error) {
            console.error(`Error probing qualification card HTML for reservation ${reservation.id}:`, error);
          }

          cardFiles.forEach((file) => {
            const date = new Date(file.uploaded_at);
            const dateStr = date.toLocaleDateString('pl-PL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });
            
            // Determine document type based on source
            const isSystem = file.source === 'system';
            const documentType = isSystem ? 'qualification_card' as const : 'uploaded_qualification_card' as const;
            
            allQualificationCardsList.push({
              id: `${isSystem ? 'qualification-card' : 'uploaded-card'}-${file.id}`,
              type: documentType,
              name: isSystem 
                ? `Karta kwalifikacyjna wygenerowana (${dateStr}) - ${campName}`
                : `Karta kwalifikacyjna wgrana (${dateStr}) - ${campName}`,
              reservationId: reservation.id,
              reservationName: campName,
              participantName: participantName,
              date: dateStr,
              amount: reservation.total_price || 0,
              status: 'available' as const,
              fileId: file.id,
              source: file.source,
            });
          });

          // Dodaj wpis HTML jeśli istnieje systemowa karta (wygenerowana) lub lista /my zwraca kartę
          const hasSystemCard = cardFiles.some(f => f.source === 'system');
          const hasCardFromList = userQualificationCards.some(c => c.reservation_id === reservation.id);
          const hasCardSingle = !!cardFromGet;
          const hasStatus = !!reservation.qualification_card_status;
          if (hasSystemCard || hasCardFromList || hasCardSingle || hasStatus || hasHtmlEndpoint) {
            const dateStr = reservation.created_at
              ? new Date(reservation.created_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });

            allQualificationCardsList.push({
              id: `qualification-card-html-${reservation.id}`,
              type: 'qualification_card',
              name: `Karta kwalifikacyjna (HTML) - ${campName}`,
              reservationId: reservation.id,
              reservationName: campName,
              participantName,
              date: dateStr,
              amount: reservation.total_price || 0,
              status: 'available' as const,
              source: 'system',
              isHtml: true,
            });
          }
        }

        // Fetch public documents from CMS
        const cmsDocumentsList: Document[] = [];
        try {
          const { API_BASE_URL } = await import('@/utils/api-config');
          const response = await fetch(`${API_BASE_URL}/api/documents/public`);
          if (response.ok) {
            const data = await response.json();
            if (data.documents && Array.isArray(data.documents)) {
              data.documents.forEach((doc: any) => {
                cmsDocumentsList.push({
                  id: `cms-document-${doc.id}`,
                  type: 'cms_document' as const,
                  name: doc.display_name,
                  date: new Date(doc.created_at).toLocaleDateString('pl-PL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  }),
                  status: 'available' as const,
                  fileUrl: doc.file_url,
                });
              });
            }
          }
        } catch (error) {
          console.error('Error loading CMS documents:', error);
        }

        // Combine all documents
        const documentsList: Document[] = [...allContractsList, ...allQualificationCardsList, ...cmsDocumentsList];

        // Sort by reservation ID first, then by uploaded_at timestamp within each reservation (newest first)
        // We need to use the actual uploaded_at from the files, not the formatted date string
        // So we'll sort after grouping by reservation

        setDocuments(documentsList);
      } catch (err) {
        console.error('Error loading documents:', err);
        setError(err instanceof Error ? err.message : 'Nie udało się załadować dokumentów');
        setDocuments([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, []);

  const handleDownloadDocument = async (document: Document) => {
    if (document.type === 'contract') {
      // Systemowa umowa: otwieramy HTML w nowej karcie; dla wgranych plików (user/system) zostawiamy download
      if (document.isHtml && document.reservationId) {
        try {
        const reservations: ReservationResponse[] = await reservationService.getMyReservations(0, 1000);
          const reservation = reservations.find(r => r.id === document.reservationId);
          if (reservation) {
            const formatReservationNumber = (reservationId: number, createdAt: string) => {
              const year = new Date(createdAt).getFullYear();
              const paddedId = String(reservationId).padStart(3, '0');
              return `REZ-${year}-${paddedId}`;
            };
            const reservationNumber = formatReservationNumber(document.reservationId, reservation.created_at);
            const url = `/profil/aktualne-rezerwacje/${reservationNumber}/umowa`;
            window.open(url, '_blank');
            return;
          }
        } catch (error) {
          console.error('Error opening contract HTML:', error);
        }
      }

      try {
        setDownloadingIds(prev => new Set(prev).add(document.id));
        if (document.fileId && document.fileId > 0) {
          await contractService.downloadContractFile(document.fileId);
        } else if (document.reservationId) {
          await contractService.downloadContract(document.reservationId);
        } else {
          throw new Error('Brak danych umowy');
        }
      } catch (error) {
        console.error('Error downloading contract:', error);
        alert('Nie udało się pobrać umowy. Spróbuj ponownie.');
      } finally {
        setDownloadingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(document.id);
          return newSet;
        });
      }
    } else if (document.type === 'uploaded_contract') {
      // Download specific uploaded file by ID
      if (!document.fileId || document.fileId <= 0) {
        alert('Błąd: brak ID pliku do pobrania');
        return;
      }
      try {
        setDownloadingIds(prev => new Set(prev).add(document.id));
        await contractService.downloadContractFile(document.fileId);
      } catch (error) {
        console.error('Error downloading uploaded contract:', error);
        alert('Nie udało się pobrać wgranej umowy. Spróbuj ponownie.');
      } finally {
        setDownloadingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(document.id);
          return newSet;
        });
      }
    } else if (document.type === 'qualification_card') {
      // For HTML qualification cards, open in new tab instead of downloading
      if (document.isHtml && document.reservationId) {
        try {
          const reservations: ReservationResponse[] = await reservationService.getMyReservations(0, 100);
          const reservation = reservations.find(r => r.id === document.reservationId);
          if (reservation) {
            const formatReservationNumber = (reservationId: number, createdAt: string) => {
              const year = new Date(createdAt).getFullYear();
              const paddedId = String(reservationId).padStart(3, '0');
              return `REZ-${year}-${paddedId}`;
            };
            const reservationNumber = formatReservationNumber(document.reservationId, reservation.created_at);
            const url = `/profil/aktualne-rezerwacje/${reservationNumber}/karta-kwalifikacyjna`;
            window.open(url, '_blank');
            return;
          }
        } catch (error) {
          console.error('Error opening qualification card HTML:', error);
        }
      }
      
      // Download specific qualification card file by ID (system-generated)
      if (!document.fileId) {
        alert('Błąd: brak ID pliku do pobrania');
        return;
      }
      try {
        setDownloadingIds(prev => new Set(prev).add(document.id));
        await qualificationCardService.downloadQualificationCardFile(document.fileId);
      } catch (error) {
        console.error('Error downloading qualification card:', error);
        alert('Nie udało się pobrać karty kwalifikacyjnej. Spróbuj ponownie.');
      } finally {
        setDownloadingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(document.id);
          return newSet;
        });
      }
    } else if (document.type === 'uploaded_qualification_card') {
      // Download specific uploaded file by ID
      if (!document.fileId) {
        alert('Błąd: brak ID pliku do pobrania');
        return;
      }
      try {
        setDownloadingIds(prev => new Set(prev).add(document.id));
        await qualificationCardService.downloadQualificationCardFile(document.fileId);
      } catch (error) {
        console.error('Error downloading uploaded qualification card:', error);
        alert('Nie udało się pobrać wgranej karty kwalifikacyjnej. Spróbuj ponownie.');
      } finally {
        setDownloadingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(document.id);
          return newSet;
        });
      }
    } else if (document.type === 'cms_document') {
      // Download CMS document
      if (!document.fileUrl) {
        alert('Błąd: brak URL pliku do pobrania');
        return;
      }
      try {
        setDownloadingIds(prev => new Set(prev).add(document.id));
        const response = await fetch(document.fileUrl);
        if (!response.ok) {
          throw new Error('Nie udało się pobrać pliku');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = document.name || 'dokument';
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
      } catch (error) {
        console.error('Error downloading CMS document:', error);
        alert('Nie udało się pobrać dokumentu. Spróbuj ponownie.');
      } finally {
        setDownloadingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(document.id);
          return newSet;
        });
      }
    } else {
      // TODO: Handle other document types when implemented
      alert('Pobieranie tego typu dokumentu będzie wkrótce dostępne.');
    }
  };

  const [expandedReservations, setExpandedReservations] = useState<Set<number>>(new Set());

  const toggleReservation = (reservationId: number) => {
    setExpandedReservations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reservationId)) {
        newSet.delete(reservationId);
      } else {
        newSet.add(reservationId);
      }
      return newSet;
    });
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

  // Separate CMS documents from reservation documents
  const cmsDocuments = documents.filter(doc => doc.type === 'cms_document');
  const reservationDocuments = documents.filter(doc => doc.type !== 'cms_document' && doc.reservationId);

  // Group documents by reservation
  const documentsByReservation = new Map<number, { reservation: Document, documents: Document[] }>();

  reservationDocuments.forEach((doc) => {
    if (doc.reservationId && !documentsByReservation.has(doc.reservationId)) {
      documentsByReservation.set(doc.reservationId, {
        reservation: doc,
        documents: [],
      });
    }
    if (doc.reservationId) {
      documentsByReservation.get(doc.reservationId)!.documents.push(doc);
    }
  });

  // Sort documents within each reservation by date (newest first)
  documentsByReservation.forEach(({ documents: reservationDocs }) => {
    reservationDocs.sort((a, b) => {
      // Parse dates and compare (newest first)
      const dateA = new Date(a.date.split('.').reverse().join('-'));
      const dateB = new Date(b.date.split('.').reverse().join('-'));
      return dateB.getTime() - dateA.getTime();
    });
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Documents Section */}
      <div>
        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
          Dokumenty do pobrania
        </h3>

        {/* CMS Documents Section */}
        {cmsDocuments.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm sm:text-base font-semibold text-gray-800 mb-3">Dokumenty ogólne</h4>
            <div className="space-y-2">
              {cmsDocuments.map((doc) => (
                <div key={doc.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        <span className="text-sm sm:text-base font-medium text-gray-900">{doc.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                          {doc.date}
                        </div>
                      </div>
                      {getStatusBadge(doc.status)}
                    </div>
                    <button
                      onClick={() => handleDownloadDocument(doc)}
                      disabled={doc.status !== 'available' || downloadingIds.has(doc.id)}
                      className="ml-4 flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#03adf0] text-white text-xs sm:text-sm rounded hover:bg-[#0288c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {downloadingIds.has(doc.id) ? (
                        <>
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                          <span className="hidden sm:inline">Pobieranie...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Pobierz</span>
                          <span className="sm:hidden">Pobierz</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {documentsByReservation.size === 0 && cmsDocuments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Brak dostępnych dokumentów</p>
          </div>
        ) : documentsByReservation.size > 0 ? (
          <div className="space-y-4">
            {Array.from(documentsByReservation.entries()).map(([reservationId, { reservation, documents: reservationDocs }]) => {
              const isExpanded = expandedReservations.has(reservationId);
              const hasContract = reservationDocs.some(d => d.type === 'contract' || d.type === 'uploaded_contract');
              const hasCard = reservationDocs.some(d => d.type === 'qualification_card' || d.type === 'uploaded_qualification_card');

              return (
                <div key={reservationId} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                  {/* Reservation Header - Clickable */}
                  <button
                    onClick={() => toggleReservation(reservationId)}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`}>
                          <svg className="w-full h-full text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold text-sm sm:text-base text-gray-900">
                            {reservation.reservationName}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500 mt-0.5">
                            {reservation.participantName} • {reservation.amount?.toFixed(2) || '0.00'} zł
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 ml-4">
                      <div className="flex items-center gap-2">
                        {hasContract && (
                          <span className="text-xs sm:text-sm text-gray-600 bg-blue-50 px-2 py-1 rounded">
                            Umowa
                          </span>
                        )}
                        {hasCard && (
                          <span className="text-xs sm:text-sm text-gray-600 bg-green-50 px-2 py-1 rounded">
                            Karta
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content - Documents */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      <div className="p-4 sm:p-6 space-y-4">
                        {reservationDocs.map((document) => (
                          <div key={document.id} className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                  <span className="font-medium text-sm sm:text-base text-gray-900">
                                    {document.type === 'contract' ? (document.isHtml ? 'Umowa (HTML)' : 'Umowa wygenerowana') :
                                     document.type === 'qualification_card' ? (document.isHtml ? 'Karta kwalifikacyjna (HTML)' : 'Karta kwalifikacyjna wygenerowana') :
                                     document.type === 'uploaded_contract' ? 'Umowa wgrana' :
                                     document.type === 'uploaded_qualification_card' ? 'Karta kwalifikacyjna wgrana' :
                                     'Inny dokument'}
                                  </span>
                                  {document.source && (
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                      document.source === 'system' 
                                        ? 'bg-blue-100 text-blue-700' 
                                        : 'bg-green-100 text-green-700'
                                    }`}>
                                      {document.source === 'system' ? 'Wygenerowana' : 'Wgrana'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-600 mb-3">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                    {document.date}
                                  </div>
                                  {document.type === 'contract' && document.contract_status && (
                                    <div className={`flex items-center gap-1.5 ${
                                      document.contract_status === 'approved' ? 'text-green-600' :
                                      document.contract_status === 'rejected' ? 'text-red-600' :
                                      'text-yellow-600'
                                    }`}>
                                      <div className={`w-2 h-2 rounded-full ${
                                        document.contract_status === 'approved' ? 'bg-green-500' :
                                        document.contract_status === 'rejected' ? 'bg-red-500' :
                                        'bg-yellow-400'
                                      }`}></div>
                                      {document.contract_status === 'approved' ? 'Zatwierdzona' :
                                       document.contract_status === 'rejected' ? 'Niezatwierdzona' :
                                       'Oczekuje'}
                                    </div>
                                  )}
                                </div>
                                {getStatusBadge(document.status)}
                              </div>
                              <button
                                onClick={() => handleDownloadDocument(document)}
                                disabled={document.status !== 'available' || downloadingIds.has(document.id)}
                                className="ml-4 flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#03adf0] text-white text-xs sm:text-sm rounded hover:bg-[#0288c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {downloadingIds.has(document.id) ? (
                                  <>
                                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                    <span className="hidden sm:inline">Pobieranie...</span>
                                  </>
                                ) : (
                                  <>
                                    {document.isHtml ? (
                                      <>
                                        <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span className="hidden sm:inline">Otwórz</span>
                                        <span className="sm:hidden">Otwórz</span>
                                      </>
                                    ) : (
                                      <>
                                        <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span className="hidden sm:inline">Pobierz</span>
                                        <span className="sm:hidden">Pobierz</span>
                                      </>
                                    )}
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

