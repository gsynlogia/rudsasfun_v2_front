'use client';

import { UtensilsCrossed, Plus, Search, Edit, Trash2, Power, PowerOff, Save, DollarSign, FileText, ChevronDown, Check, X } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useRef, useMemo } from 'react';

import { authenticatedApiCall } from '@/utils/api-auth';
import { getStaticAssetUrl } from '@/utils/api-config';

import DeleteConfirmationModal from './DeleteConfirmationModal';
import UniversalModal from './UniversalModal';

interface TurnusInfo {
  turnus_id: number;
  camp_id: number;
  camp_name: string | null;
  city: string;
  start_date: string | null;
  end_date: string | null;
}

interface Diet {
  id: number;
  name: string;
  price: number;
  description?: string | null;
  icon_name?: string | null;
  icon_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  turnus_info?: TurnusInfo[] | null;
}

export default function DietsManagement() {
  const [diets, setDiets] = useState<Diet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDiet, setSelectedDiet] = useState<Diet | null>(null);
  const [saving, setSaving] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [nameFilters, setNameFilters] = useState<string[]>([]); // Multi-select for names
  const [priceMinFilter, setPriceMinFilter] = useState<number | ''>('');
  const [priceMaxFilter, setPriceMaxFilter] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // 'all', 'active', 'inactive'

  // Multi-select state for names
  const [isNameSelectOpen, setIsNameSelectOpen] = useState(false);
  const [nameSearchQuery, setNameSearchQuery] = useState('');
  const nameSelectRef = useRef<HTMLDivElement>(null);

  // Store all available diet names (for multi-select)
  const [allDietNames, setAllDietNames] = useState<string[]>([]);

  // Also update names from currently loaded diets as a backup
  // This ensures names are available even if initial fetch fails
  useEffect(() => {
    if (diets.length > 0 && allDietNames.length === 0) {
      // Only update if we don't have names yet (fallback scenario)
      const namesFromCurrentDiets = Array.from(new Set(
        diets.map(d => d?.name).filter(Boolean),
      )).sort();

      if (namesFromCurrentDiets.length > 0) {
        setAllDietNames(namesFromCurrentDiets);
        console.log('[DietsManagement] Using names from table as fallback:', namesFromCurrentDiets.length);
      }
    }
  }, [diets, allDietNames.length]);

  // Form state
  const [dietName, setDietName] = useState('');
  const [dietPrice, setDietPrice] = useState<number | ''>(0);
  const [dietDescription, setDietDescription] = useState('');
  const [dietIconName, setDietIconName] = useState('');
  const [dietIconUrl, setDietIconUrl] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  // Fetch all unique diet names for multi-select (once on mount)
  useEffect(() => {
    const fetchAllDietNames = async () => {
      try {
        // Use dedicated endpoint that returns all unique names without pagination
        const names = await authenticatedApiCall<string[]>(
          '/api/diets/names',
        );

        console.log('[DietsManagement] Loaded diet names from API:', names.length, 'unique names');
        setAllDietNames(names || []);
      } catch (err) {
        console.error('[DietsManagement] Error fetching diet names:', err);
        // Fallback: try to extract names from currently loaded diets
        if (diets.length > 0) {
          const namesFromDiets = Array.from(new Set(
            diets.map(d => d.name).filter(Boolean),
          )).sort();
          setAllDietNames(namesFromDiets);
        }
      }
    };
    fetchAllDietNames();
  }, []); // Only run once on mount

  // Filter available names based on search query
  const filteredAvailableNames = useMemo(() => {
    if (!nameSearchQuery.trim()) {
      return allDietNames;
    }
    const query = nameSearchQuery.toLowerCase();
    return allDietNames.filter(name => name.toLowerCase().includes(query));
  }, [allDietNames, nameSearchQuery]);

  // Build query params for filters and pagination
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.append('page', currentPage.toString());
    params.append('limit', itemsPerPage.toString());

    if (nameFilters.length > 0) {
      params.append('names', nameFilters.join(','));
    }

    if (priceMinFilter !== '') {
      params.append('price_min', priceMinFilter.toString());
    }

    if (priceMaxFilter !== '') {
      params.append('price_max', priceMaxFilter.toString());
    }

    if (statusFilter === 'active') {
      params.append('is_active', 'true');
    } else if (statusFilter === 'inactive') {
      params.append('is_active', 'false');
    }
    // 'all' means no is_active parameter

    return params.toString();
  };

  // Fetch diets with filters and pagination
  const fetchDiets = async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = buildQueryParams();
      const data = await authenticatedApiCall<{ diets: Diet[]; total: number }>(
        `/api/diets/?${queryParams}`,
      );
      setDiets(data.diets || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error('[DietsManagement] Error fetching diets:', err);
      const errorMessage = err instanceof Error ? err.message : 'Błąd podczas ładowania diet';
      setError(errorMessage);
      setDiets([]);
      setTotalCount(0);

      // If it's an authentication error, the SectionGuard should handle redirect
      if (errorMessage.includes('Not authenticated') || errorMessage.includes('Session expired')) {
        // Don't set error, let SectionGuard handle it
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiets();
  }, [currentPage, itemsPerPage, nameFilters, priceMinFilter, priceMaxFilter, statusFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nameSelectRef.current && !nameSelectRef.current.contains(event.target as Node)) {
        setIsNameSelectOpen(false);
        setNameSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle name filter (multi-select)
  const handleNameFilterChange = (name: string) => {
    setNameFilters(prev => {
      if (prev.includes(name)) {
        return prev.filter(n => n !== name);
      } else {
        return [...prev, name];
      }
    });
    setCurrentPage(1);
  };

  // Remove single name filter
  const removeNameFilter = (name: string) => {
    setNameFilters(prev => prev.filter(n => n !== name));
    setCurrentPage(1);
  };

  // Format diet name with turnus info
  const formatDietName = (diet: Diet): string => {
    if (!diet.turnus_info || diet.turnus_info.length === 0) {
      return diet.name;
    }

    // If diet is assigned to turnuses, show turnus info
    if (diet.turnus_info.length === 1) {
      const turnus = diet.turnus_info[0];
      const startDate = turnus.start_date ? new Date(turnus.start_date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
      const endDate = turnus.end_date ? new Date(turnus.end_date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
      const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : '';
      return `${diet.name} (${turnus.city}${dateRange ? `, ${dateRange}` : ''})`;
    } else {
      // Multiple turnuses - show first turnus info in name, details in subtitle
      const firstTurnus = diet.turnus_info[0];
      const startDate = firstTurnus.start_date ? new Date(firstTurnus.start_date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
      const endDate = firstTurnus.end_date ? new Date(firstTurnus.end_date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
      const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : '';
      return `${diet.name} (${firstTurnus.city}${dateRange ? `, ${dateRange}` : ''}, +${diet.turnus_info.length - 1} więcej)`;
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Handle filter changes - reset to page 1
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Clear all filters
  const clearFilters = () => {
    setNameFilters([]);
    setPriceMinFilter('');
    setPriceMaxFilter('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  // Reset form
  const resetForm = () => {
    setDietName('');
    setDietPrice(0);
    setDietDescription('');
    setDietIconName('');
    setDietIconUrl(null);
    setIconFile(null);
    setSelectedDiet(null);
  };

  // Open create modal
  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  // Open edit modal
  const handleEdit = (diet: Diet) => {
    setSelectedDiet(diet);
    setDietName(diet.name);
    setDietPrice(diet.price);
    setDietDescription(diet.description || '');
    setDietIconName(diet.icon_name || '');
    setDietIconUrl(diet.icon_url || null);
    setIconFile(null);
    setShowEditModal(true);
  };

  // Open delete modal
  const handleDelete = (diet: Diet) => {
    setSelectedDiet(diet);
    setShowDeleteModal(true);
  };

  // Handle icon upload
  const handleIconUpload = async (file: File): Promise<string | null> => {
    if (!file.name.endsWith('.svg')) {
      setError('Tylko pliki SVG są dozwolone');
      return null;
    }

    try {
      setUploadingIcon(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await authenticatedApiCall<{ url: string; filename: string; relative_path: string }>(
        '/api/diets/upload-icon',
        {
          method: 'POST',
          body: formData,
        },
      );

      // Return the full URL for display, but we'll store relative_path in database
      return response.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas przesyłania ikony');
      console.error('[DietsManagement] Error uploading icon:', err);
      return null;
    } finally {
      setUploadingIcon(false);
    }
  };

  // Handle file input change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIconFile(file);
    const uploadedUrl = await handleIconUpload(file);
    if (uploadedUrl) {
      setDietIconUrl(uploadedUrl);
    }
  };

  // Handle save (create or update)
  const handleSave = async () => {
    if (!dietName.trim()) {
      setError('Nazwa diety jest wymagana');
      return;
    }

    if (dietPrice === '' || dietPrice < 0) {
      setError('Cena musi być większa lub równa 0');
      return;
    }

    // Upload icon if file is selected but not yet uploaded
    let finalIconUrl = dietIconUrl;
    if (iconFile && !dietIconUrl) {
      const uploadResult = await handleIconUpload(iconFile);
      if (!uploadResult) {
        return; // Error already set in handleIconUpload
      }
      finalIconUrl = uploadResult;
      setDietIconUrl(finalIconUrl);
    }

    try {
      setSaving(true);
      setError(null);

      // Convert full URL to relative path for storage
      let iconUrlToStore = finalIconUrl;
      if (iconUrlToStore && iconUrlToStore.startsWith('http')) {
        try {
          const url = new URL(iconUrlToStore);
          iconUrlToStore = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
        } catch {
          // Keep original if URL parsing fails
        }
      }

      const dietData = {
        name: dietName.trim(),
        price: Number(dietPrice),
        description: dietDescription.trim() || null,
        icon_name: dietIconName.trim() || null,
        icon_url: iconUrlToStore || null,
        is_active: true,
      };

      if (selectedDiet) {
        await authenticatedApiCall<Diet>(`/api/diets/${selectedDiet.id}`, {
          method: 'PUT',
          body: JSON.stringify(dietData),
        });
      } else {
        await authenticatedApiCall<Diet>('/api/diets/', {
          method: 'POST',
          body: JSON.stringify(dietData),
        });
      }

      await fetchDiets();
      resetForm();
      setShowCreateModal(false);
      setShowEditModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zapisywania diety');
      console.error('[DietsManagement] Error saving diet:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!selectedDiet) return;

    try {
      setSaving(true);
      setError(null);

      await authenticatedApiCall(`/api/diets/${selectedDiet.id}`, {
        method: 'DELETE',
      });

      await fetchDiets();
      setShowDeleteModal(false);
      setSelectedDiet(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas usuwania diety');
      console.error('[DietsManagement] Error deleting diet:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active status
  const handleToggleStatus = async (diet: Diet) => {
    try {
      setSaving(true);
      setError(null);

      await authenticatedApiCall<Diet>(`/api/diets/${diet.id}/toggle`, {
        method: 'PATCH',
      });

      await fetchDiets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zmiany statusu diety');
      console.error('[DietsManagement] Error toggling diet status:', err);
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
          <p className="text-sm text-gray-600">Ładowanie diet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Zarządzanie dietami</h1>
            <p className="text-sm text-gray-500 mt-1">Dodawaj, edytuj i zarządzaj dietami dostępnymi w systemie</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#03adf0] text-white rounded-lg hover:bg-[#0288c7] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Dodaj dietę
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Name Filter - Multi-select */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Nazwa</label>
            <div className="relative" ref={nameSelectRef}>
              <button
                type="button"
                onClick={() => setIsNameSelectOpen(!isNameSelectOpen)}
                className={`w-full px-3 py-2 text-sm font-medium border-2 border-[#03adf0] bg-white text-[#03adf0] focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-left flex items-center justify-between gap-2 rounded-lg ${
                  isNameSelectOpen ? 'bg-[#03adf0] text-white' : ''
                }`}
              >
                <span className="flex-1 truncate">
                  {nameFilters.length === 0
                    ? 'Wybierz nazwy diet'
                    : nameFilters.length === 1
                    ? nameFilters[0]
                    : `Wybrano: ${nameFilters.length}`}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isNameSelectOpen ? 'transform rotate-180' : ''}`}
                />
              </button>

              {/* Dropdown */}
              {isNameSelectOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border-2 border-[#03adf0] shadow-lg max-h-64 overflow-hidden flex flex-col rounded-lg">
                  {/* Search input */}
                  <div className="p-2 border-b border-gray-200">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Szukaj nazwy diety..."
                        value={nameSearchQuery}
                        onChange={(e) => setNameSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] rounded-lg"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Options list */}
                  <div className="overflow-y-auto flex-1 max-h-48">
                    {filteredAvailableNames.length > 0 ? (
                      filteredAvailableNames.map((name) => {
                        const isSelected = nameFilters.includes(name);
                        return (
                          <label
                            key={name}
                            className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer ${
                              isSelected ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleNameFilterChange(name)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 text-[#03adf0] border-gray-300 focus:ring-[#03adf0] rounded"
                              />
                              {isSelected && (
                                <Check className="absolute left-0 w-4 h-4 text-[#03adf0] pointer-events-none" />
                              )}
                            </div>
                            <span className="text-sm text-gray-900 flex-1">{name}</span>
                          </label>
                        );
                      })
                    ) : (
                      <div className="px-3 py-4 text-sm text-gray-500 text-center">
                        Brak wyników
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Selected items as chips */}
              {nameFilters.length > 0 && !isNameSelectOpen && (
                <div className="absolute top-full left-0 mt-1 flex flex-wrap gap-1 max-w-full z-10">
                  {nameFilters.slice(0, 3).map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[#03adf0] text-white rounded-lg"
                    >
                      {name.length > 20 ? `${name.substring(0, 20)}...` : name}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNameFilter(name);
                        }}
                        className="hover:bg-[#0288c7] rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {nameFilters.length > 3 && (
                    <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-lg">
                      +{nameFilters.length - 3} więcej
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Price Min Filter */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Cena min (PLN)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={priceMinFilter}
              onChange={(e) => {
                setPriceMinFilter(e.target.value === '' ? '' : parseFloat(e.target.value));
                handleFilterChange();
              }}
              placeholder="0.00"
              className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
            />
          </div>

          {/* Price Max Filter */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Cena max (PLN)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={priceMaxFilter}
              onChange={(e) => {
                setPriceMaxFilter(e.target.value === '' ? '' : parseFloat(e.target.value));
                handleFilterChange();
              }}
              placeholder="9999.99"
              className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                handleFilterChange();
              }}
              className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
            >
              <option value="all">Wszystkie</option>
              <option value="active">Aktywne</option>
              <option value="inactive">Nieaktywne</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Wyczyść
            </button>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-xs text-gray-600">
          Znaleziono: {totalCount} {totalCount === 1 ? 'dieta' : totalCount < 5 ? 'diety' : 'diet'}
        </div>
      </div>

      {/* Items per page selector */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Na stronie:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] transition-all duration-200"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Diets Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {diets.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Brak diet do wyświetlenia</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ikona</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nazwa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cena</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opis</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {diets.map((diet) => {
                  return (
                    <tr key={diet.id} className={!diet.is_active ? 'opacity-50' : ''}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {diet.icon_url ? (
                          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded">
                            <Image
                              src={getStaticAssetUrl(diet.icon_url) || ''}
                              alt={diet.name}
                              width={24}
                              height={24}
                              className="object-contain"
                              unoptimized
                              onError={(e) => {
                                // Fallback if image fails to load
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ) : diet.icon_name ? (
                          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded">
                            <span className="text-xs font-mono text-gray-600">{diet.icon_name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-8 h-8">
                            <span className="text-gray-400">-</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{formatDietName(diet)}</div>
                        {diet.turnus_info && diet.turnus_info.length > 0 && (
                          <div className="text-xs text-blue-600 mt-1">
                            {diet.turnus_info.length === 1
                              ? `Turnus: ${diet.turnus_info[0].camp_name || 'N/A'}`
                              : `Przypisana do ${diet.turnus_info.length} turnusów`
                            }
                          </div>
                        )}
                        {diet.icon_name && !diet.icon_url && (
                          <div className="text-xs text-gray-500">{diet.icon_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{diet.price.toFixed(2)} PLN</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {diet.description || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          diet.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {diet.is_active ? 'Aktywna' : 'Nieaktywna'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(diet)}
                            className="text-gray-600 hover:text-[#03adf0] transition-colors"
                            title={diet.is_active ? 'Wyłącz' : 'Włącz'}
                            disabled={saving}
                          >
                            {diet.is_active ? (
                              <PowerOff className="w-4 h-4" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEdit(diet)}
                            className="text-gray-600 hover:text-[#03adf0] transition-colors"
                            title="Edytuj"
                            disabled={saving}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(diet)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Usuń"
                            disabled={saving}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

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
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg"
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
                      className={`px-3 py-1.5 text-xs font-medium transition-colors rounded-lg ${
                        currentPage === page
                          ? 'bg-[#03adf0] text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
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
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg"
              >
                Następna
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <UniversalModal
        isOpen={showCreateModal || showEditModal}
              onClose={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                resetForm();
              }}
        title={selectedDiet ? 'Edytuj dietę' : 'Dodaj nową dietę'}
        maxWidth="lg"
      >
        <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="space-y-5"
            >
            {/* Name */}
            <div>
              <label htmlFor="diet-name" className="block text-sm font-medium text-gray-700 mb-2">
                <UtensilsCrossed className="w-4 h-4 inline mr-1.5 text-[#03adf0]" />
                Nazwa diety <span className="text-red-500">*</span>
              </label>
              <input
                id="diet-name"
                type="text"
                value={dietName}
                onChange={(e) => setDietName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent transition-all"
                placeholder="np. Dieta wegetariańska"
                disabled={saving}
              />
            </div>

            {/* Price */}
            <div>
              <label htmlFor="diet-price" className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1.5 text-[#03adf0]" />
                Cena (PLN) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="diet-price"
                  type="number"
                  value={dietPrice}
                  onChange={(e) => setDietPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent transition-all"
                  placeholder="0.00"
                  disabled={saving}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">PLN</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="diet-description" className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1.5 text-[#03adf0]" />
                Opis diety <span className="text-gray-500 text-xs">(opcjonalny)</span>
              </label>
              <textarea
                id="diet-description"
                value={dietDescription}
                onChange={(e) => setDietDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent transition-all resize-none"
                placeholder="Krótki opis diety, np. dieta bezglutenowa, wegańska, itp."
                disabled={saving}
              />
            </div>

            {/* Icon Upload (Optional) */}
            <div>
              <label htmlFor="icon-file" className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1.5 text-[#03adf0]" />
                Ikona SVG (opcjonalnie)
              </label>
              <div className="space-y-3">
                {dietIconUrl && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border-2 border-[#03adf0] rounded-lg">
                    <div className="flex items-center justify-center w-12 h-12 bg-white rounded-lg border border-[#03adf0]">
                      <Image
                        src={dietIconUrl}
                        alt="Preview"
                        width={32}
                        height={32}
                        className="object-contain"
                        unoptimized
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Wybrana ikona:</p>
                      <p className="text-xs font-mono text-gray-600 truncate">{dietIconUrl}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDietIconUrl(null);
                        setIconFile(null);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                      disabled={saving || uploadingIcon}
                    >
                      Usuń
                    </button>
                  </div>
                )}
                <div>
                  <input
                    id="icon-file"
                    type="file"
                    accept=".svg"
                    onChange={handleFileChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#03adf0] file:text-white hover:file:bg-[#0288c7] file:cursor-pointer"
                    disabled={saving || uploadingIcon}
                  />
                  {uploadingIcon && (
                    <p className="mt-1.5 text-xs text-blue-600">Przesyłanie ikony...</p>
                  )}
                </div>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Wybierz plik SVG jako ikonę diety. Jeśli nie wybierzesz ikony, dieta będzie wyświetlana bez ikony.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                style={{ cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={saving || !dietName.trim()}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#03adf0] rounded-lg hover:bg-[#0288c7] transition-colors disabled:opacity-50 shadow-sm"
                style={{ cursor: (saving || !dietName.trim()) ? 'not-allowed' : 'pointer' }}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Zapisywanie...' : selectedDiet ? 'Zapisz zmiany' : 'Dodaj dietę'}
              </button>
            </div>
          </form>
        </div>
      </UniversalModal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedDiet(null);
        }}
        onConfirm={handleDeleteConfirm}
        itemType="other"
        itemName={selectedDiet?.name || 'Dietę'}
        itemId={selectedDiet?.id || 0}
        additionalInfo="Ta operacja jest nieodwracalna."
        isLoading={saving}
      />
    </div>
  );
}

