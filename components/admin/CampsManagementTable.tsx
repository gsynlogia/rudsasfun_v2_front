'use client';

import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Search, ChevronUp, ChevronDown, X, ChevronDown as ChevronDownIcon, Check, Edit, Trash2, Calendar, MapPin, Plus } from 'lucide-react';
import type { Camp, CampProperty } from '@/types/reservation';
import CampPropertyForm from './CampPropertyForm';
import DeleteConfirmationModal, { DeleteItemType } from './DeleteConfirmationModal';

interface CampWithProperties extends Camp {
  properties: CampProperty[];
}

/**
 * Camps Management Table Component
 * Displays camps in a table format similar to ReservationsManagement
 * With search, filters, sorting, pagination, and expandable details
 */
export default function CampsManagementTable() {
  const router = useRouter();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // State for camps data
  const [allCamps, setAllCamps] = useState<CampWithProperties[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // State for delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteItemType, setDeleteItemType] = useState<DeleteItemType>('camp');
  const [deleteItemName, setDeleteItemName] = useState<string>('');
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [deleteCampId, setDeleteCampId] = useState<number | null>(null); // For turnus deletion
  const [deleteAdditionalInfo, setDeleteAdditionalInfo] = useState<string | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for property form (add turnus only - edit is on separate page)
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [selectedCampIdForProperty, setSelectedCampIdForProperty] = useState<number | null>(null);

  // State for search, filters, sorting, and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Multi-select state for cities
  const [isCitySelectOpen, setIsCitySelectOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const citySelectRef = useRef<HTMLDivElement>(null);
  const [cityFilters, setCityFilters] = useState<string[]>([]);

  // Load camps from API
  useEffect(() => {
    loadCamps();
  }, []);

  const loadCamps = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/camps/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAllCamps(data.camps || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load camps');
      console.error('Error loading camps:', err);
    } finally {
      setLoading(false);
    }
  };

  // Available cities for filter - extract unique cities from all properties
  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    allCamps.forEach(camp => {
      camp.properties?.forEach(prop => {
        if (prop.city) cities.add(prop.city);
      });
    });
    return Array.from(cities).sort();
  }, [allCamps]);

  // Available periods for filter
  const availablePeriods = useMemo(() => {
    const periods = new Set<string>();
    allCamps.forEach(camp => {
      camp.properties?.forEach(prop => {
        if (prop.period) periods.add(prop.period);
      });
    });
    return Array.from(periods).sort();
  }, [allCamps]);

  // Filter and sort camps
  const filteredCamps = useMemo(() => {
    let filtered = [...allCamps];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        camp =>
          camp.name.toLowerCase().includes(query) ||
          camp.properties?.some(prop =>
            prop.city.toLowerCase().includes(query) ||
            prop.period.toLowerCase().includes(query)
          )
      );
    }

    // Period filter
    if (periodFilter) {
      filtered = filtered.filter(camp =>
        camp.properties?.some(prop => prop.period === periodFilter)
      );
    }

    // City filter (multi-select)
    if (cityFilters.length > 0) {
      filtered = filtered.filter(camp =>
        camp.properties?.some(prop => cityFilters.includes(prop.city))
      );
    }

    // Sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortColumn) {
          case 'id':
            aValue = a.id;
            bValue = b.id;
            break;
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'propertiesCount':
            aValue = a.properties?.length || 0;
            bValue = b.properties?.length || 0;
            break;
          case 'createdAt':
            aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
            bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
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
  }, [searchQuery, periodFilter, cityFilters, sortColumn, sortDirection, allCamps]);

  // Pagination
  const totalPages = Math.ceil(filteredCamps.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCamps = filteredCamps.slice(startIndex, endIndex);

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

  // Handle filter change
  const handleFilterChange = (filterType: 'period', value: string | null) => {
    if (filterType === 'period') {
      setPeriodFilter(value);
    }
    setCurrentPage(1);
  };

  // Handle city filter (multi-select)
  const handleCityFilterChange = (city: string) => {
    setCityFilters(prev => {
      if (prev.includes(city)) {
        return prev.filter(c => c !== city);
      } else {
        return [...prev, city];
      }
    });
    setCurrentPage(1);
  };

  // Remove single city filter
  const removeCityFilter = (city: string) => {
    setCityFilters(prev => prev.filter(c => c !== city));
    setCurrentPage(1);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (citySelectRef.current && !citySelectRef.current.contains(event.target as Node)) {
        setIsCitySelectOpen(false);
        setCitySearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter cities based on search query
  const filteredCities = useMemo(() => {
    if (!citySearchQuery) {
      return availableCities;
    }
    return availableCities.filter(city =>
      city.toLowerCase().includes(citySearchQuery.toLowerCase())
    );
  }, [availableCities, citySearchQuery]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setPeriodFilter(null);
    setCityFilters([]);
    setCurrentPage(1);
  };

  // Toggle row expansion
  const toggleRowExpansion = (campId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campId)) {
        newSet.delete(campId);
      } else {
        newSet.add(campId);
      }
      return newSet;
    });
  };

  // Handle edit click - navigate to edit page
  const handleEditClick = (camp: CampWithProperties, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/admin-panel/camps/${camp.id}/edit`);
  };

  // Handle delete click for camp
  const handleDeleteClick = (camp: CampWithProperties, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteItemType('camp');
    setDeleteItemName(camp.name);
    setDeleteItemId(camp.id);
    setDeleteCampId(null);
    setDeleteAdditionalInfo(undefined);
    setDeleteModalOpen(true);
  };

  // Handle delete click for property/turnus
  const handleDeletePropertyClick = (campId: number, propertyId: number, propertyName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteItemType('turnus');
    setDeleteItemName(propertyName);
    setDeleteItemId(propertyId);
    setDeleteCampId(campId);
    setDeleteAdditionalInfo(undefined);
    setDeleteModalOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteItemId) return;

    try {
      setIsDeleting(true);
      setError(null);

      let url: string;
      if (deleteItemType === 'camp') {
        url = `${API_BASE_URL}/api/camps/${deleteItemId}`;
      } else if (deleteItemType === 'turnus' && deleteCampId) {
        url = `${API_BASE_URL}/api/camps/${deleteCampId}/properties/${deleteItemId}`;
      } else {
        throw new Error('Invalid delete operation');
      }

      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await loadCamps();
      handleDeleteCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
      console.error('Error deleting item:', err);
      handleDeleteCancel();
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle delete cancel
  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setDeleteItemType('camp');
    setDeleteItemName('');
    setDeleteItemId(null);
    setDeleteCampId(null);
    setDeleteAdditionalInfo(undefined);
  };

  // Handle create camp
  const handleCreateCamp = () => {
    router.push('/admin-panel/camps/new');
  };

  // Handle create property (turnus) - opens modal
  const handleCreateProperty = (campId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[CampsManagementTable] Opening create property modal for camp:', campId);
    setSelectedCampIdForProperty(campId);
    setShowPropertyForm(true);
  };

  // Handle edit property (turnus) - navigate to edit page
  const handleEditProperty = (campId: number, property: CampProperty, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[CampsManagementTable] Navigating to turnus edit page:', { campId, turnusId: property.id });
    router.push(`/admin-panel/camps/${campId}/turnus/${property.id}/edit`);
  };

  // Handle delete property (turnus) - now uses modal
  const handleDeleteProperty = (campId: number, property: CampProperty, e: React.MouseEvent) => {
    const propertyName = `${getPeriodLabel(property.period)} - ${property.city}`;
    handleDeletePropertyClick(campId, property.id, propertyName, e);
  };

  // Handle property form success (only for creating new turnus)
  const handlePropertyFormSuccess = async () => {
    console.log('[CampsManagementTable] Property form success - reloading camps');
    setShowPropertyForm(false);
    setSelectedCampIdForProperty(null);
    await loadCamps();
  };

  // Handle property form cancel
  const handlePropertyFormCancel = () => {
    console.log('[CampsManagementTable] Property form cancelled');
    setShowPropertyForm(false);
    setSelectedCampIdForProperty(null);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
  };

  const getPeriodLabel = (period: string) => {
    return period === 'lato' ? 'Lato' : 'Zima';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Ładowanie obozów...</div>
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between" style={{ marginTop: 0, paddingTop: 0, marginRight: '16px' }}>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Obozy</h1>
        <button
          onClick={handleCreateCamp}
          className="flex items-center gap-2 px-4 py-2 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-all duration-200 text-sm font-medium"
          style={{ borderRadius: 0, cursor: 'pointer' }}
        >
          <Plus className="w-4 h-4" />
          Dodaj obóz
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj po nazwie obozu, miejscowości, okresie..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
            style={{ borderRadius: 0 }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap gap-2">
        {/* Period Filters */}
        {availablePeriods.map(period => (
          <button
            key={period}
            onClick={() => handleFilterChange('period', periodFilter === period ? null : period)}
            className={`px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              periodFilter === period
                ? 'bg-white text-[#03adf0] border-2 border-[#03adf0]'
                : 'bg-white text-[#03adf0] border-2 border-[#03adf0] hover:bg-[#03adf0] hover:text-white'
            }`}
            style={{ borderRadius: 0, cursor: 'pointer' }}
          >
            Tylko {getPeriodLabel(period)}
          </button>
        ))}

        {/* City Multi-Select */}
        <div className="relative" ref={citySelectRef}>
          <button
            type="button"
            onClick={() => setIsCitySelectOpen(!isCitySelectOpen)}
            className={`px-3 py-1.5 text-xs font-medium border-2 border-[#03adf0] bg-white text-[#03adf0] focus:outline-none focus:ring-2 focus:ring-[#03adf0] min-w-[200px] text-left flex items-center justify-between gap-2 transition-all duration-200 ${
              isCitySelectOpen ? 'bg-[#03adf0] text-white' : ''
            }`}
            style={{ borderRadius: 0, cursor: 'pointer' }}
          >
            <span className="flex-1 truncate">
              {cityFilters.length === 0
                ? 'Wybierz miejscowości'
                : cityFilters.length === 1
                ? cityFilters[0]
                : `Wybrano: ${cityFilters.length}`}
            </span>
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform duration-200 ${isCitySelectOpen ? 'transform rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown */}
          {isCitySelectOpen && (
            <div className="absolute z-50 mt-1 w-full bg-white border-2 border-[#03adf0] shadow-lg max-h-64 overflow-hidden flex flex-col animate-scaleIn" style={{ borderRadius: 0 }}>
              {/* Search input */}
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Szukaj miejscowości..."
                    value={citySearchQuery}
                    onChange={(e) => setCitySearchQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] transition-all duration-200"
                    style={{ borderRadius: 0 }}
                    autoFocus
                  />
                </div>
              </div>

              {/* Options list */}
              <div className="overflow-y-auto flex-1 max-h-48">
                {filteredCities.length > 0 ? (
                  filteredCities.map((city) => {
                    const isSelected = cityFilters.includes(city);
                    return (
                      <label
                        key={city}
                        className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleCityFilterChange(city)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-[#03adf0] border-gray-300 focus:ring-[#03adf0]"
                            style={{ borderRadius: 0, cursor: 'pointer' }}
                          />
                          {isSelected && (
                            <Check className="absolute left-0 w-4 h-4 text-[#03adf0] pointer-events-none" />
                          )}
                        </div>
                        <span className="text-xs text-gray-900 flex-1">{city}</span>
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
          {cityFilters.length > 0 && !isCitySelectOpen && (
            <div className="absolute top-full left-0 mt-1 flex flex-wrap gap-1 max-w-[200px] z-10">
              {cityFilters.slice(0, 2).map((city) => (
                <span
                  key={city}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-[#03adf0] text-white"
                  style={{ borderRadius: 0 }}
                >
                  {city.length > 15 ? `${city.substring(0, 15)}...` : city}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCityFilter(city);
                    }}
                    className="hover:bg-[#0288c7] transition-colors"
                    style={{ cursor: 'pointer' }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {cityFilters.length > 2 && (
                <span
                  className="inline-flex items-center px-2 py-0.5 text-xs bg-[#03adf0] text-white"
                  style={{ borderRadius: 0 }}
                >
                  +{cityFilters.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {(periodFilter || cityFilters.length > 0 || searchQuery) && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 text-xs font-medium bg-white text-[#03adf0] border-2 border-[#03adf0] hover:bg-[#03adf0] hover:text-white transition-all duration-200"
            style={{ borderRadius: 0, cursor: 'pointer' }}
          >
            Wyczyść filtry
          </button>
        )}
      </div>

      {/* Results count and items per page */}
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs text-gray-600">
          Znaleziono: {filteredCamps.length} {filteredCamps.length === 1 ? 'obóz' : 'obozów'}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Na stronie:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 text-xs border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] transition-all duration-200"
            style={{ borderRadius: 0, cursor: 'pointer' }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Camps Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('id')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    ID
                    <SortIcon column="id" />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('name')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Nazwa obozu
                    <SortIcon column="name" />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('propertiesCount')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Liczba turnusów
                    <SortIcon column="propertiesCount" />
                  </div>
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Turnusy
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
              {paginatedCamps.length > 0 ? (
                paginatedCamps.map((camp) => {
                  const isExpanded = expandedRows.has(camp.id);
                  return (
                    <Fragment key={camp.id}>
                      <tr
                        className={`hover:bg-gray-50 transition-all duration-200 ${isExpanded ? 'bg-blue-50' : ''}`}
                        onClick={() => toggleRowExpansion(camp.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {camp.id}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {camp.name}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {camp.properties?.length || 0}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {camp.properties?.slice(0, 3).map((prop) => (
                              <span
                                key={prop.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {getPeriodLabel(prop.period)} - {prop.city}
                              </span>
                            ))}
                            {camp.properties && camp.properties.length > 3 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                +{camp.properties.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(camp.created_at)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => handleEditClick(camp, e)}
                              className="p-1.5 text-[#03adf0] hover:bg-blue-50 transition-all duration-200"
                              title="Edytuj"
                              style={{ cursor: 'pointer' }}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteClick(camp, e)}
                              className="p-1.5 text-red-600 hover:bg-red-50 transition-all duration-200"
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
                          <td colSpan={6} className="px-4 py-4">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-sm text-gray-900">Turnusy obozu</h4>
                                <button
                                  onClick={(e) => handleCreateProperty(camp.id, e)}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-all duration-200 text-xs font-medium"
                                  style={{ borderRadius: 0, cursor: 'pointer' }}
                                >
                                  <Plus className="w-3 h-3" />
                                  Dodaj turnus
                                </button>
                              </div>
                              {camp.properties && camp.properties.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {camp.properties.map((property) => (
                                    <div key={property.id} className="bg-white rounded-lg p-4 border border-gray-200 relative">
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {getPeriodLabel(property.period)}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={(e) => handleEditProperty(camp.id, property, e)}
                                              className="p-1 text-[#03adf0] hover:bg-blue-50 transition-all duration-200"
                                              title="Edytuj turnus"
                                              style={{ cursor: 'pointer' }}
                                            >
                                              <Edit className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={(e) => handleDeleteProperty(camp.id, property, e)}
                                              className="p-1 text-red-600 hover:bg-red-50 transition-all duration-200"
                                              title="Usuń turnus"
                                              style={{ cursor: 'pointer' }}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                          <MapPin className="w-3 h-3 text-gray-400" />
                                          <span className="text-gray-900">{property.city}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                          <Calendar className="w-3 h-3 text-gray-400" />
                                          <span className="text-gray-600">
                                            {formatDate(property.start_date)} - {formatDate(property.end_date)}
                                          </span>
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          Liczba dni: <span className="font-medium text-gray-900">{property.days_count}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 text-center py-4">
                                  <p className="mb-3">Brak turnusów dla tego obozu</p>
                                  <button
                                    onClick={(e) => handleCreateProperty(camp.id, e)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-all duration-200 text-xs font-medium"
                                    style={{ borderRadius: 0, cursor: 'pointer' }}
                                  >
                                    <Plus className="w-3 h-3" />
                                    Dodaj pierwszy turnus
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    Brak obozów spełniających kryteria wyszukiwania
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
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
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
                      className={`px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
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
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
                style={{ borderRadius: 0, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Następna
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Universal Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        itemType={deleteItemType}
        itemName={deleteItemName}
        itemId={deleteItemId || 0}
        additionalInfo={deleteAdditionalInfo}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isLoading={isDeleting}
      />

      {/* Property Form Modal */}
      {showPropertyForm && selectedCampIdForProperty && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fadeIn"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(2px)',
          }}
          onClick={handlePropertyFormCancel}
        >
          <div
            className="bg-white shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn"
            style={{ borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <CampPropertyForm
              campId={selectedCampIdForProperty}
              property={null} // Always null - modal is only for creating new turnusy
              onSuccess={handlePropertyFormSuccess}
              onCancel={handlePropertyFormCancel}
            />
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

