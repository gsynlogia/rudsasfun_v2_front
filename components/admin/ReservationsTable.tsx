'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ChevronUp, ChevronDown, Columns, GripVertical, Filter, X as XIcon } from 'lucide-react';
import { authenticatedApiCall } from '@/utils/api-auth';
import UniversalModal from './UniversalModal';

interface BackendReservation {
  id: number;
  participant_first_name: string;
  participant_last_name: string;
  camp_name: string;
  property_name: string;
  property_period?: string | null;
  property_city?: string | null;
  property_tag?: string | null;
  camp_id?: number;
  property_id?: number;
  selected_promotion?: string | null;
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
  campLocation: string;
  tag: string | null;
  promotionName: string | null;
  status: string;
  totalPrice: number;
  createdAt: string;
  // Keep for backward compatibility and promotion fetching
  campId?: number;
  propertyId?: number;
  selectedPromotion?: string | null;
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
  
  // Camp location: property_period - property_city (e.g., "lato - BEAVER")
  const campLocation = backendReservation.property_period && backendReservation.property_city
    ? `${backendReservation.property_period} - ${backendReservation.property_city}`
    : backendReservation.property_name || 'Nieznana lokalizacja';
  
  return {
    id: backendReservation.id,
    reservationName: `REZ-${new Date(backendReservation.created_at).getFullYear()}-${String(backendReservation.id).padStart(3, '0')}`,
    participantName: participantName || 'Brak danych',
    email: email,
    campName: backendReservation.camp_name || 'Nieznany obóz',
    campLocation: campLocation,
    tag: backendReservation.property_tag || null,
    promotionName: null, // Will be populated after fetching promotions
    status: status,
    totalPrice: backendReservation.total_price || 0,
    createdAt: backendReservation.created_at.split('T')[0],
    campId: backendReservation.camp_id,
    propertyId: backendReservation.property_id,
    selectedPromotion: backendReservation.selected_promotion || null,
  };
};

export default function ReservationsTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for search, sorting, and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Initialize currentPage from URL params or default to 1
  const pageFromUrl = searchParams.get('page');
  const [currentPage, setCurrentPage] = useState(pageFromUrl ? parseInt(pageFromUrl, 10) : 1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pageInputValue, setPageInputValue] = useState('');
  
  // Column configuration state
  const STORAGE_KEY = 'reservations_list_columns';
  
  // Column definitions with labels
  const COLUMN_DEFINITIONS = {
    reservationName: 'Numer rezerwacji',
    participantName: 'Uczestnik',
    email: 'Email',
    campName: 'Nazwa obozu',
    campLocation: 'Lokalizacja',
    tag: 'Tag turnusu',
    promotionName: 'Promocja',
    status: 'Status',
    totalPrice: 'Cena',
    createdAt: 'Data utworzenia',
  };
  
  // Default column order and visibility
  const DEFAULT_COLUMN_ORDER = ['reservationName', 'participantName', 'email', 'campName', 'campLocation', 'tag', 'promotionName', 'status', 'totalPrice', 'createdAt'];
  const DEFAULT_COLUMNS = DEFAULT_COLUMN_ORDER.map(key => ({ key, visible: true }));
  
  // Column configuration: array of {key, visible, filters?}
  interface ColumnConfig {
    key: string;
    visible: boolean;
    filters?: string[]; // Selected filter values for this column
  }
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [tempColumnConfig, setTempColumnConfig] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  
  // Filter dropdown state: which column has filter dropdown open
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  
  // Convert column config to visibility map for easy access
  const visibleColumns = useMemo(() => {
    const map: Record<string, boolean> = {};
    columnConfig.forEach(col => {
      map[col.key] = col.visible;
    });
    return map;
  }, [columnConfig]);
  
  // Get ordered visible columns for rendering
  const orderedVisibleColumns = useMemo(() => {
    return columnConfig.filter(col => col.visible);
  }, [columnConfig]);
  
  // Load column configuration from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Support multiple formats:
        // 1. Old format: Record<string, boolean>
        // 2. New format: Array<{key, visible}>
        // 3. Latest format: Array<{key, visible, filters?}>
        if (Array.isArray(parsed)) {
          // New format: array of {key, visible, filters?}
          // Merge with defaults to handle new columns
          const savedKeys = new Set(parsed.map((col: { key: string }) => col.key));
          const merged: ColumnConfig[] = parsed.map((col: any) => ({
            key: col.key,
            visible: col.visible !== false,
            filters: col.filters || [],
          }));
          DEFAULT_COLUMN_ORDER.forEach(key => {
            if (!savedKeys.has(key)) {
              merged.push({ key, visible: true, filters: [] });
            }
          });
          setColumnConfig(merged);
          setTempColumnConfig([...merged]);
        } else {
          // Old format: Record<string, boolean> - convert to new format
          const converted: ColumnConfig[] = DEFAULT_COLUMN_ORDER.map(key => ({
            key,
            visible: parsed[key] !== false, // Default to true if not specified
            filters: [],
          }));
          setColumnConfig(converted);
          setTempColumnConfig([...converted]);
          // Save in new format
          localStorage.setItem(STORAGE_KEY, JSON.stringify(converted));
        }
      }
    } catch (err) {
      console.error('Error loading column preferences:', err);
    }
  }, []);
  
  // Save column configuration to localStorage
  const saveColumnPreferences = (config: ColumnConfig[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setColumnConfig([...config]);
    } catch (err) {
      console.error('Error saving column preferences:', err);
    }
  };
  
  // Get unique values for a column from all reservations (not just current page)
  const getUniqueColumnValues = (columnKey: string): string[] => {
    const values = new Set<string>();
    allReservations.forEach(reservation => {
      let value: string | null = null;
      switch (columnKey) {
        case 'reservationName':
          value = reservation.reservationName;
          break;
        case 'participantName':
          value = reservation.participantName;
          break;
        case 'email':
          value = reservation.email;
          break;
        case 'campName':
          value = reservation.campName;
          break;
        case 'campLocation':
          value = reservation.campLocation;
          break;
        case 'tag':
          value = reservation.tag || '-';
          break;
        case 'promotionName':
          value = reservation.promotionName || '-';
          break;
        case 'status':
          value = reservation.status;
          break;
        case 'totalPrice':
          value = reservation.totalPrice.toFixed(2);
          break;
        case 'createdAt':
          value = new Date(reservation.createdAt).toLocaleDateString('pl-PL');
          break;
      }
      if (value !== null && value !== '') {
        values.add(value);
      }
    });
    return Array.from(values).sort();
  };
  
  // Handle filter toggle for a column value
  const handleFilterToggle = (columnKey: string, value: string) => {
    const updated = columnConfig.map(col => {
      if (col.key === columnKey) {
        const filters = col.filters || [];
        const newFilters = filters.includes(value)
          ? filters.filter(f => f !== value)
          : [...filters, value];
        return { ...col, filters: newFilters };
      }
      return col;
    });
    setColumnConfig(updated);
    saveColumnPreferences(updated);
    
    // Update URL with filters
    const filtersForUrl: Record<string, string[]> = {};
    updated.forEach(col => {
      if (col.filters && col.filters.length > 0) {
        filtersForUrl[col.key] = col.filters;
      }
    });
    updateFiltersInUrl(filtersForUrl);
    
    setCurrentPage(1);
    updatePageInUrl(1);
  };
  
  // Clear all filters for a column
  const handleClearColumnFilters = (columnKey: string) => {
    const updated = columnConfig.map(col => {
      if (col.key === columnKey) {
        return { ...col, filters: [] };
      }
      return col;
    });
    setColumnConfig(updated);
    saveColumnPreferences(updated);
    
    // Update URL with filters
    const filtersForUrl: Record<string, string[]> = {};
    updated.forEach(col => {
      if (col.filters && col.filters.length > 0) {
        filtersForUrl[col.key] = col.filters;
      }
    });
    updateFiltersInUrl(filtersForUrl);
    
    setCurrentPage(1);
    updatePageInUrl(1);
  };
  
  // Remove single filter value
  const handleRemoveFilter = (columnKey: string, value: string) => {
    const updated = columnConfig.map(col => {
      if (col.key === columnKey) {
        const filters = col.filters || [];
        return { ...col, filters: filters.filter(f => f !== value) };
      }
      return col;
    });
    setColumnConfig(updated);
    saveColumnPreferences(updated);
    
    // Update URL with filters
    const filtersForUrl: Record<string, string[]> = {};
    updated.forEach(col => {
      if (col.filters && col.filters.length > 0) {
        filtersForUrl[col.key] = col.filters;
      }
    });
    updateFiltersInUrl(filtersForUrl);
    
    setCurrentPage(1);
    updatePageInUrl(1);
  };
  
  // Check if column has active filters
  const hasActiveFilters = (columnKey: string): boolean => {
    const col = columnConfig.find(c => c.key === columnKey);
    return col ? (col.filters?.length || 0) > 0 : false;
  };
  
  // Handle column modal open
  const handleOpenColumnModal = () => {
    setTempColumnConfig([...columnConfig]);
    setColumnModalOpen(true);
  };
  
  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openFilterColumn && !(event.target as Element).closest('th')) {
        setOpenFilterColumn(null);
      }
    };
    if (openFilterColumn) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openFilterColumn]);
  
  // Handle column modal close
  const handleCloseColumnModal = () => {
    setColumnModalOpen(false);
    setDraggedColumnIndex(null);
    setDraggedOverIndex(null);
  };
  
  // Handle column selection change
  const handleColumnToggle = (columnKey: string) => {
    setTempColumnConfig(prev => 
      prev.map(col => col.key === columnKey ? { ...col, visible: !col.visible } : col)
    );
  };
  
  // Handle save column preferences
  const handleSaveColumnPreferences = () => {
    saveColumnPreferences(tempColumnConfig);
    setColumnModalOpen(false);
  };
  
  // Handle reset column preferences
  const handleResetColumnPreferences = () => {
    const reset = [...DEFAULT_COLUMNS];
    setTempColumnConfig(reset);
    saveColumnPreferences(reset);
    setColumnModalOpen(false);
  };
  
  // Drag & Drop handlers for column reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColumnIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverIndex(index);
  };
  
  const handleDragLeave = () => {
    setDraggedOverIndex(null);
  };
  
  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDraggedOverIndex(null);
    
    if (draggedColumnIndex === null || draggedColumnIndex === targetIndex) {
      setDraggedColumnIndex(null);
      return;
    }
    
    // Reorder columns
    const newConfig = [...tempColumnConfig];
    const [removed] = newConfig.splice(draggedColumnIndex, 1);
    newConfig.splice(targetIndex, 0, removed);
    
    setTempColumnConfig(newConfig);
    setDraggedColumnIndex(null);
  };
  
  // Load filters from URL params only on mount (not on every searchParams change to avoid overwriting local changes)
  useEffect(() => {
    const filtersFromUrl: Record<string, string[]> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith('filter_')) {
        const columnKey = key.replace('filter_', '');
        filtersFromUrl[columnKey] = value.split(',').filter(v => v);
      }
    });
    
    // Only update if there are filters in URL and columnConfig doesn't have them yet (initial load)
    if (Object.keys(filtersFromUrl).length > 0) {
      setColumnConfig(prev => {
        // Check if filters are already set (to avoid overwriting local changes)
        const hasFilters = prev.some(col => col.filters && col.filters.length > 0);
        if (hasFilters) {
          // Filters already set, don't overwrite
          return prev;
        }
        // Initial load from URL
        const updated = prev.map(col => {
          if (filtersFromUrl[col.key]) {
            return { ...col, filters: filtersFromUrl[col.key] };
          }
          return { ...col, filters: [] };
        });
        return updated;
      });
    }
  }, []); // Only on mount
  
  // Sync currentPage with URL params on mount and when searchParams change
  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam) {
      const pageNum = parseInt(pageParam, 10);
      if (!isNaN(pageNum) && pageNum > 0) {
        setCurrentPage(pageNum);
      }
    } else {
      // If no page param, reset to 1
      setCurrentPage(1);
    }
  }, [searchParams]);
  
  // Update URL when currentPage changes
  const updatePageInUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete('page');
    } else {
      params.set('page', page.toString());
    }
    const newUrl = params.toString() ? `/admin-panel?${params.toString()}` : '/admin-panel';
    router.replace(newUrl);
  };
  
  // Sync filters to URL when columnConfig changes
  const updateFiltersInUrl = (filters: Record<string, string[]>) => {
    const params = new URLSearchParams();
    
    // Add filter params
    Object.entries(filters).forEach(([columnKey, values]) => {
      if (values.length > 0) {
        params.set(`filter_${columnKey}`, values.join(','));
      }
    });
    
    // Update page param if needed
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    }
    
    const queryString = params.toString();
    const url = `/admin-panel${queryString ? `?${queryString}` : ''}`;
    router.replace(url, { scroll: false });
  };

  // Fetch reservations and promotions
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await authenticatedApiCall<BackendReservation[]>('/api/reservations/');
        const mapped = data.map(mapBackendToFrontend);
        
        // Fetch promotions for reservations that have selected_promotion
        const reservationsWithPromotions = await Promise.all(
          mapped.map(async (reservation) => {
            if (!reservation.selectedPromotion || !reservation.campId || !reservation.propertyId) {
              return reservation;
            }
            
            try {
              const relationId = typeof reservation.selectedPromotion === 'number' 
                ? reservation.selectedPromotion 
                : parseInt(String(reservation.selectedPromotion));
              
              if (isNaN(relationId)) {
                return reservation;
              }
              
              // Fetch turnus promotions
              const turnusPromotions = await authenticatedApiCall<any[]>(
                `/api/camps/${reservation.campId}/properties/${reservation.propertyId}/promotions`
              );
              
              // Find promotion by relation_id
              const foundPromotion = turnusPromotions.find(
                (p: any) => p.relation_id === relationId || p.id === relationId
              );
              
              if (foundPromotion && foundPromotion.general_promotion_id) {
                // Fetch general promotion details
                try {
                  const generalPromotion = await authenticatedApiCall<any>(
                    `/api/general-promotions/${foundPromotion.general_promotion_id}`
                  );
                  return {
                    ...reservation,
                    promotionName: generalPromotion.name || 'Nieznana promocja',
                  };
                } catch (err) {
                  // If general promotion not found, use name from turnus promotion
                  return {
                    ...reservation,
                    promotionName: foundPromotion.name || 'Nieznana promocja',
                  };
                }
              }
              
              return reservation;
            } catch (err) {
              console.warn(`[ReservationsTable] Could not fetch promotion for reservation ${reservation.id}:`, err);
              return reservation;
            }
          })
        );
        
        setAllReservations(reservationsWithPromotions);
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

    // Column filters (Excel-like filters)
    columnConfig.forEach(col => {
      if (col.filters && col.filters.length > 0) {
        filtered = filtered.filter(reservation => {
          let value: string | null = null;
          switch (col.key) {
            case 'reservationName':
              value = reservation.reservationName;
              break;
            case 'participantName':
              value = reservation.participantName;
              break;
            case 'email':
              value = reservation.email;
              break;
            case 'campName':
              value = reservation.campName;
              break;
            case 'campLocation':
              value = reservation.campLocation;
              break;
            case 'tag':
              value = reservation.tag || '-';
              break;
            case 'promotionName':
              value = reservation.promotionName || '-';
              break;
            case 'status':
              value = reservation.status;
              break;
            case 'totalPrice':
              value = reservation.totalPrice.toFixed(2);
              break;
            case 'createdAt':
              value = new Date(reservation.createdAt).toLocaleDateString('pl-PL');
              break;
          }
          return value !== null && col.filters!.includes(value);
        });
      }
    });

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        res =>
          res.reservationName.toLowerCase().includes(query) ||
          res.participantName.toLowerCase().includes(query) ||
          res.email.toLowerCase().includes(query) ||
          res.campName.toLowerCase().includes(query) ||
          res.campLocation.toLowerCase().includes(query) ||
          (res.tag && res.tag.toLowerCase().includes(query)) ||
          (res.promotionName && res.promotionName.toLowerCase().includes(query))
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
          case 'campLocation':
            aValue = a.campLocation;
            bValue = b.campLocation;
            break;
          case 'tag':
            aValue = a.tag || '';
            bValue = b.tag || '';
            break;
          case 'promotionName':
            aValue = a.promotionName || '';
            bValue = b.promotionName || '';
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
  }, [searchQuery, sortColumn, sortDirection, allReservations, columnConfig]);

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
    updatePageInUrl(1);
  };

  // Handle row click - navigate to detail page with current page info
  const handleRowClick = (reservation: Reservation) => {
    const params = new URLSearchParams();
    if (currentPage > 1) {
      params.set('fromPage', currentPage.toString());
    }
    const queryString = params.toString();
    const url = `/admin-panel/rezerwacja/${reservation.reservationName}${queryString ? `?${queryString}` : ''}`;
    router.push(url);
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updatePageInUrl(page);
    setPageInputValue(''); // Clear input after page change
  };
  
  // Handle page input change
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers
    if (value === '' || /^\d+$/.test(value)) {
      setPageInputValue(value);
    }
  };
  
  // Handle page input submit (Enter key)
  const handlePageInputSubmit = () => {
    if (!pageInputValue) return;
    
    const pageNum = parseInt(pageInputValue, 10);
    
    // Validation
    if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages || pageNum % 1 !== 0) {
      // Invalid input - reset to current page
      setPageInputValue('');
      return;
    }
    
    // Valid input - navigate to page
    handlePageChange(pageNum);
  };
  
  // Handle Enter key in page input
  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePageInputSubmit();
    }
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

      {/* Active Filters Chips */}
      {columnConfig.some(col => col.filters && col.filters.length > 0) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {columnConfig.map(col => {
            if (!col.filters || col.filters.length === 0) return null;
            return col.filters.map((value) => {
              const columnLabel = COLUMN_DEFINITIONS[col.key as keyof typeof COLUMN_DEFINITIONS] || col.key;
              return (
                <div
                  key={`${col.key}-${value}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#03adf0] text-white text-xs font-medium"
                  style={{ borderRadius: 0 }}
                >
                  <span>{columnLabel}: {value}</span>
                  <button
                    onClick={() => handleRemoveFilter(col.key, value)}
                    className="hover:bg-[#0288c7] transition-colors p-0.5"
                    title="Usuń filtr"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              );
            });
          })}
        </div>
      )}

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
              updatePageInUrl(1);
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
              updatePageInUrl(1);
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
        {/* Table Header with Column Selection Button */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Rezerwacje</h2>
          <button
            onClick={handleOpenColumnModal}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200"
            style={{ borderRadius: 0, cursor: 'pointer' }}
            title="Wybierz kolumny"
          >
            <Columns className="w-4 h-4" />
            Wybierz kolumny
          </button>
        </div>
        <div className="overflow-auto flex-1">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {orderedVisibleColumns.map((col) => {
                  const columnKey = col.key;
                  const columnLabel = COLUMN_DEFINITIONS[columnKey as keyof typeof COLUMN_DEFINITIONS] || columnKey;
                  const isFilterOpen = openFilterColumn === columnKey;
                  const hasFilters = hasActiveFilters(columnKey);
                  const uniqueValues = getUniqueColumnValues(columnKey);
                  const columnFilters = columnConfig.find(c => c.key === columnKey)?.filters || [];
                  
                  return (
                    <th
                      key={columnKey}
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors relative"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex items-center gap-1">
                        <div 
                          className="flex items-center gap-1 flex-1"
                          onClick={() => handleSort(columnKey)}
                        >
                          {columnLabel}
                          <SortIcon column={columnKey} />
                        </div>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenFilterColumn(isFilterOpen ? null : columnKey);
                            }}
                            className={`p-1 hover:bg-gray-200 transition-colors ${
                              hasFilters ? 'text-[#03adf0]' : 'text-gray-400'
                            }`}
                            title="Filtruj"
                          >
                            <Filter className="w-4 h-4" />
                          </button>
                          {isFilterOpen && (
                            <div 
                              className="absolute right-0 top-full mt-1 bg-white border border-gray-300 shadow-lg z-50 min-w-[200px] max-w-[300px] max-h-[400px] flex flex-col"
                              onClick={(e) => e.stopPropagation()}
                              style={{ borderRadius: 0 }}
                            >
                              {/* Filter header */}
                              <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                                <span className="text-xs font-medium text-gray-900">Filtruj {columnLabel}</span>
                                {hasFilters && (
                                  <button
                                    onClick={() => handleClearColumnFilters(columnKey)}
                                    className="text-xs text-[#03adf0] hover:text-[#0288c7]"
                                  >
                                    Wyczyść
                                  </button>
                                )}
                              </div>
                              
                              {/* Filter options */}
                              <div className="overflow-y-auto flex-1 max-h-[320px]">
                                {uniqueValues.length > 0 ? (
                                  uniqueValues.map((value) => {
                                    const isSelected = columnFilters.includes(value);
                                    return (
                                      <label
                                        key={value}
                                        className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors ${
                                          isSelected ? 'bg-blue-50' : ''
                                        }`}
                                        style={{ cursor: 'pointer' }}
                                      >
                                        <div className="relative flex items-center">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleFilterToggle(columnKey, value)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-4 h-4 text-[#03adf0] border-gray-300 focus:ring-[#03adf0]"
                                            style={{ borderRadius: 0, cursor: 'pointer' }}
                                          />
                                        </div>
                                        <span className="text-xs text-gray-900 flex-1 truncate" title={value}>
                                          {value}
                                        </span>
                                      </label>
                                    );
                                  })
                                ) : (
                                  <div className="px-3 py-4 text-xs text-gray-500 text-center">
                                    Brak danych
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedReservations.length === 0 ? (
                <tr>
                  <td colSpan={orderedVisibleColumns.length || 9} className="px-4 py-8 text-center text-sm text-gray-500">
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
                    {orderedVisibleColumns.map((col) => {
                      const columnKey = col.key;
                      if (columnKey === 'reservationName') {
                        return (
                          <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">
                              {reservation.reservationName}
                            </span>
                          </td>
                        );
                      } else if (columnKey === 'participantName') {
                        return (
                          <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                            <span className="text-sm text-gray-600">
                              {reservation.participantName}
                            </span>
                          </td>
                        );
                      } else if (columnKey === 'email') {
                        return (
                          <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                            <span className="text-sm text-gray-600">
                              {reservation.email}
                            </span>
                          </td>
                        );
                      } else if (columnKey === 'campName') {
                        return (
                          <td key={columnKey} className="px-4 py-2">
                            <div className="text-sm text-gray-900">{reservation.campName}</div>
                          </td>
                        );
                      } else if (columnKey === 'campLocation') {
                        return (
                          <td key={columnKey} className="px-4 py-2">
                            <div className="text-sm text-gray-600">{reservation.campLocation}</div>
                          </td>
                        );
                      } else if (columnKey === 'tag') {
                        return (
                          <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">
                              {reservation.tag || '-'}
                            </span>
                          </td>
                        );
                      } else if (columnKey === 'promotionName') {
                        return (
                          <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                            <span className="text-sm text-gray-600">
                              {reservation.promotionName || '-'}
                            </span>
                          </td>
                        );
                      } else if (columnKey === 'status') {
                        return (
                          <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
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
                        );
                      } else if (columnKey === 'totalPrice') {
                        return (
                          <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">
                              {reservation.totalPrice.toFixed(2)} PLN
                            </span>
                          </td>
                        );
                      } else if (columnKey === 'createdAt') {
                        return (
                          <td key={columnKey} className="px-4 py-2 whitespace-nowrap">
                            <span className="text-sm text-gray-600">
                              {new Date(reservation.createdAt).toLocaleDateString('pl-PL')}
                            </span>
                          </td>
                        );
                      }
                      return null;
                    })}
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
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 text-sm font-medium transition-all duration-200 ${
                          currentPage === page
                            ? 'bg-[#03adf0] text-white border border-[#03adf0]'
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
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  style={{ borderRadius: 0 }}
                >
                  Następna
                </button>
              </div>
              {/* Page input field - directly under page number buttons */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={pageInputValue}
                  onChange={handlePageInputChange}
                  onKeyDown={handlePageInputKeyDown}
                  placeholder={`1-${totalPages}`}
                  className="w-16 px-2 py-1 text-xs border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#03adf0] transition-all duration-200 text-center"
                  style={{ borderRadius: 0 }}
                />
                <span className="text-xs text-gray-500">(Enter)</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Column Selection Modal */}
      <UniversalModal
        isOpen={columnModalOpen}
        onClose={handleCloseColumnModal}
        title="Wybierz kolumny"
        maxWidth="md"
      >
        <div className="p-6">
          <div className="space-y-2 mb-6">
            {tempColumnConfig.map((col, index) => {
              const isDraggedOver = draggedOverIndex === index;
              const columnLabel = COLUMN_DEFINITIONS[col.key as keyof typeof COLUMN_DEFINITIONS] || col.key;
              return (
                <div
                  key={col.key}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors ${
                    isDraggedOver ? 'bg-blue-50 border-t-2 border-blue-400' : ''
                  } cursor-move`}
                >
                  <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <label className="flex items-center gap-3 flex-1 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={() => handleColumnToggle(col.key)}
                      className="w-4 h-4 text-[#03adf0] border-gray-300 rounded focus:ring-[#03adf0]"
                      style={{ borderRadius: 0 }}
                    />
                    <span className="text-sm font-medium text-gray-900">{columnLabel}</span>
                  </label>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleResetColumnPreferences}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200"
              style={{ borderRadius: 0, cursor: 'pointer' }}
            >
              Resetuj ustawienia
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCloseColumnModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200"
                style={{ borderRadius: 0, cursor: 'pointer' }}
              >
                Anuluj
              </button>
              <button
                onClick={handleSaveColumnPreferences}
                className="px-4 py-2 text-sm font-medium text-white bg-[#03adf0] hover:bg-[#0288c7] transition-all duration-200"
                style={{ borderRadius: 0, cursor: 'pointer' }}
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      </UniversalModal>
    </div>
  );
}






