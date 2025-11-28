'use client';

import { useState, useEffect } from 'react';
import { loadStep2FormData, saveStep2FormData } from '@/utils/sessionStorage';

/**
 * SourceSection Component
 * Displays checkbox options for "Skąd dowiedziałeś się o Radsas Fun?"
 */
export default function SourceSection() {
  const [sources, setSources] = useState({
    kolejna: false,
    znajomi: false,
    internet: false,
    wycieczka: false,
    inne: false,
  });
  const [inneText, setInneText] = useState('');

  // Load data from sessionStorage on mount
  useEffect(() => {
    const savedData = loadStep2FormData();
    if (savedData) {
      if (savedData.sources) {
        setSources(savedData.sources);
      }
      if (savedData.inneText) {
        setInneText(savedData.inneText);
      }
    }
  }, []);

  // Save to sessionStorage whenever sources or inneText changes
  useEffect(() => {
    const savedData = loadStep2FormData();
    const formData = {
      ...savedData,
      sources,
      inneText,
    };
    saveStep2FormData(formData as any);
  }, [sources, inneText]);

  const updateSource = (key: keyof typeof sources, value: boolean) => {
    setSources((prev) => ({ ...prev, [key]: value }));
    if (key === 'inne' && !value) {
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
              type="checkbox"
              checked={sources.kolejna}
              onChange={(e) => updateSource('kolejna', e.target.checked)}
              className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 rounded"
            />
            <span className="text-xs sm:text-sm text-gray-700">
              To moja kolejna impreza z Radsas Fun
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sources.znajomi}
              onChange={(e) => updateSource('znajomi', e.target.checked)}
              className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 rounded"
            />
            <span className="text-xs sm:text-sm text-gray-700">
              Od znajomych
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sources.internet}
              onChange={(e) => updateSource('internet', e.target.checked)}
              className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 rounded"
            />
            <span className="text-xs sm:text-sm text-gray-700">
              Z Internetu
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sources.wycieczka}
              onChange={(e) => updateSource('wycieczka', e.target.checked)}
              className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 rounded"
            />
            <span className="text-xs sm:text-sm text-gray-700">
              Byłem na wycieczce szkolnej z Radsas Fun
            </span>
          </label>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sources.inne}
                onChange={(e) => updateSource('inne', e.target.checked)}
                className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 rounded"
              />
              <span className="text-xs sm:text-sm text-gray-700">
                Inne – jakie?
              </span>
            </label>
            {sources.inne && (
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

