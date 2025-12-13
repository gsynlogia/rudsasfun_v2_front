'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';

export default function CMSPage() {
  return (
    <SectionGuard section="cms">
      <AdminLayout>
        <div className="container mx-auto p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">CMS - Content Management System</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Managing the information fields box */}
            <Link
              href="/admin-panel/cms/source"
              className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 border-2 border-gray-200 hover:border-[#03adf0] cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#03adf0] group-hover:text-[#0288c7] transition-colors">
                    <path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>
                    <path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"/>
                    <path d="M8 6v8"/>
                  </svg>
                  <h2 className="text-xl font-semibold text-gray-800 group-hover:text-[#03adf0] transition-colors">
                    Zarządzanie polami informacyjnymi
                  </h2>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#03adf0] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-sm text-gray-600">
                Zarządzaj źródłami informacji wyświetlanymi w formularzu rezerwacji (Step 2)
              </p>
            </Link>

            {/* Additions management box */}
            <Link
              href="/admin-panel/cms/additions"
              className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 border-2 border-gray-200 hover:border-[#03adf0] cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#03adf0] group-hover:text-[#0288c7] transition-colors">
                    <path d="M12 10v6"/>
                    <path d="M9 13h6"/>
                    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
                  </svg>
                  <h2 className="text-xl font-semibold text-gray-800 group-hover:text-[#03adf0] transition-colors">
                    Dodatki
                  </h2>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#03adf0] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-sm text-gray-600">
                Zarządzaj opisem dodatków wyświetlanym w formularzu rezerwacji (Step 2)
              </p>
            </Link>

            {/* Documents management box */}
            <Link
              href="/admin-panel/cms/documents"
              className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 border-2 border-gray-200 hover:border-[#03adf0] cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* File Text SVG icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#03adf0] group-hover:text-[#0288c7] transition-colors">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" x2="8" y1="13" y2="13"/>
                    <line x1="16" x2="8" y1="17" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                  <h2 className="text-xl font-semibold text-gray-800 group-hover:text-[#03adf0] transition-colors">
                    Dokumenty
                  </h2>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#03adf0] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-sm text-gray-600">
                Zarządzaj dokumentami systemu
              </p>
            </Link>

            {/* Blink Configuration box */}
            <Link
              href="/admin-panel/cms/configuration-blink"
              className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 border-2 border-gray-200 hover:border-[#03adf0] cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* Settings/Configuration SVG icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#03adf0] group-hover:text-[#0288c7] transition-colors">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73 1.73l-.22.38a2 2 0 0 0 1.23 2.73l.15.08a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-1.23 2.72l.22.38a2 2 0 0 0 2.73 1.74l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-1.74l.22-.39a2 2 0 0 0-1.23-2.72l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 1.23-2.73l-.22-.38a2 2 0 0 0-2.73-1.74l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <h2 className="text-xl font-semibold text-gray-800 group-hover:text-[#03adf0] transition-colors">
                    Konfiguracja Blink
                  </h2>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#03adf0] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-sm text-gray-600">
                Skonfiguruj numer telefonu, na który mają być przekazywane pliki
              </p>
            </Link>
          </div>
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}

