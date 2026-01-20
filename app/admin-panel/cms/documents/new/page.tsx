'use client';

import { ArrowLeft, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import { authenticatedApiCall } from '@/utils/api-auth';

/**
 * Document Create Page
 * Route: /admin-panel/cms/documents/new
 */
export default function DocumentNewPage() {
  const router = useRouter();

  // State for form data
  const [formData, setFormData] = useState({
    display_name: '',
    is_public: false,
  });

  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!formData.display_name.trim()) {
      setError('Nazwa dokumentu jest wymagana');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const formDataToSend = new FormData();
      formDataToSend.append('display_name', formData.display_name);
      formDataToSend.append('is_public', formData.is_public.toString());
      if (file) {
        formDataToSend.append('file', file);
      }

      await authenticatedApiCall('/api/documents/', {
        method: 'POST',
        body: formDataToSend,
      });

      router.push('/admin-panel/cms/documents');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas tworzenia dokumentu');
      console.error('Error creating document:', err);
    } finally {
      setIsSaving(false);
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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dodaj nowy dokument</h1>
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
                  placeholder="Np. Regulamin portalu"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plik (PDF, DOC, DOCX) - opcjonalnie
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#03adf0] file:text-white hover:file:bg-[#0288c7] file:cursor-pointer"
                  style={{ borderRadius: 0 }}
                  disabled={isSaving}
                />
                {file && (
                  <p className="mt-2 text-sm text-gray-600">Wybrany plik: {file.name}</p>
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
                disabled={isSaving || !formData.display_name.trim()}
                className="px-6 py-2 text-sm font-medium text-white bg-[#03adf0] border-2 border-[#03adf0] hover:bg-[#0288c7] transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: 0 }}
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Zapisywanie...' : 'Utwórz'}
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









