'use client';

import { FileText, Download, Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import DashedLine from '../DashedLine';

interface ReservationSidebarProps {
  reservationId: string;
  isDetailsExpanded: boolean;
}

/**
 * ReservationSidebar Component
 * Right sidebar showing reservation progress and document status
 */
export default function ReservationSidebar({ reservationId, isDetailsExpanded }: ReservationSidebarProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">
          Postęp rezerwacji
        </h3>
        <p className="text-[10px] sm:text-xs text-gray-500">Zaliczka</p>
      </div>

      {/* Document Cards */}
      <div className="space-y-3 sm:space-y-4">
        {/* Agreement Card */}
        <div>
          <p className="text-[10px] sm:text-xs font-medium text-gray-700 mb-1 sm:mb-2">Umowa</p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 bg-white relative">
            <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-400 rounded-full" />
            </div>
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              <p className="text-[10px] sm:text-xs text-gray-600 text-center">W trakcie weryfikacji</p>
              <div className="flex gap-1.5 sm:gap-2 w-full">
                <button className="flex-1 px-1.5 sm:px-2 py-1 sm:py-1.5 border border-gray-300 text-[10px] sm:text-xs rounded hover:bg-gray-50">
                  pobierz
                </button>
                <button className="flex-1 px-1.5 sm:px-2 py-1 sm:py-1.5 border border-gray-300 text-[10px] sm:text-xs rounded hover:bg-gray-50">
                  dodaj
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Qualification Card */}
        <div>
          <p className="text-[10px] sm:text-xs font-medium text-gray-700 mb-1 sm:mb-2">Karta kwalifikacyjna</p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 bg-white relative">
            <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full" />
            </div>
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              <p className="text-[10px] sm:text-xs text-gray-600 text-center">Brak</p>
              <div className="flex gap-1.5 sm:gap-2 w-full">
                <button className="flex-1 px-1.5 sm:px-2 py-1 sm:py-1.5 border border-gray-300 text-[10px] sm:text-xs rounded hover:bg-gray-50">
                  pobierz
                </button>
                <button className="flex-1 px-1.5 sm:px-2 py-1 sm:py-1.5 border border-gray-300 text-[10px] sm:text-xs rounded hover:bg-gray-50">
                  dodaj
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Section - Everything after Qualification Card */}
      {isDetailsExpanded && (
        <>
          <DashedLine />

          {/* Full Payment Status */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-gray-700">Pełna wpłata</span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-1.5 sm:space-y-2">
            <button className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-[#03adf0] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#0288c7] transition-colors">
              faktury vat
            </button>
            <button className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-[#03adf0] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#0288c7] transition-colors">
              zaświadczenia
            </button>
          </div>

          <DashedLine />

          {/* File History */}
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Historia plików</h4>
            <div className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs text-gray-600">
              <div>
                <div className="font-medium">11.05.2023, 13:35</div>
                <div>Karta kwalifikacyjna (wgranie)</div>
              </div>
              <div>
                <div className="font-medium">10.05.2023, 07:15</div>
                <div>Umowa (wgranie)</div>
              </div>
            </div>
            <a href="#" className="text-[#03adf0] text-[10px] sm:text-xs underline hover:text-[#0288c7] mt-1 sm:mt-2 inline-block">
              pełna historia &gt;
            </a>
          </div>
        </>
      )}
    </div>
  );
}

