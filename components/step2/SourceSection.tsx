'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

import { API_BASE_URL } from '@/utils/api-config';
import { loadStep2FormData, saveStep2FormData } from '@/utils/sessionStorage';

interface Source {
  id: number;
  name: string;
  display_order: number;
  is_active: boolean;
  is_other: boolean;
}

/**
 * SourceSection Component
 * Displays radio button options for "Skąd dowiedziałeś się o Radsas Fun?" (single choice)
 * Fetches sources from API
 */
export default function SourceSection() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [inneText, setInneText] = useState('');
  const [sourceError, setSourceError] = useState<string>('');
  const validationAttemptedRef = useRef(false);

  // Fetch sources from API
  useEffect(() => {
    const fetchSources = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/sources/public`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSources(data.sources || []);
      } catch (err) {
        console.error('[SourceSection] Error fetching sources:', err);
        // Fallback to empty array if API fails
        setSources([]);
        // Show user-friendly message if backend unavailable
        if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('Failed to fetch'))) {
          // Backend unavailable - sources will be empty, user can still proceed
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSources();
  }, []);

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
      selectedDiets: savedData?.selectedDiets || [],
      selectedProtection: Array.isArray(savedData?.selectedProtection)
        ? savedData.selectedProtection
        : (savedData?.selectedProtection ? [savedData.selectedProtection] : []),
      selectedPromotion: savedData?.selectedPromotion || '',
      promotionJustification: savedData?.promotionJustification || {}, // Preserve promotion justification
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
    // If source with is_other=true is selected, inneText must also be filled
    const selectedSourceObj = sources.find(s => s.id.toString() === selectedSource);
    if (selectedSourceObj?.is_other && (!inneText || inneText.trim() === '')) {
      setSourceError('Pole obowiązkowe');
      return false;
    }
    setSourceError('');
    return true;
  }, [selectedSource, inneText, sources]);

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
    // Clear inneText if selected source is not "other" type
    const selectedSourceObj = sources.find(s => s.id.toString() === value);
    if (!selectedSourceObj?.is_other) {
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

  // Filter active sources and sort by display_order
  const activeSources = sources
    .filter(source => source.is_active)
    .sort((a, b) => a.display_order - b.display_order);

  if (loading) {
    return (
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
          Skąd dowiedziałeś się o Radsas Fun? <span className="text-red-600">*</span>
        </h2>
        <section className="bg-white p-4 sm:p-6">
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
            <p className="ml-3 text-gray-600">Ładowanie źródeł...</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
        Skąd dowiedziałeś się o Radsas Fun? <span className="text-red-600">*</span>
      </h2>
      <section className={`bg-white p-4 sm:p-6 ${sourceError ? 'border-2 border-red-500 rounded-lg' : ''}`}>
        <div className="space-y-3 sm:space-y-4">
          {activeSources.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-500">
              Brak dostępnych źródeł informacji.
            </p>
          ) : (
            activeSources.map((source) => {
              const isSelected = selectedSource === source.id.toString();
              const isOther = source.is_other;

              return (
                <div key={source.id}>
                  <label className={`flex items-center gap-2 cursor-pointer p-2 rounded ${sourceError && !selectedSource ? 'bg-red-50' : ''}`}>
                    <input
                      type="radio"
                      name="source"
                      value={source.id.toString()}
                      checked={isSelected}
                      onChange={(e) => handleSourceChange(e.target.value)}
                      className={`w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] ${
                        sourceError && !selectedSource ? 'border-red-500' : 'border-gray-400'
                      }`}
                    />
                    <span className="text-xs sm:text-sm text-gray-700">
                      {source.name}
                    </span>
                  </label>
                  {isSelected && isOther && (
                    <div>
                      <input
                        type="text"
                        value={inneText}
                        onChange={(e) => handleInneTextChange(e.target.value)}
                        placeholder="Wpisz źródło..."
                        className={`mt-2 w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${
                          sourceError && isSelected && !inneText ? 'border-red-500' : 'border-gray-400'
                        }`}
                      />
                      {sourceError && isSelected && !inneText && (
                        <p className="text-xs text-red-500 mt-1">{sourceError}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {sourceError && selectedSource && !activeSources.find(s => s.id.toString() === selectedSource)?.is_other && (
            <p className="text-xs text-red-500 mt-1">{sourceError}</p>
          )}
        </div>
      </section>
    </div>
  );
}