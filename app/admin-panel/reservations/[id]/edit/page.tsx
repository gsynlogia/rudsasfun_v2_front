'use client';

import { ArrowLeft, Save, X } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';


/**
 * Reservation Edit Page
 * Route: /admin-panel/reservations/[id]/edit
 *
 * Edit reservation details - hardcoded data for now
 */
export default function ReservationEditPage() {
  const router = useRouter();
  const params = useParams();
  const reservationId = params.id as string;

  // State for form data
  const [formData, setFormData] = useState({
    reservationName: '',
    participantName: '',
    email: '',
    campName: '',
    tripName: '',
    status: 'aktywna',
  });

  const [isLoading, setIsLoading] = useState(true);

  // Load reservation data (hardcoded for now)
  useEffect(() => {
    // Simulate loading reservation data
    // In real implementation, this would fetch from API
    setTimeout(() => {
      // Generate sample data based on ID
      const id = parseInt(reservationId) || 1;
      setFormData({
        reservationName: `REZ-2024-${String(id).padStart(3, '0')}`,
        participantName: 'Jan Kowalski',
        email: 'jan.kowalski@example.com',
        campName: 'Laserowy Paintball',
        tripName: 'Lato 2024 - Wiele',
        status: 'aktywna',
      });
      setIsLoading(false);
    }, 300);
  }, [reservationId]);

  const handleSave = () => {
    // TODO: Implement actual save when backend is ready
    console.log('Save reservation:', formData);
    router.push('/admin-panel/reservations');
  };

  const handleCancel = () => {
    router.push('/admin-panel/reservations');
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Ładowanie...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Edytuj rezerwację</h1>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-slideUp">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nazwa rezerwacji
              </label>
              <input
                type="text"
                value={formData.reservationName}
                onChange={(e) => setFormData({ ...formData, reservationName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                style={{ borderRadius: 0 }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Uczestnik
              </label>
              <input
                type="text"
                value={formData.participantName}
                onChange={(e) => setFormData({ ...formData, participantName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                style={{ borderRadius: 0 }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                style={{ borderRadius: 0 }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Obóz
                </label>
                <input
                  type="text"
                  value={formData.campName}
                  onChange={(e) => setFormData({ ...formData, campName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                  style={{ borderRadius: 0 }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wycieczka
                </label>
                <input
                  type="text"
                  value={formData.tripName}
                  onChange={(e) => setFormData({ ...formData, tripName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                  style={{ borderRadius: 0 }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                style={{ borderRadius: 0 }}
              >
                <option value="aktywna">Aktywna</option>
                <option value="zakończona">Zakończona</option>
                <option value="anulowana">Anulowana</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleCancel}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 transition-all duration-200"
              style={{ borderRadius: 0, cursor: 'pointer' }}
            >
              Anuluj
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-sm font-medium text-white bg-[#03adf0] border-2 border-[#03adf0] hover:bg-[#0288c7] transition-all duration-200 flex items-center gap-2"
              style={{ borderRadius: 0, cursor: 'pointer' }}
            >
              <Save className="w-4 h-4" />
              Zapisz
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
  );
}

