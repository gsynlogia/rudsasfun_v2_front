'use client';

import { ArrowRight, MessageSquare, Mail } from 'lucide-react';
import Link from 'next/link';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';

export default function WiadomosciPage() {
  return (
    <SectionGuard section="cms">
      <AdminLayout>
        <div className="container mx-auto p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Wiadomości</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/admin-panel/wiadomosci/sms"
              className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 border-2 border-gray-200 hover:border-[#03adf0] cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-12 h-12 text-[#03adf0] group-hover:text-[#0288c7] transition-colors" />
                  <h2 className="text-xl font-semibold text-gray-800 group-hover:text-[#03adf0] transition-colors">
                    Wiadomości SMS
                  </h2>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#03adf0] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-sm text-gray-600">
                Wysyłka SMS do opiekunów (wszyscy, indywidualnie, po turnusie), szablony i logi
              </p>
            </Link>

            <div className="group bg-white rounded-lg shadow-md p-6 border-2 border-gray-200 opacity-80 cursor-not-allowed">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-12 h-12 text-gray-400" />
                  <h2 className="text-xl font-semibold text-gray-500">
                    Wiadomości e-mail
                  </h2>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Moduł w przygotowaniu
              </p>
            </div>
          </div>
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}
