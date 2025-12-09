'use client';

import { useEffect, useState } from 'react';
import { FileText, Download, CheckCircle, XCircle, Calendar, Loader2 } from 'lucide-react';
import { reservationService, type ReservationResponse } from '@/lib/services/ReservationService';
import { contractService } from '@/lib/services/ContractService';
import { qualificationCardService, type QualificationCardResponse } from '@/lib/services/QualificationCardService';

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
        
        // Map contracts to documents
        const contractsList: Document[] = contracts.map((contract) => {
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
                year: 'numeric'
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
        
        // Map qualification cards to documents
        const qualificationCardsList: Document[] = qualificationCards.map((card) => {
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
                year: 'numeric'
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
      {/* Documents Section */}
      <div>
        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
          Dokumenty do pobrania
        </h3>
        
        {documents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Brak dostępnych dokumentów</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                      Typ dokumentu
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
                  {documents.map((document) => (
                    <tr key={document.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          {document.type === 'contract' ? 'Umowa' : 
                           document.type === 'qualification_card' ? 'Karta kwalifikacyjna' : 
                           'Inny dokument'}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                          {document.date}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                        <div>
                          <div className="font-medium text-gray-900">{document.reservationName}</div>
                          <div className="text-[10px] sm:text-xs text-gray-500">{document.participantName}</div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">
                        {document.amount.toFixed(2)} zł
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <div className="flex items-center gap-2">
                          {document.type === 'contract' && document.contract_status && (
                            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${
                              document.contract_status === 'approved' ? 'bg-green-500' : 'bg-yellow-400'
                            }`} title={
                              document.contract_status === 'approved' ? 'Umowa zatwierdzona' :
                              document.contract_status === 'rejected' ? 'Umowa niezatwierdzona' :
                              'Umowa oczekuje na zatwierdzenie'
                            }></div>
                          )}
                          {getStatusBadge(document.status)}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <button
                          onClick={() => handleDownloadDocument(document)}
                          disabled={document.status !== 'available' || downloadingIds.has(document.id)}
                          className="flex items-center gap-1 text-[#03adf0] text-[10px] sm:text-xs hover:text-[#0288c7] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {downloadingIds.has(document.id) ? (
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
    </div>
  );
}

