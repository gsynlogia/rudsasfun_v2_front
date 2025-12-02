'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { loadStep2FormData, saveStep2FormData } from '@/utils/sessionStorage';

/**
 * SourceSection Component
 * Displays radio button options for "Skąd dowiedziałeś się o Radsas Fun?" (single choice)
 */
export default function SourceSection() {
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [inneText, setInneText] = useState('');
  const [sourceError, setSourceError] = useState<string>('');
  const validationAttemptedRef = useRef(false);

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

  // Validate source field
  const validateSource = useCallback((): boolean => {
    if (!selectedSource || selectedSource.trim() === '') {
      setSourceError('Pole obowiązkowe');
      return false;
    }
    // If "inne" is selected, inneText must also be filled
    if (selectedSource === 'inne' && (!inneText || inneText.trim() === '')) {
      setSourceError('Pole obowiązkowe');
      return false;
    }
    setSourceError('');
    return true;
  }, [selectedSource, inneText]);

  // Expose validation function for external use (e.g., Step2 validation)
  useEffect(() => {
    (window as any).validateSourceSection = () => {
      validationAttemptedRef.current = true;
      return validateSource();
    };

    return () => {
      delete (window as any).validateSourceSection;
    };
  }, [validateSource]);

  const handleSourceChange = (value: string) => {
    setSelectedSource(value);
    if (value !== 'inne') {
      setInneText('');
    }
    // Clear error when user starts selecting
    if (sourceError) {
      setSourceError('');
    }
  };

  const handleInneTextChange = (value: string) => {
    setInneText(value);
    // Clear error when user starts typing
    if (sourceError && value.trim() !== '') {
      setSourceError('');
    }
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
        Skąd dowiedziałeś się o Radsas Fun? <span className="text-red-600">*</span>
      </h2>
      <section className={`bg-white p-4 sm:p-6 ${sourceError ? 'border-2 border-red-500 rounded-lg' : ''}`}>
        <div className="space-y-3 sm:space-y-4">
          <label className={`flex items-center gap-2 cursor-pointer p-2 rounded ${sourceError && !selectedSource ? 'bg-red-50' : ''}`}>
            <input
              type="radio"
              name="source"
              value="kolejna"
              checked={selectedSource === 'kolejna'}
              onChange={(e) => handleSourceChange(e.target.value)}
              className={`w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] ${
                sourceError && !selectedSource ? 'border-red-500' : 'border-gray-400'
              }`}
            />
            <span className="text-xs sm:text-sm text-gray-700">
              To moja kolejna impreza z Radsas Fun
            </span>
          </label>

          <label className={`flex items-center gap-2 cursor-pointer p-2 rounded ${sourceError && !selectedSource ? 'bg-red-50' : ''}`}>
            <input
              type="radio"
              name="source"
              value="znajomi"
              checked={selectedSource === 'znajomi'}
              onChange={(e) => handleSourceChange(e.target.value)}
              className={`w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] ${
                sourceError && !selectedSource ? 'border-red-500' : 'border-gray-400'
              }`}
            />
            <span className="text-xs sm:text-sm text-gray-700">
              Od znajomych
            </span>
          </label>

          <label className={`flex items-center gap-2 cursor-pointer p-2 rounded ${sourceError && !selectedSource ? 'bg-red-50' : ''}`}>
            <input
              type="radio"
              name="source"
              value="internet"
              checked={selectedSource === 'internet'}
              onChange={(e) => handleSourceChange(e.target.value)}
              className={`w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] ${
                sourceError && !selectedSource ? 'border-red-500' : 'border-gray-400'
              }`}
            />
            <span className="text-xs sm:text-sm text-gray-700">
              Z Internetu
            </span>
          </label>

          <label className={`flex items-center gap-2 cursor-pointer p-2 rounded ${sourceError && !selectedSource ? 'bg-red-50' : ''}`}>
            <input
              type="radio"
              name="source"
              value="wycieczka"
              checked={selectedSource === 'wycieczka'}
              onChange={(e) => handleSourceChange(e.target.value)}
              className={`w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] ${
                sourceError && !selectedSource ? 'border-red-500' : 'border-gray-400'
              }`}
            />
            <span className="text-xs sm:text-sm text-gray-700">
              Byłem na wycieczce szkolnej z Radsas Fun
            </span>
          </label>

          <div>
            <label className={`flex items-center gap-2 cursor-pointer p-2 rounded ${sourceError && !selectedSource ? 'bg-red-50' : ''}`}>
              <input
                type="radio"
                name="source"
                value="inne"
                checked={selectedSource === 'inne'}
                onChange={(e) => handleSourceChange(e.target.value)}
                className={`w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] ${
                  sourceError && !selectedSource ? 'border-red-500' : 'border-gray-400'
                }`}
              />
              <span className="text-xs sm:text-sm text-gray-700">
                Inne – jakie?
              </span>
            </label>
            {selectedSource === 'inne' && (
              <div>
                <input
                  type="text"
                  value={inneText}
                  onChange={(e) => handleInneTextChange(e.target.value)}
                  placeholder="Wpisz źródło..."
                  className={`mt-2 w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${
                    sourceError && selectedSource === 'inne' && !inneText ? 'border-red-500' : 'border-gray-400'
                  }`}
                />
                {sourceError && selectedSource === 'inne' && (
                  <p className="text-xs text-red-500 mt-1">{sourceError}</p>
                )}
              </div>
            )}
          </div>
          {sourceError && selectedSource !== 'inne' && (
            <p className="text-xs text-red-500 mt-1">{sourceError}</p>
          )}
        </div>
      </section>
    </div>
  );
}

