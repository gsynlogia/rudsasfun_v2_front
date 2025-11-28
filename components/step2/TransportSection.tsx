'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Download, FileText, MapPin } from 'lucide-react';
import { loadStep2FormData, saveStep2FormData } from '@/utils/sessionStorage';

/**
 * TransportSection Component
 * Displays transport warning and form with departure/return options
 */
export default function TransportSection() {
  const [transportData, setTransportData] = useState({
    departureType: '',
    departureCity: '',
    returnType: '',
    returnCity: '',
  });

  const cities = [
    { value: '', label: 'Wybierz miasto' },
    { value: 'warszawa', label: 'Warszawa' },
    { value: 'krakow', label: 'Kraków' },
    { value: 'gdansk', label: 'Gdańsk' },
    { value: 'wroclaw', label: 'Wrocław' },
    { value: 'poznan', label: 'Poznań' },
  ];

  // Load data from sessionStorage on mount
  useEffect(() => {
    const savedData = loadStep2FormData();
    if (savedData && savedData.transportData) {
      setTransportData(savedData.transportData);
    }
  }, []);

  // Save to sessionStorage whenever transport data changes
  useEffect(() => {
    const savedData = loadStep2FormData();
    const formData = {
      ...savedData,
      transportData,
    };
    saveStep2FormData(formData as any);
  }, [transportData]);

  const updateField = (field: keyof typeof transportData, value: string) => {
    setTransportData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
        Transport
      </h2>
      <section className="bg-white p-4 sm:p-6">
        {/* Warning block */}
        <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-red-50 rounded-lg mb-4 sm:mb-6">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs sm:text-sm font-bold text-red-600 mb-1">
              Uwaga!
            </p>
            <p className="text-xs sm:text-sm text-gray-700 mb-2">
              Przed wypełnieniem tego formularza sprawdź informacje transportowe.
            </p>
            <p className="text-xs sm:text-sm text-red-600">
              Przy zmianie po 30 dniach obowiązuje dopłata 30 zł.
            </p>
          </div>
        </div>

        {/* Regulation buttons */}
        <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6">
          <button className="flex items-center gap-2 px-4 sm:px-6 py-2 border-2 border-[#03adf0] text-[#03adf0] hover:bg-[#03adf0] hover:text-white transition-colors text-xs sm:text-sm font-medium">
            <Download className="w-4 h-4" />
            Regulamin transportu
          </button>
          <button className="flex items-center gap-2 px-4 sm:px-6 py-2 border-2 border-[#03adf0] text-[#03adf0] hover:bg-[#03adf0] hover:text-white transition-colors text-xs sm:text-sm font-medium">
            <FileText className="w-4 h-4" />
            Lista transportów
          </button>
        </div>

        {/* Transport form */}
        <div className="space-y-4 sm:space-y-6">
          {/* Departure */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Wybierz sposób dojazdu na obóz/kolonię
            </label>
            <div className="relative">
              <select
                value={transportData.departureType}
                onChange={(e) => updateField('departureType', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] pr-8 sm:pr-10"
              >
                <option value="">Wybierz sposób</option>
                <option value="zbiorowy">Transport zbiorowy</option>
                <option value="wlasny">Transport własny</option>
              </select>
              <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Wybierz miasto zbiórki/wyjazdu na obóz/kolonię
            </label>
            <div className="relative">
              <select
                value={transportData.departureCity}
                onChange={(e) => updateField('departureCity', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] pr-8 sm:pr-10"
              >
                {cities.map((city) => (
                  <option key={city.value} value={city.value}>
                    {city.label}
                  </option>
                ))}
              </select>
              <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
            </div>
          </div>

          {/* Return */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Wybierz sposób powrotu z obozu/kolonii
            </label>
            <div className="relative">
              <select
                value={transportData.returnType}
                onChange={(e) => updateField('returnType', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] pr-8 sm:pr-10"
              >
                <option value="">Wybierz sposób</option>
                <option value="zbiorowy">Transport zbiorowy</option>
                <option value="wlasny">Transport własny</option>
              </select>
              <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Wybierz miasto powrotu/odbioru dziecka z obozu/kolonii
            </label>
            <div className="relative">
              <select
                value={transportData.returnCity}
                onChange={(e) => updateField('returnCity', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] pr-8 sm:pr-10"
              >
                {cities.map((city) => (
                  <option key={city.value} value={city.value}>
                    {city.label}
                  </option>
                ))}
              </select>
              <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

