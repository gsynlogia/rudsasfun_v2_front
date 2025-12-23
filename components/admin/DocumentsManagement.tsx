'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Search, ChevronUp, ChevronDown, Edit, Trash2, Plus, Eye, EyeOff, Check } from 'lucide-react';
import { authenticatedApiCall } from '@/utils/api-auth';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface Document {
  id: number;
  name: string;
  display_name: string;
  file_path: string | null;
  file_url: string | null;
  is_public: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export default function DocumentsManagement() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingFiles, setDeletingFiles] = useState<Map<number, boolean>>(new Map());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  // State for search, sorting, and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [publicFilter, setPublicFilter] = useState<boolean | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>('display_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch all documents
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authenticatedApiCall<{ documents: Document[]; total: number }>(
        '/api/documents/'
      );
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('[DocumentsManagement] Error fetching documents:', err);
      const errorMessage = err instanceof Error ? err.message : 'Błąd podczas ładowania dokumentów';
      setError(errorMessage);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let filtered = [...documents];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        doc =>
          doc.display_name.toLowerCase().includes(query) ||
          doc.name.toLowerCase().includes(query)
      );
    }

    // Public filter
    if (publicFilter !== null) {
      filtered = filtered.filter(doc => doc.is_public === publicFilter);
    }

    // Sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aValue: string | number | boolean;
        let bValue: string | number | boolean;

        switch (sortColumn) {
          case 'display_name':
            aValue = a.display_name;
            bValue = b.display_name;
            break;
          case 'is_public':
            aValue = a.is_public;
            bValue = b.is_public;
            break;
          case 'created_at':
            aValue = new Date(a.created_at).getTime();
            bValue = new Date(b.created_at).getTime();
            break;
          default:
            return 0;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
          return sortDirection === 'asc'
            ? (aValue === bValue ? 0 : aValue ? 1 : -1)
            : (aValue === bValue ? 0 : aValue ? -1 : 1);
        } else {
          return sortDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
        }
      });
    }

    return filtered;
  }, [searchQuery, publicFilter, sortColumn, sortDirection, documents]);

  // Pagination
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

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

  // Handle row click - navigate to edit page
  const handleRowClick = (documentId: number) => {
    router.push(`/admin-panel/cms/documents/${documentId}/edit`);
  };

  // Handle edit click
  const handleEditClick = (document: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/admin-panel/cms/documents/${document.id}/edit`);
  };

  // Handle delete click
  const handleDeleteClick = (document: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    setDocumentToDelete(document);
    setShowDeleteModal(true);
  };

  // Handle document deletion confirmation
  const handleDeleteDocumentConfirm = async () => {
    if (!documentToDelete) {
      setShowDeleteModal(false);
      setDocumentToDelete(null);
      return;
    }

    try {
      setDeletingFiles(prev => new Map(prev).set(documentToDelete.id, true));
      setError(null);

      await authenticatedApiCall<Document>(`/api/documents/${documentToDelete.id}`, {
        method: 'DELETE',
      });

      await fetchDocuments();
      setShowDeleteModal(false);
      setDocumentToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas usuwania dokumentu');
      console.error('[DocumentsManagement] Error deleting document:', err);
    } finally {
      setDeletingFiles(prev => {
        const newMap = new Map(prev);
        newMap.delete(documentToDelete.id);
        return newMap;
      });
    }
  };

  // Handle delete modal cancel
  const handleDeleteDocumentCancel = () => {
    setShowDeleteModal(false);
    setDocumentToDelete(null);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setPublicFilter(null);
    setCurrentPage(1);
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
  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-2" style={{ marginTop: 0, paddingTop: 0 }}>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dokumenty</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
            <p className="text-gray-600">Ładowanie dokumentów...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && documents.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-2" style={{ marginTop: 0, paddingTop: 0 }}>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dokumenty</h1>
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
      <div className="mb-2 flex items-center justify-between" style={{ marginTop: 0, paddingTop: 0 }}>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dokumenty</h1>
        <button
          onClick={() => router.push('/admin-panel/cms/documents/new')}
          className="flex items-center gap-2 px-4 py-2 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-colors text-sm font-medium"
          style={{ borderRadius: 0, cursor: 'pointer' }}
        >
          <Plus className="w-4 h-4" />
          Dodaj dokument
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-3 bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj po nazwie dokumentu..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm"
            style={{ borderRadius: 0 }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => setPublicFilter(publicFilter === true ? null : true)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            publicFilter === true
              ? 'bg-white text-[#03adf0] border-2 border-[#03adf0]'
              : 'bg-white text-[#03adf0] border-2 border-[#03adf0] hover:bg-[#03adf0] hover:text-white'
          }`}
          style={{ borderRadius: 0, cursor: 'pointer' }}
        >
          Tylko publiczne
        </button>
        <button
          onClick={() => setPublicFilter(publicFilter === false ? null : false)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            publicFilter === false
              ? 'bg-white text-[#03adf0] border-2 border-[#03adf0]'
              : 'bg-white text-[#03adf0] border-2 border-[#03adf0] hover:bg-[#03adf0] hover:text-white'
          }`}
          style={{ borderRadius: 0, cursor: 'pointer' }}
        >
          Tylko prywatne
        </button>
        {(publicFilter !== null || searchQuery) && (
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
          Znaleziono: {filteredDocuments.length} {filteredDocuments.length === 1 ? 'dokument' : 'dokumentów'}
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

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('display_name')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Nazwa dokumentu
                    <SortIcon column="display_name" />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('is_public')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Status
                    <SortIcon column="is_public" />
                  </div>
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plik
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('created_at')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-1">
                    Data utworzenia
                    <SortIcon column="created_at" />
                  </div>
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedDocuments.length > 0 ? (
                paginatedDocuments.map((document) => {
                  const isDeleting = deletingFiles.get(document.id) || false;
                  const hasFile = !!document.file_path;

                  return (
                    <tr
                      key={document.id}
                      className="hover:bg-gray-50 transition-all duration-200"
                      onClick={() => handleRowClick(document.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {document.display_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {document.is_public ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Eye className="w-3 h-3" />
                            Publiczny
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <EyeOff className="w-3 h-3" />
                            Prywatny
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {hasFile ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <Check className="w-4 h-4" />
                            Zapisano
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Brak pliku</span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(document.created_at)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleEditClick(document, e)}
                            className="p-1.5 text-[#03adf0] hover:bg-blue-50 transition-colors"
                            title="Edytuj"
                            style={{ cursor: 'pointer' }}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(document, e)}
                            disabled={isDeleting}
                            className="p-1.5 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Usuń"
                            style={{ cursor: isDeleting ? 'not-allowed' : 'pointer' }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    {searchQuery || publicFilter !== null
                      ? 'Nie znaleziono dokumentów pasujących do filtrów'
                      : 'Brak dokumentów. Kliknij "Dodaj dokument" aby utworzyć nowy.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-xs text-gray-600">
              Strona {currentPage} z {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-xs border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: 0 }}
              >
                Poprzednia
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-xs border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: 0 }}
              >
                Następna
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        itemType="other"
        itemName={documentToDelete?.display_name || ''}
        itemId={documentToDelete?.id || 0}
        additionalInfo="Dokument zostanie usunięty z systemu (soft delete). Plik zostanie usunięty z dysku."
        onConfirm={handleDeleteDocumentConfirm}
        onCancel={handleDeleteDocumentCancel}
        isLoading={documentToDelete ? deletingFiles.get(documentToDelete.id) || false : false}
      />
    </div>
  );
}
