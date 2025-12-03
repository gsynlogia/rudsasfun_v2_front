'use client';

import { MapPin, User, Calendar, Home, Utensils, Gift, Users, Heart, FileText, Edit, Plus, Mail, Phone } from 'lucide-react';
import DashedLine from '../DashedLine';
import AdditionalServicesGrid from './AdditionalServicesGrid';

interface Reservation {
  id: string;
  participantName: string;
  status: string;
  age: string;
  gender: string;
  city: string;
  campName: string;
  dates: string;
  resort: string;
  parentsData?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneNumber: string;
    street: string;
    postalCode: string;
    city: string;
  }>;
}

interface ReservationMainProps {
  reservation: Reservation;
  isDetailsExpanded: boolean;
  onToggleDetails: () => void;
}

/**
 * ReservationMain Component
 * Left part of reservation card with main details
 */
export default function ReservationMain({ reservation, isDetailsExpanded, onToggleDetails }: ReservationMainProps) {

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
            {reservation.participantName}
          </h3>
          <span className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-green-50 text-green-700 text-[10px] sm:text-xs font-medium rounded-full w-fit">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full" />
            {reservation.status}
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <User className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{reservation.age}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <User className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{reservation.gender}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{reservation.city}</span>
          </div>
        </div>
      </div>

      {/* Parents/Guardians Section */}
      {reservation.parentsData && reservation.parentsData.length > 0 && (
        <>
          <DashedLine />
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
              Opiekunowie/Rodzice
            </h4>
            <div className="space-y-3 sm:space-y-4">
              {reservation.parentsData.map((parent, index) => (
                <div key={parent.id || index} className="bg-gray-50 rounded-lg p-2 sm:p-3">
                  <div className="text-xs sm:text-sm font-medium text-gray-900 mb-1 sm:mb-2">
                    {parent.firstName} {parent.lastName}
                  </div>
                  <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                    {parent.email && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>{parent.email}</span>
                      </div>
                    )}
                    {(parent.phoneNumber || parent.phone) && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>{parent.phone || '+48'} {parent.phoneNumber}</span>
                      </div>
                    )}
                    {parent.street && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>{parent.street}, {parent.postalCode} {parent.city}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <DashedLine />

      {/* Camp Details */}
      <div>
        <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
          {reservation.campName}
        </h4>
        <div className="text-xs sm:text-sm text-gray-600 space-y-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>Termin: {reservation.dates}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Home className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>{reservation.resort}</span>
          </div>
        </div>
      </div>

      <DashedLine />

      {/* Transport Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Transport to resort */}
        <div>
          <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
            Transport do ośrodka
          </h5>
          <div className="text-xs sm:text-sm text-gray-700 space-y-1">
            <div>Transport zbiorowy</div>
            <div>Warszawa</div>
            <div className="text-gray-600">
              Parking przy Stadion Narodowy, al. Zieleniecka 6
            </div>
            <a href="#" className="text-[#03adf0] underline hover:text-[#0288c7] text-[10px] sm:text-xs">
              zobacz na mapie &gt;
            </a>
            <div className="text-gray-600 mt-1 sm:mt-2">10.07.2023, 8:30</div>
            <button className="flex items-center gap-1 text-[#03adf0] text-[10px] sm:text-xs mt-1 hover:text-[#0288c7]">
              <Edit className="w-3 h-3" />
              edytuj
            </button>
          </div>
        </div>

        {/* Transport from resort */}
        <div>
          <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
            Transport z ośrodka
          </h5>
          <div className="text-xs sm:text-sm text-gray-700 space-y-1">
            <div>Transport własny</div>
            <button className="flex items-center gap-1 text-[#03adf0] text-[10px] sm:text-xs mt-1 hover:text-[#0288c7]">
              <Edit className="w-3 h-3" />
              edytuj
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Details Section */}
      {isDetailsExpanded && (
        <>
          <DashedLine />

          {/* Diet and Promotion */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Dieta</h5>
              <select className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]">
                <option>Standardowa (0,00zł)</option>
                <option>Wegetariańska (50,00zł)</option>
              </select>
            </div>
            <div>
              <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Promocja</h5>
              <div className="text-xs sm:text-sm text-gray-700">Rodzeństwo razem: -50zł</div>
            </div>
          </div>

          <DashedLine />

          {/* Accommodation, Health, Authorizations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Accommodation */}
            <div>
              <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Zakwaterowanie</h5>
              <p className="text-xs sm:text-sm text-gray-700 mb-1 sm:mb-2">
                Zakwaterowanie z Anną Nowak i Justyną Kowalską
              </p>
              <button className="flex items-center gap-1 text-[#03adf0] text-[10px] sm:text-xs hover:text-[#0288c7]">
                <Edit className="w-3 h-3" />
                edytuj
              </button>
            </div>

            {/* Health Status */}
            <div>
              <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Stan zdrowia</h5>
              <div className="text-xs sm:text-sm text-gray-700 space-y-0.5 sm:space-y-1">
                <div>Choroby przewlekłe: Nie</div>
                <div>Dysfunkcje: Nie</div>
                <div>Leczenie psychiatryczne: Nie</div>
                <div>Inne: choroba lokomocyjna</div>
              </div>
              <button className="flex items-center gap-1 text-[#03adf0] text-[10px] sm:text-xs mt-1 sm:mt-2 hover:text-[#0288c7]">
                <Plus className="w-3 h-3" />
                dodaj
              </button>
            </div>

            {/* Authorizations */}
            <div>
              <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Upoważnienia</h5>
              <div className="text-xs sm:text-sm text-gray-700 space-y-0.5 sm:space-y-1">
                <div>Henryk Kowalczyk</div>
                <div>Anna Kowalczyk</div>
              </div>
              <button className="flex items-center gap-1 text-[#03adf0] text-[10px] sm:text-xs mt-1 sm:mt-2 hover:text-[#0288c7]">
                <Edit className="w-3 h-3" />
                edytuj
              </button>
            </div>
          </div>

          <DashedLine />

          {/* Additional Services */}
          <div>
            <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3 sm:mb-4">Usługi dodatkowe</h5>
            <AdditionalServicesGrid />
          </div>

          <DashedLine />

          {/* Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Cost Summary */}
            <div>
              <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Podsumowanie</h5>
              <div className="text-xs sm:text-sm text-gray-700 space-y-0.5 sm:space-y-1">
                <div className="flex justify-between">
                  <span>Cena podstawowa:</span>
                  <span>2200,00zł</span>
                </div>
                <div className="flex justify-between">
                  <span>Dodatki:</span>
                  <span>150,00zł</span>
                </div>
                <div className="flex justify-between">
                  <span>Opłaty dodatkowe:</span>
                  <span>50,00zł</span>
                </div>
                <div className="flex justify-between">
                  <span>Promocje:</span>
                  <span>-50,00zł</span>
                </div>
                <div className="flex justify-between">
                  <span>Transport:</span>
                  <span>0,00zł</span>
                </div>
                <div className="flex justify-between">
                  <span>Zmiana transportu:</span>
                  <span>30,00zł</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Zwrot:</span>
                  <span>-30,00zł</span>
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div>
              <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Historia wpłat</h5>
              <div className="text-xs sm:text-sm text-gray-700 space-y-1 sm:space-y-2">
                <div>10.05.2023 — 500,00zł</div>
                <div>12.06.2023 — 850,00zł</div>
              </div>
            </div>

            {/* Total Cost and Actions */}
            <div>
              <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Koszt całkowity</h5>
              <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">2350,00zł</div>
              <div className="text-xs sm:text-sm text-gray-700 mb-1">
                Suma wpłat: <span className="font-semibold">1350,00zł</span>
              </div>
              <div className="text-xs sm:text-sm mb-3 sm:mb-4">
                Pozostało do zapłaty:{' '}
                <a href="#" className="text-[#03adf0] underline hover:text-[#0288c7] font-semibold">
                  1000,00zł
                </a>
              </div>
              <div className="flex flex-col gap-2">
                <button className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#03adf0] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#0288c7] transition-colors">
                  zapłać
                </button>
                <button className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-red-600 transition-colors">
                  anuluj rezerwację
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toggle Details Button */}
      <div className={`text-center ${isDetailsExpanded ? 'pt-3 sm:pt-4' : ''}`}>
        <button 
          onClick={onToggleDetails}
          className="text-xs sm:text-sm text-[#03adf0] hover:text-[#0288c7] flex items-center gap-1 mx-auto transition-colors"
        >
          {isDetailsExpanded ? 'ukryj szczegóły' : 'pokaż szczegóły'}
          <svg 
            className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${isDetailsExpanded ? '' : 'rotate-180'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

