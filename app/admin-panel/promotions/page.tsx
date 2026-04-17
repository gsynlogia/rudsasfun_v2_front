'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';

export default function PromotionsPage() {
  return (
    <SectionGuard section="promotions">
      <AdminLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Zarządzanie promocjami</h1>

          {/* Nowy system — wyróżniony */}
          <Link
            href="/admin-panel/promotions/v2"
            className="block mb-8 p-6 bg-gradient-to-br from-[#00adee]/5 to-green-50 rounded-xl shadow-sm border-2 border-[#00adee] hover:shadow-lg transition-all group relative overflow-hidden"
          >
            <div className="absolute top-3 right-3 px-3 py-1 bg-[#00adee] text-white text-xs font-bold rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> NOWY
            </div>
            <h2 className="text-xl font-semibold mb-2 text-[#00adee]">Promocje i Rabaty — nowy system</h2>
            <p className="text-gray-700 mb-2">
              Zarządzaj <strong>promocjami standardowymi</strong> (Rodzeństwo razem, Obozy na maxa, Duża rodzina) oraz
              <strong> kodami rabatowymi</strong> (obniżające cenę, bony, atrakcje, gadżety) z pełną kontrolą:
              daty ważności, targetowanie do ośrodków/turnusów/emaili, relacja z promocjami (łączy / nie łączy / obniża o 50%).
            </p>
            <p className="text-sm text-gray-500 italic">
              Snapshot ceny przy zakupie — zmiana kwoty przez admina nie rusza historycznych rezerwacji.
            </p>
          </Link>

          {/* Stare kafelki — legacy */}
          <h2 className="text-base font-semibold text-gray-500 mb-3">Stary system (archiwalny)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/admin-panel/promotions/general"
              className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow opacity-80"
            >
              <h3 className="text-lg font-semibold mb-2 text-gray-700">Promocje ogólne (legacy)</h3>
              <p className="text-gray-600 text-sm">
                Zarządzaj promocjami ogólnymi ze starego systemu. Tylko dla obsługi rezerwacji sprzed wdrożenia nowego.
              </p>
            </Link>

            <Link
              href="/admin-panel/promotions/center"
              className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow opacity-80"
            >
              <h3 className="text-lg font-semibold mb-2 text-gray-700">Promocje ośrodkowe (legacy)</h3>
              <p className="text-gray-600 text-sm">
                Zarządzaj promocjami specyficznymi dla konkretnych ośrodków/turnusów ze starego systemu.
              </p>
            </Link>
          </div>
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}
