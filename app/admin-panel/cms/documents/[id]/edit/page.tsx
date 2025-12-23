'use client';

import { ArrowLeft, Save, X } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import { authenticatedApiCall } from '@/utils/api-auth';

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

/**
 * Document Edit Page
 * Route: /admin-panel/cms/documents/[id]/edit
 */
export default function DocumentEditPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;

  // State for form data
  const [formData, setFormData] = useState({
    display_name: '',
    is_public: false,
  });

  const [file, setFile] = useState<File | null>(null);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Load document data
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setIsLoading(true);
        const document = await authenticatedApiCall<Document>(`/api/documents/${documentId}`);
        setFormData({
          display_name: document.display_name,
          is_public: document.is_public,
        });
        setCurrentFileUrl(document.file_url);
        setCurrentFilePath(document.file_path);
      } catch (err) {
        console.error('Error fetching document:', err);
        setError(err instanceof Error ? err.message : 'Błąd podczas ładowania dokumentu');
      } finally {
        setIsLoading(false);
      }
    };

    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);

  const handleSave = async () => {
    if (!formData.display_name.trim()) {
      setError('Nazwa dokumentu jest wymagana');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Update document data
      await authenticatedApiCall<Document>(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: formData.display_name,
          is_public: formData.is_public,
        }),
      });

      // Upload file if selected
      if (file) {
        setUploadingFile(true);
        const formDataFile = new FormData();
        formDataFile.append('file', file);

        await authenticatedApiCall<{ url: string; filename: string; relative_path: string }>(
          `/api/documents/${documentId}/upload`,
          {
            method: 'POST',
            body: formDataFile,
          }
        );
      }

      router.push('/admin-panel/cms/documents');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zapisywania dokumentu');
      console.error('Error saving document:', err);
    } finally {
      setIsSaving(false);
      setUploadingFile(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin-panel/cms/documents');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedExtensions = ['.pdf', '.doc', '.docx'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
      
      if (!allowedExtensions.includes(fileExtension)) {
        setError('Tylko pliki PDF, DOC i DOCX są dozwolone');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  if (isLoading) {
    return (
      <SectionGuard section="cms">
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
              <div className="text-gray-500">Ładowanie...</div>
            </div>
          </div>
        </AdminLayout>
      </SectionGuard>
    );
  }

  return (
    <SectionGuard section="cms">
      <AdminLayout>
        <div className="h-full flex flex-col animate-fadeIn">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 rounded"
                style={{ borderRadius: 0, cursor: 'pointer' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Edytuj dokument</h1>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-slideUp">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nazwa dokumentu *
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                  style={{ borderRadius: 0 }}
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plik (PDF, DOC, DOCX)
                </label>
                {currentFileUrl && currentFilePath && !file && (
                  <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Obecnie wgrany plik:
                        </p>
                        <p className="text-sm text-gray-600 mb-2 break-all">
                          {currentFilePath.split('/').pop() || currentFilePath}
                        </p>
                        <a
                          href={currentFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-[#03adf0] hover:text-[#0288c7] hover:underline transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                          Otwórz plik w nowej karcie
                        </a>
                      </div>
                    </div>
                  </div>
                )}
                {!currentFileUrl && !file && (
                  <p className="mb-2 text-sm text-gray-500 italic">
                    Brak wgranego pliku. Wybierz plik poniżej, aby go wgrać.
                  </p>
                )}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#03adf0] file:text-white hover:file:bg-[#0288c7] file:cursor-pointer"
                  style={{ borderRadius: 0 }}
                  disabled={isSaving || uploadingFile}
                />
                {file && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Nowy plik do wgrania:
                    </p>
                    <p className="text-sm text-blue-700">{file.name}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                  className="w-5 h-5 text-[#03adf0] border-gray-300 rounded focus:ring-[#03adf0] focus:ring-2"
                  disabled={isSaving}
                />
                <label htmlFor="is_public" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Oznacz jako publiczny
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
                style={{ borderRadius: 0, cursor: isSaving ? 'not-allowed' : 'pointer' }}
              >
                Anuluj
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || uploadingFile || !formData.display_name.trim()}
                className="px-6 py-2 text-sm font-medium text-white bg-[#03adf0] border-2 border-[#03adf0] hover:bg-[#0288c7] transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: 0 }}
              >
                <Save className="w-4 h-4" />
                {isSaving || uploadingFile ? 'Zapisywanie...' : 'Zapisz'}
              </button>
            </div>
          </div>
        </div>

        <style jsx global>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out;
          }

          .animate-slideUp {
            animation: slideUp 0.4s ease-out;
          }
        `}</style>
      </AdminLayout>
    </SectionGuard>
  );
}

