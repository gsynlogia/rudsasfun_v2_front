'use client';

import { ArrowLeft, Users, Shield, FileText, UserX } from 'lucide-react';
import Link from 'next/link';

import AdminLayout from '@/components/admin/AdminLayout';

/**
 * Admin Panel - Settings Users Page
 * Route: /admin-panel/settings/users
 *
 * Kafelki: Użytkownicy klienci, Użytkownicy systemu, Logi, Użytkownicy bez rezerwacji
 */
export default function SettingsUsersPage() {
  return (
    <AdminLayout>
      <div className="w-full">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Link
            href="/admin-panel/settings"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
            style={{ cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Powrót do ustawień</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Użytkownicy</h1>
          <p className="text-gray-600 text-sm">Wybierz kategorię użytkowników do zarządzania</p>
        </div>

        {/* Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Clients Tile */}
          <Link
            href="/admin-panel/settings/users/clients"
            className="block bg-white shadow hover:shadow-lg transition-all duration-200 p-6 border-l-4 border-[#03adf0] group"
            style={{ borderRadius: 0, cursor: 'pointer' }}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 group-hover:bg-blue-100 transition-colors" style={{ borderRadius: 0 }}>
                <Users className="w-8 h-8 text-[#03adf0]" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-[#03adf0] transition-colors">
                  Użytkownicy klienci
                </h2>
                <p className="text-sm text-gray-600">
                  Zarządzaj kontami klientów systemu rezerwacji. Przeglądaj, edytuj grupy i usuwaj użytkowników.
                </p>
              </div>
            </div>
          </Link>

          {/* System Users Tile */}
          <Link
            href="/admin-panel/settings/users/admins"
            className="block bg-white shadow hover:shadow-lg transition-all duration-200 p-6 border-l-4 border-orange-500 group"
            style={{ borderRadius: 0, cursor: 'pointer' }}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-50 group-hover:bg-orange-100 transition-colors" style={{ borderRadius: 0 }}>
                <Shield className="w-8 h-8 text-orange-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-orange-500 transition-colors">
                  Użytkownicy systemu
                </h2>
                <p className="text-sm text-gray-600">
                  Zarządzaj kontami administratorów i operatorów systemu. Twórz, edytuj i usuwaj użytkowników z dostępem do panelu administracyjnego.
                </p>
              </div>
            </div>
          </Link>

          {/* Logi Tile */}
          <Link
            href="/admin-panel/settings/users/logi"
            className="block bg-white shadow hover:shadow-lg transition-all duration-200 p-6 border-l-4 border-emerald-600 group"
            style={{ borderRadius: 0, cursor: 'pointer' }}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-50 group-hover:bg-emerald-100 transition-colors" style={{ borderRadius: 0 }}>
                <FileText className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                  Logi
                </h2>
                <p className="text-sm text-gray-600">
                  Przeglądaj logi zdarzeń autoryzacyjnych (logowanie, rejestracja, Magic Link) z tabeli auth_logs.
                </p>
              </div>
            </div>
          </Link>

          {/* Użytkownicy bez rezerwacji Tile */}
          <Link
            href="/admin-panel/settings/users/uzytkownicy-bez-rezerwacji"
            className="block bg-white shadow hover:shadow-lg transition-all duration-200 p-6 border-l-4 border-amber-600 group"
            style={{ borderRadius: 0, cursor: 'pointer' }}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-50 group-hover:bg-amber-100 transition-colors" style={{ borderRadius: 0 }}>
                <UserX className="w-8 h-8 text-amber-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors">
                  Użytkownicy bez rezerwacji
                </h2>
                <p className="text-sm text-gray-600">
                  Klienci bez rezerwacji: z tokenem (prawdopodobnie nie dostali maila) lub bez tokenu (zalogowali się, nie złożyli rezerwacji).
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}