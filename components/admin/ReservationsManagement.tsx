'use client';

import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Mail, User, MapPin, Building2, Search, ChevronUp, ChevronDown, X, ChevronDown as ChevronDownIcon, Check, Edit, Trash2, Phone, CreditCard, FileText, Clock, AlertCircle } from 'lucide-react';
import { reservationService } from '@/lib/services/ReservationService';

/**
 * Reservations Management Component
 * Displays real reservations data from backend API
 */

// Reservation detail data interface
interface ReservationDetails {
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  birthDate: string;
  age: number;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  paidAmount: number;
  notes: string;
  specialRequests: string;
  dietaryRestrictions: string;
  medicalInfo: string;
}

// Extended reservation interface matching backend response
interface Reservation {
  id: number;
  reservationName: string;
  participantName: string;
  email: string;
  campName: string;
  tripName: string;
  status: string;
  createdAt: string;
  details: ReservationDetails;
}

// Backend reservation response interface
interface BackendReservation {
  id: number;
  camp_id: number;
  property_id: number;
  status: string;
  total_price: number;
  deposit_amount: number | null;
  created_at: string;
  updated_at: string;
  camp_name: string | null;
  property_name: string | null;
  property_city: string | null;
  property_period: string | null;
  participant_first_name: string | null;
  participant_last_name: string | null;
  participant_age: string | null;
  participant_gender: string | null;
  participant_city: string | null;
  parents_data: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneNumber: string;
    street: string;
    postalCode: string;
    city: string;
  }> | null;
  invoice_type: string | null;
  invoice_first_name: string | null;
  invoice_last_name: string | null;
  invoice_email: string | null;
  invoice_phone: string | null;
  invoice_company_name: string | null;
  invoice_nip: string | null;
  invoice_street: string | null;
  invoice_postal_code: string | null;
  invoice_city: string | null;
  departure_type: string | null;
  departure_city: string | null;
  return_type: string | null;
  return_city: string | null;
  diet: string | null;
  accommodation_request: string | null;
  selected_source: string | null;
}

// Map backend reservation to frontend format
const mapBackendToFrontend = (backendReservation: BackendReservation): Reservation => {
  const firstParent = backendReservation.parents_data && backendReservation.parents_data.length > 0 
    ? backendReservation.parents_data[0] 
    : null;
  
  const participantName = `${backendReservation.participant_first_name || ''} ${backendReservation.participant_last_name || ''}`.trim();
  const email = firstParent?.email || backendReservation.invoice_email || '';
  const campName = backendReservation.camp_name || 'Nieznany obóz';
  const tripName = backendReservation.property_name || `${backendReservation.property_period || ''} - ${backendReservation.property_city || ''}`.trim() || 'Nieznany turnus';
  
  // Map status
  let status = backendReservation.status || 'pending';
  if (status === 'pending') status = 'aktywna';
  if (status === 'cancelled') status = 'anulowana';
  if (status === 'completed') status = 'zakończona';
  
  // Calculate payment status
  const totalAmount = backendReservation.total_price || 0;
  const paidAmount = backendReservation.deposit_amount || 0;
  let paymentStatus = 'Nieopłacona';
  if (paidAmount >= totalAmount) {
    paymentStatus = 'Opłacona';
  } else if (paidAmount > 0) {
    paymentStatus = 'Częściowo opłacona';
  }
  
  // Get parent name
  const parentName = firstParent 
    ? `${firstParent.firstName} ${firstParent.lastName}`
    : (backendReservation.invoice_type === 'private' 
      ? `${backendReservation.invoice_first_name || ''} ${backendReservation.invoice_last_name || ''}`.trim()
      : backendReservation.invoice_company_name || 'Brak danych');
  
  const parentEmail = firstParent?.email || backendReservation.invoice_email || '';
  const parentPhone = firstParent?.phoneNumber || backendReservation.invoice_phone || '';
  
  // Calculate age from participant_age string
  const age = backendReservation.participant_age ? parseInt(backendReservation.participant_age) : 0;
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - age;
  const birthDate = new Date(birthYear, 0, 1).toISOString().split('T')[0];
  
  return {
    id: backendReservation.id,
    reservationName: `REZ-${new Date(backendReservation.created_at).getFullYear()}-${String(backendReservation.id).padStart(3, '0')}`,
    participantName: participantName || 'Brak danych',
    email: email,
    campName: campName,
    tripName: tripName,
    status: status,
    createdAt: backendReservation.created_at.split('T')[0],
    details: {
      phone: firstParent?.phoneNumber || backendReservation.invoice_phone || '',
      address: firstParent?.street || backendReservation.invoice_street || '',
      city: firstParent?.city || backendReservation.invoice_city || backendReservation.participant_city || '',
      postalCode: firstParent?.postalCode || backendReservation.invoice_postal_code || '',
      birthDate: birthDate,
      age: age,
      parentName: parentName || 'Brak danych',
      parentEmail: parentEmail,
      parentPhone: parentPhone,
      paymentStatus: paymentStatus,
      paymentMethod: 'Online', // Default, could be enhanced with payment data
      totalAmount: totalAmount,
      paidAmount: paidAmount,
      notes: backendReservation.accommodation_request || 'Brak uwag',
      specialRequests: backendReservation.accommodation_request || 'Brak',
      dietaryRestrictions: backendReservation.diet === 'vegetarian' ? 'Wegetariańska' : 'Standardowa',
      medicalInfo: 'Brak informacji', // Could be enhanced with health_questions data
    },
  };
};

export default function ReservationsManagement() {
  const router = useRouter();
  
  // State for reservations from API
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  
  // State for delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // Fetch reservations from API
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const backendReservations = await reservationService.listReservations(0, 1000);
        const mappedReservations = backendReservations.map(mapBackendToFrontend);
        setAllReservations(mappedReservations);
      } catch (err) {
        console.error('Error fetching reservations:', err);
        setError(err instanceof Error ? err.message : 'Błąd podczas ładowania rezerwacji');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReservations();
  }, []);
  
  // Toggle row expansion with animation
  const toggleRowExpansion = (reservationId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reservationId)) {
        newSet.delete(reservationId);
      } else {
        newSet.add(reservationId);
      }
      return newSet;
    });
  };
  
  // Handle edit click - navigate to edit page
  const handleEditClick = (reservation: Reservation, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/admin-panel/reservations/${reservation.id}/edit`);
  };
  
  // Handle delete click
  const handleDeleteClick = (reservation: Reservation, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedReservation(reservation);
    setDeleteModalOpen(true);
  };
  
  // Handle delete confirmation (without actual deletion)
  const handleDeleteConfirm = () => {
    // TODO: Implement actual deletion when backend is ready
    console.log('Delete reservation:', selectedReservation?.id);
    setDeleteModalOpen(false);
    setSelectedReservation(null);
  };

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

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-2" style={{ marginTop: 0, paddingTop: 0 }}>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Rezerwacje</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
            <p className="text-gray-600">Ładowanie rezerwacji...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-2" style={{ marginTop: 0, paddingTop: 0 }}>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Rezerwacje</h1>
        </div>
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-red-700 font-semibold">Błąd</p>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

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
          style={{ borderRadius: 0, cursor: 'pointer' }}
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
          style={{ borderRadius: 0, cursor: 'pointer' }}
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
          style={{ borderRadius: 0, cursor: 'pointer' }}
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
          style={{ borderRadius: 0, cursor: 'pointer' }}
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
          style={{ borderRadius: 0, cursor: 'pointer' }}
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
            style={{ borderRadius: 0, cursor: 'pointer' }}
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
                        className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleCampFilterChange(camp)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-[#03adf0] border-gray-300 focus:ring-[#03adf0]"
                            style={{ borderRadius: 0, cursor: 'pointer' }}
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
                    style={{ cursor: 'pointer' }}
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
            style={{ borderRadius: 0, cursor: 'pointer' }}
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
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('reservationName')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Nazwa rezerwacji
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
                  onClick={() => handleSort('tripName')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Wycieczka
                    <SortIcon column="tripName" />
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
                  onClick={() => handleSort('createdAt')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Data utworzenia
                    <SortIcon column="createdAt" />
                  </div>
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedReservations.length > 0 ? (
                paginatedReservations.map((reservation) => {
                  const isExpanded = expandedRows.has(reservation.id);
                  return (
                    <Fragment key={reservation.id}>
                      <tr 
                        className={`hover:bg-gray-50 transition-all duration-200 ${isExpanded ? 'bg-blue-50' : ''}`}
                        onClick={() => toggleRowExpansion(reservation.id)}
                        style={{ cursor: 'pointer' }}
                      >
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
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => handleEditClick(reservation, e)}
                              className="p-1.5 text-[#03adf0] hover:bg-blue-50 transition-colors"
                              title="Edytuj"
                              style={{ cursor: 'pointer' }}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteClick(reservation, e)}
                              className="p-1.5 text-red-600 hover:bg-red-50 transition-colors"
                              title="Usuń"
                              style={{ cursor: 'pointer' }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        </tr>
                      {isExpanded && (
                        <tr className="bg-blue-50 animate-slideDown">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {/* Participant Details */}
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-gray-900 mb-2">Dane uczestnika</h4>
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-600">Telefon:</span>
                                    <span className="text-gray-900">{reservation.details.phone}</span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <MapPin className="w-3 h-3 text-gray-400 mt-0.5" />
                                    <div>
                                      <span className="text-gray-600">Adres: </span>
                                      <span className="text-gray-900">{reservation.details.address}, {reservation.details.postalCode} {reservation.details.city}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-600">Data urodzenia:</span>
                                    <span className="text-gray-900">{formatDate(reservation.details.birthDate)} ({reservation.details.age} lat)</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Parent Details */}
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-gray-900 mb-2">Dane opiekuna</h4>
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center gap-2">
                                    <User className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-600">Imię i nazwisko:</span>
                                    <span className="text-gray-900">{reservation.details.parentName}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-600">Email:</span>
                                    <span className="text-gray-900">{reservation.details.parentEmail}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-600">Telefon:</span>
                                    <span className="text-gray-900">{reservation.details.parentPhone}</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Payment Details */}
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-gray-900 mb-2">Płatności</h4>
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center gap-2">
                                    <CreditCard className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-600">Status:</span>
                                    <span className="text-gray-900">{reservation.details.paymentStatus}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <CreditCard className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-600">Metoda:</span>
                                    <span className="text-gray-900">{reservation.details.paymentMethod}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-600">Kwota:</span>
                                    <span className="text-gray-900">{reservation.details.paidAmount} / {reservation.details.totalAmount} PLN</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Additional Info */}
                              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                                <h4 className="font-semibold text-sm text-gray-900 mb-2">Dodatkowe informacje</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                  <div>
                                    <span className="text-gray-600">Dieta:</span>
                                    <span className="text-gray-900 ml-2">{reservation.details.dietaryRestrictions}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Informacje medyczne:</span>
                                    <span className="text-gray-900 ml-2">{reservation.details.medicalInfo}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Specjalne prośby:</span>
                                    <span className="text-gray-900 ml-2">{reservation.details.specialRequests}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Uwagi:</span>
                                    <span className="text-gray-900 ml-2">{reservation.details.notes}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
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
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                style={{ borderRadius: 0, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
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
                      style={{ borderRadius: 0, cursor: 'pointer' }}
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
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                style={{ borderRadius: 0, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Następna
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Delete Confirmation Modal - Professional with transparent background */}
      {deleteModalOpen && selectedReservation && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fadeIn"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => {
            setDeleteModalOpen(false);
            setSelectedReservation(null);
          }}
        >
          <div 
            className="bg-white shadow-2xl max-w-md w-full animate-scaleIn"
            style={{ borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Potwierdź usunięcie</h2>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-6">
                Czy na pewno chcesz usunąć rezerwację <strong>{selectedReservation.reservationName}</strong> dla uczestnika <strong>{selectedReservation.participantName}</strong>?
              </p>
              <p className="text-xs text-gray-500 mb-6">
                Ta operacja jest nieodwracalna. (Uwaga: To jest tylko modal potwierdzenia - faktyczne usunięcie będzie zaimplementowane później)
              </p>
              
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setSelectedReservation(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 transition-all duration-200"
                  style={{ borderRadius: 0, cursor: 'pointer' }}
                >
                  Anuluj
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border-2 border-red-600 hover:bg-red-700 transition-all duration-200"
                  style={{ borderRadius: 0, cursor: 'pointer' }}
                >
                  Usuń
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animations CSS */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            max-height: 1000px;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
