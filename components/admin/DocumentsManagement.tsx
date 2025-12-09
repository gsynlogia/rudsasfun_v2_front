'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Upload, Check, X, Eye, EyeOff, Trash2 } from 'lucide-react';
import { authenticatedApiCall } from '@/utils/api-auth';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface Document {
  id: number;
  name: string;
  display_name: string;
  file_path: string | null;
  file_url: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export default function DocumentsManagement() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, boolean>>(new Map());
  const [deletingFiles, setDeletingFiles] = useState<Map<number, boolean>>(new Map());
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  // Fetch all documents (excluding tourist_regulations_insurance and watt_input_regulation)
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authenticatedApiCall<{ documents: Document[]; total: number }>(
        '/api/documents/'
      );
      // Filter out documents that should not be displayed in admin panel
      const excludedDocuments = ['tourist_regulations_insurance', 'watt_input_regulation'];
      const filteredDocuments = (data.documents || []).filter(
        doc => !excludedDocuments.includes(doc.name)
      );
      setDocuments(filteredDocuments);
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

  // Handle file upload
  const handleFileUpload = async (documentName: string, file: File) => {
    if (!file.name.endsWith('.pdf')) {
      setError('Tylko pliki PDF są dozwolone');
      return;
    }

    try {
      setUploadingFiles(prev => new Map(prev).set(documentName, true));
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      await authenticatedApiCall<{ url: string; filename: string; relative_path: string }>(
        `/api/documents/${documentName}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      // Refresh documents list
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas przesyłania dokumentu');
      console.error('[DocumentsManagement] Error uploading document:', err);
    } finally {
      setUploadingFiles(prev => {
        const newMap = new Map(prev);
        newMap.delete(documentName);
        return newMap;
      });
    }
  };

  // Handle file input change
  const handleFileChange = (documentName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileUpload(documentName, file);
  };

  // Handle toggle public status
  const handleTogglePublic = async (document: Document) => {
    try {
      setSaving(true);
      setError(null);

      await authenticatedApiCall<Document>(`/api/documents/${document.id}/toggle-public`, {
        method: 'PATCH',
      });

      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zmiany statusu dokumentu');
      console.error('[DocumentsManagement] Error toggling document status:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle delete file button click - open modal
  const handleDeleteFileClick = (document: Document) => {
    if (!document.file_path) {
      return;
    }
    setDocumentToDelete(document);
    setShowDeleteModal(true);
  };

  // Handle file deletion confirmation
  const handleDeleteFileConfirm = async () => {
    if (!documentToDelete || !documentToDelete.file_path) {
      setShowDeleteModal(false);
      setDocumentToDelete(null);
      return;
    }

    try {
      setDeletingFiles(prev => new Map(prev).set(documentToDelete.id, true));
      setError(null);

      await authenticatedApiCall<Document>(`/api/documents/${documentToDelete.id}/delete-file`, {
        method: 'DELETE',
      });

      await fetchDocuments();
      setShowDeleteModal(false);
      setDocumentToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas usuwania pliku');
      console.error('[DocumentsManagement] Error deleting file:', err);
    } finally {
      setDeletingFiles(prev => {
        const newMap = new Map(prev);
        newMap.delete(documentToDelete.id);
        return newMap;
      });
    }
  };

  // Handle delete modal cancel
  const handleDeleteFileCancel = () => {
    setShowDeleteModal(false);
    setDocumentToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
          <p className="text-sm text-gray-600">Ładowanie dokumentów...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Zarządzanie Dokumentami</h1>

      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded relative z-10">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Documents List */}
      <div className="space-y-4">
        {documents.map((document) => {
          const isUploading = uploadingFiles.get(document.name) || false;
          const isDeleting = deletingFiles.get(document.id) || false;
          const hasFile = !!document.file_path;

          return (
            <div
              key={document.id}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left side: Document info and upload */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-6 h-6 text-[#03adf0]" />
                    <h3 className="text-lg font-semibold text-gray-800">{document.display_name}</h3>
                  </div>

                  {/* File upload section */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prześlij plik PDF
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileChange(document.name, e)}
                        disabled={isUploading || saving}
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#03adf0] file:text-white hover:file:bg-[#0288c7] file:cursor-pointer disabled:opacity-50"
                      />
                      {isUploading && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#03adf0]"></div>
                          <span>Przesyłanie...</span>
                        </div>
                      )}
                      {hasFile && !isUploading && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <Check className="w-4 h-4" />
                          <span>Zapisano</span>
                        </div>
                      )}
                    </div>
                    {hasFile && document.file_url && (
                      <div className="mt-2 flex items-center gap-4">
                        <a
                          href={document.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#03adf0] hover:underline flex items-center gap-1"
                        >
                          <FileText className="w-4 h-4" />
                          Otwórz dokument
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteFileClick(document)}
                          disabled={isDeleting || saving}
                          className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Usuń plik</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: Public toggle */}
                <div className="flex flex-col items-end gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={document.is_public}
                      onChange={() => handleTogglePublic(document)}
                      disabled={!hasFile || saving}
                      className="w-5 h-5 text-[#03adf0] border-gray-300 rounded focus:ring-[#03adf0] focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {document.is_public ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <Eye className="w-4 h-4" />
                          Publiczny
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-500">
                          <EyeOff className="w-4 h-4" />
                          Prywatny
                        </span>
                      )}
                    </span>
                  </label>
                  {!hasFile && (
                    <p className="text-xs text-gray-500 text-right">
                      Najpierw prześlij plik
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {documents.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          <p>Brak dokumentów w systemie.</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        itemType="other"
        itemName={documentToDelete?.display_name || ''}
        itemId={documentToDelete?.id || 0}
        additionalInfo="Plik zostanie usunięty z dysku, ale rekord dokumentu pozostanie w bazie danych."
        onConfirm={handleDeleteFileConfirm}
        onCancel={handleDeleteFileCancel}
        isLoading={documentToDelete ? deletingFiles.get(documentToDelete.id) || false : false}
      />
    </div>
  );
}

