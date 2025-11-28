'use client';

import { useState, useEffect } from 'react';
import { loadStep2FormData, saveStep2FormData } from '@/utils/sessionStorage';

/**
 * SourceSection Component
 * Displays radio button options for "Skąd dowiedziałeś się o Radsas Fun?" (single choice)
 */
export default function SourceSection() {
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [inneText, setInneText] = useState('');

  // Load data from sessionStorage on mount
  useEffect(() => {
    const savedData = loadStep2FormData();
    if (savedData) {
      if (savedData.selectedSource) {
        setSelectedSource(savedData.selectedSource);
      }
      if (savedData.inneText) {
        setInneText(savedData.inneText);
      }
    }
  }, []);

  // Save to sessionStorage whenever selectedSource or inneText changes
  useEffect(() => {
    const savedData = loadStep2FormData();
    const formData = {
      selectedAddons: savedData?.selectedAddons || [],
      selectedProtection: savedData?.selectedProtection || '',
      selectedPromotion: savedData?.selectedPromotion || '',
      transportData: savedData?.transportData || {
        departureType: '',
        departureCity: '',
        returnType: '',
        returnCity: '',
      },
      selectedSource,
      inneText,
    };
    saveStep2FormData(formData);
  }, [selectedSource, inneText]);

  const handleSourceChange = (value: string) => {
    setSelectedSource(value);
    if (value !== 'inne') {
      setInneText('');
    }
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
        Skąd dowiedziałeś się o Radsas Fun? <span className="text-red-600">*</span>
      </h2>
      <section className="bg-white p-4 sm:p-6">
        <div className="space-y-3 sm:space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="source"
              value="kolejna"
              checked={selectedSource === 'kolejna'}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400"
            />
            <span className="text-xs sm:text-sm text-gray-700">
              To moja kolejna impreza z Radsas Fun
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="source"
              value="znajomi"
              checked={selectedSource === 'znajomi'}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400"
            />
            <span className="text-xs sm:text-sm text-gray-700">
              Od znajomych
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="source"
              value="internet"
              checked={selectedSource === 'internet'}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400"
            />
            <span className="text-xs sm:text-sm text-gray-700">
              Z Internetu
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="source"
              value="wycieczka"
              checked={selectedSource === 'wycieczka'}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400"
            />
            <span className="text-xs sm:text-sm text-gray-700">
              Byłem na wycieczce szkolnej z Radsas Fun
            </span>
          </label>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="source"
                value="inne"
                checked={selectedSource === 'inne'}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400"
              />
              <span className="text-xs sm:text-sm text-gray-700">
                Inne – jakie?
              </span>
            </label>
            {selectedSource === 'inne' && (
              <input
                type="text"
                value={inneText}
                onChange={(e) => setInneText(e.target.value)}
                placeholder="Wpisz źródło..."
                className="mt-2 w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

