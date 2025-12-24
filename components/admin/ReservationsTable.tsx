'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';
import { authenticatedApiCall } from '@/utils/api-auth';

interface BackendReservation {
  id: number;
  participant_first_name: string;
  participant_last_name: string;
  camp_name: string;
  property_name: string;
  status: string;
  total_price: number;
  created_at: string;
  parents_data?: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  }>;
  invoice_email?: string;
}

interface Reservation {
  id: number;
  reservationName: string;
  participantName: string;
  email: string;
  campName: string;
  tripName: string;
  status: string;
  totalPrice: number;
  createdAt: string;
}

const mapBackendToFrontend = (backendReservation: BackendReservation): Reservation => {
  const firstParent = backendReservation.parents_data && backendReservation.parents_data.length > 0 
    ? backendReservation.parents_data[0] 
    : null;
  
  const participantName = `${backendReservation.participant_first_name || ''} ${backendReservation.participant_last_name || ''}`.trim();
  const email = firstParent?.email || backendReservation.invoice_email || '';
  
  // Map status
  let status = backendReservation.status || 'pending';
  if (status === 'pending') status = 'aktywna';
  if (status === 'cancelled') status = 'anulowana';
  if (status === 'completed') status = 'zakończona';
  
  return {
    id: backendReservation.id,
    reservationName: `REZ-${new Date(backendReservation.created_at).getFullYear()}-${String(backendReservation.id).padStart(3, '0')}`,
    participantName: participantName || 'Brak danych',
    email: email,
    campName: backendReservation.camp_name || 'Nieznany obóz',
    tripName: backendReservation.property_name || 'Nieznany turnus',
    status: status,
    totalPrice: backendReservation.total_price || 0,
    createdAt: backendReservation.created_at.split('T')[0],
  };
};

export default function ReservationsTable() {
  const router = useRouter();
  
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for search, sorting, and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch reservations
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await authenticatedApiCall<BackendReservation[]>('/api/reservations/');
        const mapped = data.map(mapBackendToFrontend);
        setAllReservations(mapped);
      } catch (err) {
        console.error('[ReservationsTable] Error fetching reservations:', err);
        setError(err instanceof Error ? err.message : 'Błąd podczas ładowania rezerwacji');
        setAllReservations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservations();
  }, []);

  // Filter and sort reservations
  const filteredReservations = useMemo(() => {
    let filtered = [...allReservations];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        res =>
          res.reservationName.toLowerCase().includes(query) ||
          res.participantName.toLowerCase().includes(query) ||
          res.email.toLowerCase().includes(query) ||
          res.campName.toLowerCase().includes(query) ||
          res.tripName.toLowerCase().includes(query)
      );
    }

    // Sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortColumn) {
          case 'reservationName':
            aValue = a.reservationName;
            bValue = b.reservationName;
            break;
          case 'participantName':
            aValue = a.participantName;
            bValue = b.participantName;
            break;
          case 'email':
            aValue = a.email;
            bValue = b.email;
            break;
          case 'campName':
            aValue = a.campName;
            bValue = b.campName;
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'totalPrice':
            aValue = a.totalPrice;
            bValue = b.totalPrice;
            break;
          case 'createdAt':
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          default:
            return 0;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else {
          return sortDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
        }
      });
    }

    return filtered;
  }, [searchQuery, sortColumn, sortDirection, allReservations]);

  // Pagination
  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReservations = filteredReservations.slice(startIndex, endIndex);

  // Handle column sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Handle row click - navigate to detail page
  const handleRowClick = (reservation: Reservation) => {
    router.push(`/admin-panel/rezerwacja/${reservation.reservationName}`);
  };

  // Sort icon component
  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
          <div className="text-gray-500">Ładowanie rezerwacji...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-fadeIn">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Rezerwacje</h1>
      </div>

      {/* Search and Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Szukaj rezerwacji..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
            style={{ borderRadius: 0 }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Na stronie:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
            style={{ borderRadius: 0 }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('reservationName')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Numer rezerwacji
                    <SortIcon column="reservationName" />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('participantName')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Uczestnik
                    <SortIcon column="participantName" />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('email')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Email
                    <SortIcon column="email" />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('campName')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Obóz
                    <SortIcon column="campName" />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('status')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Status
                    <SortIcon column="status" />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('totalPrice')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Cena
                    <SortIcon column="totalPrice" />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('createdAt')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Data utworzenia
                    <SortIcon column="createdAt" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedReservations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    Brak rezerwacji do wyświetlenia
                  </td>
                </tr>
              ) : (
                paginatedReservations.map((reservation) => (
                  <tr
                    key={reservation.id}
                    onClick={() => handleRowClick(reservation)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {reservation.reservationName}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {reservation.participantName}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {reservation.email}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-sm text-gray-900">{reservation.campName}</div>
                      <div className="text-sm text-gray-500">{reservation.tripName}</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          reservation.status === 'aktywna'
                            ? 'bg-green-100 text-green-800'
                            : reservation.status === 'anulowana'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {reservation.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {reservation.totalPrice.toFixed(2)} PLN
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {new Date(reservation.createdAt).toLocaleDateString('pl-PL')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Wyświetlanie {startIndex + 1} - {Math.min(endIndex, filteredReservations.length)} z {filteredReservations.length} rezerwacji
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                style={{ borderRadius: 0 }}
              >
                Poprzednia
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                Strona {currentPage} z {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                style={{ borderRadius: 0 }}
              >
                Następna
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


