'use client';

import { FileText, Download, CheckCircle, XCircle, Calendar, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { contractService } from '@/lib/services/ContractService';
import { qualificationCardService } from '@/lib/services/QualificationCardService';
import { reservationService, type ReservationResponse } from '@/lib/services/ReservationService';

interface Document {
  id: string;
  type: 'contract' | 'qualification_card' | 'invoice';
  name: string;
  reservationId: number;
  reservationName: string;
  participantName: string;
  date: string;
  amount: number;
  status: 'available' | 'pending' | 'unavailable';
  contract_status?: string | null; // 'pending', 'approved', 'rejected'
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

  // Load user's contracts from backend
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get user's contracts (existing contracts from output directory)
        const contracts = await contractService.listMyContracts();

        // Get user's qualification cards
        const qualificationCards = await qualificationCardService.listMyQualificationCards();

        // Get user's reservations to get contract_status
        const reservations: ReservationResponse[] = await reservationService.getMyReservations(0, 100);
        const reservationsMap = new Map(reservations.map(r => [r.id, r]));

        // Group contracts and qualification cards by reservation_id to ensure only one of each per reservation
        const contractsByReservation = new Map<number, typeof contracts[0]>();
        const cardsByReservation = new Map<number, typeof qualificationCards[0]>();

        // Keep only the most recent contract per reservation
        contracts.forEach((contract) => {
          const existing = contractsByReservation.get(contract.reservation_id);
          if (!existing || new Date(contract.created_at) > new Date(existing.created_at)) {
            contractsByReservation.set(contract.reservation_id, contract);
          }
        });

        // Keep only the most recent qualification card per reservation
        qualificationCards.forEach((card) => {
          const existing = cardsByReservation.get(card.reservation_id);
          if (!existing || new Date(card.created_at) > new Date(existing.created_at)) {
            cardsByReservation.set(card.reservation_id, card);
          }
        });

        // Map contracts to documents (only one per reservation)
        const contractsList: Document[] = Array.from(contractsByReservation.values()).map((contract) => {
          const reservation = reservationsMap.get(contract.reservation_id);
          const participantName = contract.participant_first_name && contract.participant_last_name
            ? `${contract.participant_first_name} ${contract.participant_last_name}`
            : 'Brak danych';

          const campName = contract.camp_name || 'Brak danych';

          // Format date from contract created_at
          let dateStr = 'Brak daty';
          if (contract.created_at) {
            const date = new Date(contract.created_at);
            if (!isNaN(date.getTime())) {
              dateStr = date.toLocaleDateString('pl-PL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });
            }
          }

          return {
            id: `contract-${contract.reservation_id}`,
            type: 'contract' as const,
            name: `Umowa - ${campName}`,
            reservationId: contract.reservation_id,
            reservationName: campName,
            participantName: participantName,
            date: dateStr,
            amount: contract.total_price || 0,
            status: 'available' as const, // Contract exists, so it's available
            contract_status: (reservation && reservation.contract_status) ? reservation.contract_status : null,
          };
        });

        // Map qualification cards to documents (only one per reservation)
        const qualificationCardsList: Document[] = Array.from(cardsByReservation.values()).map((card) => {
          const reservation = reservationsMap.get(card.reservation_id);
          const participantName = card.participant_first_name && card.participant_last_name
            ? `${card.participant_first_name} ${card.participant_last_name}`
            : 'Brak danych';

          const campName = card.camp_name || 'Brak danych';

          // Format date from card created_at
          let dateStr = 'Brak daty';
          if (card.created_at) {
            const date = new Date(card.created_at);
            if (!isNaN(date.getTime())) {
              dateStr = date.toLocaleDateString('pl-PL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });
            }
          }

          return {
            id: `qualification-card-${card.reservation_id}`,
            type: 'qualification_card' as const,
            name: `Karta kwalifikacyjna - ${campName}`,
            reservationId: card.reservation_id,
            reservationName: campName,
            participantName: participantName,
            date: dateStr,
            amount: reservation?.total_price || 0,
            status: 'available' as const, // Card exists, so it's available
          };
        });

        // Combine all documents
        const documentsList: Document[] = [...contractsList, ...qualificationCardsList];

        // Sort by date (newest first)
        documentsList.sort((a, b) => {
          const dateA = new Date(a.date.split('.').reverse().join('-'));
          const dateB = new Date(b.date.split('.').reverse().join('-'));
          return dateB.getTime() - dateA.getTime();
        });

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
      try {
        setDownloadingIds(prev => new Set(prev).add(document.id));
        await contractService.downloadContract(document.reservationId);

        // Show important information about contract signing
        alert('WAŻNE:\n\n• Masz 2 dni na wgranie podpisanej umowy do systemu.\n• Możesz podpisać umowę odręcznie lub podpisem zaufanym.\n• MUSISZ odesłać PODPISANĄ umowę.');
      } catch (error) {
        console.error('Error downloading contract:', error);
        alert('Nie udało się pobrać dokumentu. Spróbuj ponownie.');
      } finally {
        setDownloadingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(document.id);
          return newSet;
        });
      }
    } else if (document.type === 'qualification_card') {
      try {
        setDownloadingIds(prev => new Set(prev).add(document.id));
        await qualificationCardService.downloadQualificationCard(document.reservationId);

        // Show important information about qualification card
        // Get reservation to check if has second parent
        const reservations: ReservationResponse[] = await reservationService.getMyReservations(0, 100);
        const reservation = reservations.find(r => r.id === document.reservationId);
        const hasSecondParent = reservation?.parents_data && Array.isArray(reservation.parents_data) && reservation.parents_data.length > 1;

        alert(`WAŻNE INFORMACJE O KARCIE KWALIFIKACYJNEJ:\n\n` +
              `• Karta jest uzupełniona na podstawie rezerwacji.\n` +
              `• MUSISZ uzupełnić pozostałe dane: PESEL (jeśli nie został podany) oraz informacje o chorobach/zdrowiu.\n` +
              `• MUSISZ odesłać PODPISANĄ kartę kwalifikacyjną.\n` +
              `• Masz 2 dni na wgranie podpisanej karty do systemu.\n` +
              `• Możesz podpisać kartę odręcznie lub podpisem zaufanym.\n${
              hasSecondParent ? '• W karcie muszą być dane obojga rodziców/opiekunów.\n' : ''}`);
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

  // Group documents by reservation
  const documentsByReservation = new Map<number, { reservation: Document, documents: Document[] }>();

  documents.forEach((doc) => {
    if (!documentsByReservation.has(doc.reservationId)) {
      documentsByReservation.set(doc.reservationId, {
        reservation: doc,
        documents: [],
      });
    }
    documentsByReservation.get(doc.reservationId)!.documents.push(doc);
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Documents Section */}
      <div>
        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
          Dokumenty do pobrania
        </h3>

        {documentsByReservation.size === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Brak dostępnych dokumentów</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(documentsByReservation.entries()).map(([reservationId, { reservation, documents: reservationDocs }]) => {
              const isExpanded = expandedReservations.has(reservationId);
              const hasContract = reservationDocs.some(d => d.type === 'contract');
              const hasCard = reservationDocs.some(d => d.type === 'qualification_card');

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
                            {reservation.participantName} • {reservation.amount.toFixed(2)} zł
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
                                    {document.type === 'contract' ? 'Umowa' :
                                     document.type === 'qualification_card' ? 'Karta kwalifikacyjna' :
                                     'Inny dokument'}
                                  </span>
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

