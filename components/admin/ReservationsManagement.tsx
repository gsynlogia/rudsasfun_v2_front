'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Calendar, Mail, User, MapPin, Building2, Search, ChevronUp, ChevronDown, X, ChevronDown as ChevronDownIcon, Check } from 'lucide-react';

/**
 * Reservations Management Component
 * Displays hardcoded sample reservations data
 * This is a preview component - actual functionality will be implemented later
 * 
 * TODO: Replace hardcoded data with API fetch from backend
 * TODO: Implement server-side filtering and pagination
 */

// Generate random reservations data
const generateReservations = () => {
  const camps = ['Laserowy Paintball', 'Obóz Letni', 'Obóz Zimowy', 'Paintball Extreme', 'Obóz Przygody', 'Camp Adventure', 'Summer Camp', 'Winter Camp'];
  const trips = ['Lato 2022 - Wiele', 'Lato 2023 - Wiele', 'Zima 2023 - Wiele', 'Lato 2024 - Wiele', 'Zima 2024 - Wiele'];
  const statuses = ['aktywna', 'zakończona', 'anulowana'];
  const firstNames = ['Jan', 'Anna', 'Piotr', 'Maria', 'Tomasz', 'Katarzyna', 'Michał', 'Agnieszka', 'Paweł', 'Magdalena', 'Krzysztof', 'Ewa', 'Robert', 'Joanna', 'Marcin', 'Aleksandra', 'Łukasz', 'Natalia', 'Jakub', 'Monika'];
  const lastNames = ['Kowalski', 'Nowak', 'Wiśniewski', 'Zielińska', 'Lewandowski', 'Szymańska', 'Dąbrowski', 'Kozłowska', 'Jankowski', 'Wojcik', 'Krawczyk', 'Mazur', 'Kwiatkowski', 'Nowakowska', 'Pawłowski', 'Górska', 'Michalski', 'Zawadzka', 'Nowicki', 'Jabłońska'];
  
  const reservations = [];
  const startDate = new Date(2024, 0, 1);
  
  for (let i = 1; i <= 100; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const camp = camps[Math.floor(Math.random() * camps.length)];
    const trip = trips[Math.floor(Math.random() * trips.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const date = new Date(startDate);
    date.setDate(date.getDate() + Math.floor(Math.random() * 120));
    
    reservations.push({
      id: i,
      reservationName: `REZ-2024-${String(i).padStart(3, '0')}`,
      participantName: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      campName: camp,
      tripName: trip,
      status: status,
      createdAt: date.toISOString().split('T')[0],
    });
  }
  
  return reservations;
};

export default function ReservationsManagement() {
  // Generate reservations only on client side to avoid hydration mismatch
  const [allReservations, setAllReservations] = useState<Array<{
    id: number;
    reservationName: string;
    participantName: string;
    email: string;
    campName: string;
    tripName: string;
    status: string;
    createdAt: string;
  }>>([]);

  useEffect(() => {
    // Generate data only on client side
    setAllReservations(generateReservations());
  }, []);

  // State for search, filters, sorting, and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [tripFilter, setTripFilter] = useState<string | null>(null);
  const [campFilters, setCampFilters] = useState<string[]>([]); // Changed to array for multi-select
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Multi-select state
  const [isCampSelectOpen, setIsCampSelectOpen] = useState(false);
  const [campSearchQuery, setCampSearchQuery] = useState('');
  const campSelectRef = useRef<HTMLDivElement>(null);

  // Available camp names for filter - extract unique camps from reservations
  const availableCamps = useMemo(() => {
    const camps = new Set(allReservations.map(r => r.campName));
    return Array.from(camps).sort();
  }, [allReservations]);

  // Extract unique trips from reservations
  const availableTrips = useMemo(() => {
    const trips = new Set(allReservations.map(r => r.tripName));
    return Array.from(trips).sort();
  }, [allReservations]);

  // Filter and sort reservations
  const filteredReservations = useMemo(() => {
    let filtered = [...allReservations];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.reservationName.toLowerCase().includes(query) ||
          r.participantName.toLowerCase().includes(query) ||
          r.email.toLowerCase().includes(query) ||
          r.campName.toLowerCase().includes(query) ||
          r.tripName.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Trip filter
    if (tripFilter) {
      filtered = filtered.filter(r => r.tripName === tripFilter);
    }

    // Camp filter (multi-select)
    if (campFilters.length > 0) {
      filtered = filtered.filter(r => campFilters.includes(r.campName));
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
          case 'tripName':
            aValue = a.tripName;
            bValue = b.tripName;
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
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
  }, [searchQuery, statusFilter, tripFilter, campFilters, sortColumn, sortDirection, allReservations]);

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
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Handle filter change
  const handleFilterChange = (filterType: 'status' | 'trip', value: string | null) => {
    if (filterType === 'status') {
      setStatusFilter(value);
    } else if (filterType === 'trip') {
      setTripFilter(value);
    }
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle camp filter (multi-select)
  const handleCampFilterChange = (camp: string) => {
    setCampFilters(prev => {
      if (prev.includes(camp)) {
        return prev.filter(c => c !== camp);
      } else {
        return [...prev, camp];
      }
    });
    setCurrentPage(1);
  };

  // Remove single camp filter
  const removeCampFilter = (camp: string) => {
    setCampFilters(prev => prev.filter(c => c !== camp));
    setCurrentPage(1);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (campSelectRef.current && !campSelectRef.current.contains(event.target as Node)) {
        setIsCampSelectOpen(false);
        setCampSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter camps based on search query
  const filteredCamps = useMemo(() => {
    if (!campSearchQuery) {
      return availableCamps;
    }
    return availableCamps.filter(camp =>
      camp.toLowerCase().includes(campSearchQuery.toLowerCase())
    );
  }, [availableCamps, campSearchQuery]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter(null);
    setTripFilter(null);
    setCampFilters([]);
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aktywna':
        return 'bg-green-100 text-green-800';
      case 'zakończona':
        return 'bg-gray-100 text-gray-800';
      case 'anulowana':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <ChevronUp className="w-4 h-4 text-gray-400 opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-[#03adf0]" />
    ) : (
      <ChevronDown className="w-4 h-4 text-[#03adf0]" />
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-2" style={{ marginTop: 0, paddingTop: 0 }}>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Rezerwacje</h1>
      </div>

      {/* Search Bar */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj po nazwie rezerwacji, uczestniku, email, obozie..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm"
            style={{ borderRadius: 0 }}
          />
        </div>
        {/* TODO: Replace client-side filtering with API fetch when backend is ready */}
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => handleFilterChange('status', statusFilter === 'aktywna' ? null : 'aktywna')}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            statusFilter === 'aktywna'
              ? 'bg-white text-[#03adf0] border-2 border-[#03adf0]'
              : 'bg-white text-[#03adf0] border-2 border-[#03adf0] hover:bg-[#03adf0] hover:text-white'
          }`}
          style={{ borderRadius: 0 }}
        >
          Tylko aktywne
        </button>
        <button
          onClick={() => handleFilterChange('status', statusFilter === 'zakończona' ? null : 'zakończona')}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            statusFilter === 'zakończona'
              ? 'bg-white text-[#03adf0] border-2 border-[#03adf0]'
              : 'bg-white text-[#03adf0] border-2 border-[#03adf0] hover:bg-[#03adf0] hover:text-white'
          }`}
          style={{ borderRadius: 0 }}
        >
          Tylko zakończone
        </button>
        <button
          onClick={() => handleFilterChange('status', statusFilter === 'anulowana' ? null : 'anulowana')}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            statusFilter === 'anulowana'
              ? 'bg-white text-[#03adf0] border-2 border-[#03adf0]'
              : 'bg-white text-[#03adf0] border-2 border-[#03adf0] hover:bg-[#03adf0] hover:text-white'
          }`}
          style={{ borderRadius: 0 }}
        >
          Tylko anulowane
        </button>
        <button
          onClick={() => handleFilterChange('trip', tripFilter === 'Lato 2022 - Wiele' ? null : 'Lato 2022 - Wiele')}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            tripFilter === 'Lato 2022 - Wiele'
              ? 'bg-white text-[#03adf0] border-2 border-[#03adf0]'
              : 'bg-white text-[#03adf0] border-2 border-[#03adf0] hover:bg-[#03adf0] hover:text-white'
          }`}
          style={{ borderRadius: 0 }}
        >
          Tylko Lato 2022
        </button>
        <button
          onClick={() => handleFilterChange('trip', tripFilter === 'Lato 2023 - Wiele' ? null : 'Lato 2023 - Wiele')}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            tripFilter === 'Lato 2023 - Wiele'
              ? 'bg-white text-[#03adf0] border-2 border-[#03adf0]'
              : 'bg-white text-[#03adf0] border-2 border-[#03adf0] hover:bg-[#03adf0] hover:text-white'
          }`}
          style={{ borderRadius: 0 }}
        >
          Tylko Lato 2023
        </button>
        {/* Professional Multi-Select for Camps */}
        <div className="relative" ref={campSelectRef}>
          <button
            type="button"
            onClick={() => setIsCampSelectOpen(!isCampSelectOpen)}
            className={`px-3 py-1.5 text-xs font-medium border-2 border-[#03adf0] bg-white text-[#03adf0] focus:outline-none focus:ring-2 focus:ring-[#03adf0] min-w-[200px] text-left flex items-center justify-between gap-2 ${
              isCampSelectOpen ? 'bg-[#03adf0] text-white' : ''
            }`}
            style={{ borderRadius: 0 }}
          >
            <span className="flex-1 truncate">
              {campFilters.length === 0
                ? 'Wybierz obozy'
                : campFilters.length === 1
                ? campFilters[0]
                : `Wybrano: ${campFilters.length}`}
            </span>
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform ${isCampSelectOpen ? 'transform rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown */}
          {isCampSelectOpen && (
            <div className="absolute z-50 mt-1 w-full bg-white border-2 border-[#03adf0] shadow-lg max-h-64 overflow-hidden flex flex-col" style={{ borderRadius: 0 }}>
              {/* Search input */}
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Szukaj obozu..."
                    value={campSearchQuery}
                    onChange={(e) => setCampSearchQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    style={{ borderRadius: 0 }}
                    autoFocus
                  />
                </div>
              </div>

              {/* Options list */}
              <div className="overflow-y-auto flex-1 max-h-48">
                {filteredCamps.length > 0 ? (
                  filteredCamps.map((camp) => {
                    const isSelected = campFilters.includes(camp);
                    return (
                      <label
                        key={camp}
                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleCampFilterChange(camp)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-[#03adf0] border-gray-300 focus:ring-[#03adf0] cursor-pointer"
                            style={{ borderRadius: 0 }}
                          />
                          {isSelected && (
                            <Check className="absolute left-0 w-4 h-4 text-[#03adf0] pointer-events-none" />
                          )}
                        </div>
                        <span className="text-xs text-gray-900 flex-1">{camp}</span>
                      </label>
                    );
                  })
                ) : (
                  <div className="px-3 py-4 text-xs text-gray-500 text-center">
                    Brak wyników
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected items as chips */}
          {campFilters.length > 0 && !isCampSelectOpen && (
            <div className="absolute top-full left-0 mt-1 flex flex-wrap gap-1 max-w-[200px] z-10">
              {campFilters.slice(0, 2).map((camp) => (
                <span
                  key={camp}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-[#03adf0] text-white"
                  style={{ borderRadius: 0 }}
                >
                  {camp.length > 15 ? `${camp.substring(0, 15)}...` : camp}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCampFilter(camp);
                    }}
                    className="hover:bg-[#0288c7] transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {campFilters.length > 2 && (
                <span
                  className="inline-flex items-center px-2 py-0.5 text-xs bg-[#03adf0] text-white"
                  style={{ borderRadius: 0 }}
                >
                  +{campFilters.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
        {(statusFilter || tripFilter || campFilters.length > 0 || searchQuery) && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 text-xs font-medium bg-white text-[#03adf0] border-2 border-[#03adf0] hover:bg-[#03adf0] hover:text-white transition-colors"
            style={{ borderRadius: 0 }}
          >
            Wyczyść filtry
          </button>
        )}
      </div>

      {/* Results count and items per page */}
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs text-gray-600">
          Znaleziono: {filteredReservations.length} {filteredReservations.length === 1 ? 'rezerwacja' : 'rezerwacji'}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Na stronie:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 text-xs border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
            style={{ borderRadius: 0 }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
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
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('reservationName')}
                >
                  <div className="flex items-center gap-1">
                    Nazwa rezerwacji
                    <SortIcon column="reservationName" />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('participantName')}
                >
                  <div className="flex items-center gap-1">
                    Uczestnik
                    <SortIcon column="participantName" />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-1">
                    Email
                    <SortIcon column="email" />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('campName')}
                >
                  <div className="flex items-center gap-1">
                    Obóz
                    <SortIcon column="campName" />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('tripName')}
                >
                  <div className="flex items-center gap-1">
                    Wycieczka
                    <SortIcon column="tripName" />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    <SortIcon column="status" />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-1">
                    Data utworzenia
                    <SortIcon column="createdAt" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedReservations.length > 0 ? (
                paginatedReservations.map((reservation) => (
                  <tr key={reservation.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {reservation.reservationName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {reservation.participantName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {reservation.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {reservation.campName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {reservation.tripName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          reservation.status
                        )}`}
                      >
                        {reservation.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(reservation.createdAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    Brak rezerwacji spełniających kryteria wyszukiwania
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-xs text-gray-600">
              Strona {currentPage} z {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ borderRadius: 0 }}
              >
                Poprzednia
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-[#03adf0] text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                      style={{ borderRadius: 0 }}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-2 text-gray-500">...</span>;
                }
                return null;
              })}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ borderRadius: 0 }}
              >
                Następna
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info message */}
      <div className="mt-2 bg-blue-50 border-l-4 border-blue-400 p-2 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-xs text-blue-700">
              To jest przykładowy widok rezerwacji z hardcoded danymi. Funkcjonalność zarządzania rezerwacjami będzie zaimplementowana później. Filtrowanie i sortowanie będzie wykonywane po stronie serwera (API fetch).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
