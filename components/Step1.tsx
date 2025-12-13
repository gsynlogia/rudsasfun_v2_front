'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';


import { useReservation } from '@/context/ReservationContext';
import type { StepComponentProps } from '@/types/reservation';
import { saveStep1FormData, loadStep1FormData, type Step1FormData } from '@/utils/sessionStorage';

import DashedLine from './DashedLine';
import DietSection from './step1/DietSection';

interface ParentData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneNumber: string;
  street: string;
  postalCode: string;
  city: string;
}

/**
 * Step1 Component - Personal Data
 * Contains: Parent/Guardian data, Participant data, Diet, Accommodation request, Health status
 */
export default function Step1({ onNext: _onNext, onPrevious: _onPrevious, disabled = false }: StepComponentProps) {
  const { addReservationItem: _addReservationItem, removeReservationItemsByType: _removeReservationItemsByType, reservation } = useReservation();
  const pathname = usePathname();

  // Calculate available birth years based on camp start date
  // Age must be 7-17 years old on camp start date
  // Logic: if camp starts on July 1, 2025:
  // - Age 7: born between July 2, 2017 and July 1, 2018 (rocznik 2017 or 2018)
  // - Age 17: born between July 2, 2007 and July 1, 2008 (rocznik 2007 or 2008)
  // To include all valid cases, we use: (startYear - 17) to (startYear - 7)
  // But we need to account for edge cases where birthday hasn't passed yet
  const getAvailableBirthYears = (): number[] => {
    const birthYears: number[] = [];

    // Interface for camp properties with default values
    interface CampProperties {
      start_date: string;
      end_date: string;
      period: string;
      city: string;
    }

    interface CampData {
      properties: CampProperties;
    }

    const defaultProperties: CampProperties = {
      start_date: '',
      end_date: '',
      period: '',
      city: '',
    };

    const defaultCamp: CampData = {
      properties: defaultProperties,
    };

    const campData: CampData = reservation.camp || defaultCamp;
    const startDateStr = campData.properties.start_date;

    if (!startDateStr) {
      // If no camp data, return empty array (will show placeholder)
      return [];
    }

    try {
      const startDate = new Date(startDateStr);
      const startYear = startDate.getFullYear();

      // Calculate birth years for ages 7-17 on camp start date
      // For age 7: person born in (startYear - 7) or (startYear - 8) depending on exact birthday
      // For age 17: person born in (startYear - 17) or (startYear - 18) depending on exact birthday
      // To include all valid cases, we use range: (startYear - 17) to (startYear - 7)
      // This ensures that anyone born in these years will be 7-17 years old on the camp start date
      // (accounting for birthday edge cases)

      const minBirthYear = startYear - 17; // Oldest participant (17 years old)
      const maxBirthYear = startYear - 7;  // Youngest participant (7 years old)

      // Generate birth years from youngest to oldest (most recent first)
      for (let year = maxBirthYear; year >= minBirthYear; year--) {
        birthYears.push(year);
      }

      return birthYears;
    } catch (error) {
      console.error('Error calculating birth years:', error);
      return [];
    }
  };

  const availableBirthYears = getAvailableBirthYears();

  const [parents, setParents] = useState<ParentData[]>([
    {
      id: '1',
      firstName: '',
      lastName: '',
      email: '',
      phone: '+48',
      phoneNumber: '',
      street: '',
      postalCode: '',
      city: '',
    },
  ]);

  // Validation errors for parent fields
  const [parentErrors, setParentErrors] = useState<Record<string, Record<string, string>>>({});
  // Validation errors for participant fields
  const [participantErrors, setParticipantErrors] = useState<Record<string, string>>({});
  const validationAttemptedRef = useRef(false);
  // Flag to prevent saving empty data before loading from sessionStorage
  const isDataLoadedRef = useRef(false);

  const addParent = () => {
    if (parents.length >= 2) return;

    const newParent: ParentData = {
      id: Date.now().toString(),
      firstName: '',
      lastName: '',
      email: '',
      phone: '+48',
      phoneNumber: '',
      street: '',
      postalCode: '',
      city: '',
    };
    setParents([...parents, newParent]);
  };

  const removeParent = (id: string) => {
    if (parents.length > 1) {
      setParents(parents.filter((p) => p.id !== id));
      // Remove errors for deleted parent
      setParentErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };

  // Update parent and clear errors for that field
  const updateParent = (id: string, field: keyof ParentData, value: string) => {
    setParents(
      parents.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );

    // Clear error for this field when user starts typing
    if (validationAttemptedRef.current && parentErrors[id] && parentErrors[id][field]) {
      setParentErrors((prev) => {
        const newErrors = { ...prev };
        if (newErrors[id]) {
          const { [field]: _, ...rest } = newErrors[id];
          if (Object.keys(rest).length === 0) {
            delete newErrors[id];
          } else {
            newErrors[id] = rest;
          }
        }
        return newErrors;
      });
    }
  };

  // Validate parent fields
  // First guardian (index 0): firstName, lastName, email, phoneNumber - required
  // Second guardian (index 1): firstName, lastName, phoneNumber - required; email optional
  const validateParent = (parent: ParentData, index: number): Record<string, string> => {
    const errors: Record<string, string> = {};
    const isFirstGuardian = index === 0;

    // Always required for both guardians
    if (!parent.firstName || parent.firstName.trim() === '') {
      errors.firstName = 'Pole obowiązkowe';
    }

    if (!parent.lastName || parent.lastName.trim() === '') {
      errors.lastName = 'Pole obowiązkowe';
    }

    if (!parent.phoneNumber || parent.phoneNumber.trim() === '') {
      errors.phoneNumber = 'Pole obowiązkowe';
    }

    // Email required only for first guardian
    if (isFirstGuardian) {
      if (!parent.email || parent.email.trim() === '') {
        errors.email = 'Pole obowiązkowe';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parent.email)) {
        errors.email = 'Nieprawidłowy adres e-mail';
      }
    } else {
      // For second guardian, email is optional but if provided, must be valid
      if (parent.email && parent.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parent.email)) {
        errors.email = 'Nieprawidłowy adres e-mail';
      }
    }

    // Street, postalCode, city are optional for both guardians (no validation)

    return errors;
  };

  // Validate all parents
  const validateAllParents = (): boolean => {
    const allErrors: Record<string, Record<string, string>> = {};
    let isValid = true;

    parents.forEach((parent, index) => {
      const errors = validateParent(parent, index);
      if (Object.keys(errors).length > 0) {
        allErrors[parent.id] = errors;
        isValid = false;
      }
    });

    setParentErrors(allErrors);
    return isValid;
  };

  const [participantData, setParticipantData] = useState({
    firstName: '',
    lastName: '',
    age: '', // Will store birth year as string
    gender: '',
    city: '',
    selectedParticipant: '',
  });

  // Validate participant fields - use useCallback to ensure it uses current participantData
  const validateParticipant = useCallback((): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!participantData.firstName || participantData.firstName.trim() === '') {
      errors.firstName = 'Pole obowiązkowe';
    }

    if (!participantData.lastName || participantData.lastName.trim() === '') {
      errors.lastName = 'Pole obowiązkowe';
    }

    if (!participantData.age || participantData.age.trim() === '' || participantData.age === 'Wybierz z listy') {
      errors.age = 'Pole obowiązkowe';
    } else {
      // Validate that selected birth year gives age 7-17 on camp start date
      // Use same interface as in getAvailableBirthYears
      interface CampProperties {
        start_date: string;
        end_date: string;
        period: string;
        city: string;
      }

      interface CampData {
        properties: CampProperties;
      }

      const defaultProperties: CampProperties = {
        start_date: '',
        end_date: '',
        period: '',
        city: '',
      };

      const defaultCamp: CampData = {
        properties: defaultProperties,
      };

      const campData: CampData = reservation.camp || defaultCamp;
      const startDateStr = campData.properties.start_date;

      if (startDateStr) {
        try {
          const startDate = new Date(startDateStr);
          const startYear = startDate.getFullYear();
          const birthYear = parseInt(participantData.age, 10);

          if (isNaN(birthYear)) {
            errors.age = 'Nieprawidłowy rocznik';
          } else {
            // Calculate age on camp start date
            // Age = startYear - birthYear (if birthday has passed) or startYear - birthYear - 1 (if not)
            // For validation, we check if birthYear is in the valid range
            // Valid range: (startYear - 17) to (startYear - 7)
            const minBirthYear = startYear - 17;
            const maxBirthYear = startYear - 7;

            if (birthYear < minBirthYear || birthYear > maxBirthYear) {
              errors.age = 'Uczestnik musi mieć 7-17 lat w dniu rozpoczęcia obozu';
            }
          }
        } catch (error) {
          console.error('Error validating birth year:', error);
          // Don't add error if date parsing fails - let it pass
        }
      }
    }

    if (!participantData.gender || participantData.gender.trim() === '' || participantData.gender === 'Wybierz z listy') {
      errors.gender = 'Pole obowiązkowe';
    }

    if (!participantData.city || participantData.city.trim() === '') {
      errors.city = 'Pole obowiązkowe';
    }

    return errors;
  }, [participantData]);

  // Validate all (parents + participant)
  const _validateAll = (): boolean => {
    // Always validate both parents and participant, even if one fails
    const parentsValid = validateAllParents();
    const participantErrors = validateParticipant();
    const participantValid = Object.keys(participantErrors).length === 0;

    // Always set participant errors, even if parents validation failed
    setParticipantErrors(participantErrors);

    return parentsValid && participantValid;
  };

  const [accommodationRequest, setAccommodationRequest] = useState('');
  const [healthQuestions, setHealthQuestions] = useState({
    chronicDiseases: 'Nie',
    dysfunctions: 'Nie',
    psychiatric: 'Nie',
  });
  const [healthDetails, setHealthDetails] = useState({
    chronicDiseases: '',
    dysfunctions: '',
    psychiatric: '',
  });

  const [additionalNotes, setAdditionalNotes] = useState('');

  // Memoize validateAll to ensure it uses current values
  const validateAllMemoized = useCallback(() => {
    validationAttemptedRef.current = true;
    // Always validate both parents and participant, even if one fails
    const parentsValid = validateAllParents();
    const participantErrors = validateParticipant();
    const participantValid = Object.keys(participantErrors).length === 0;

    // Always set participant errors, even if parents validation failed
    setParticipantErrors(participantErrors);

    return parentsValid && participantValid;
  }, [parents, participantData, validateParticipant]);

  // Expose validation function for external use (e.g., LayoutClient)
  useEffect(() => {
    (window as any).validateStep1 = validateAllMemoized;

    return () => {
      delete (window as any).validateStep1;
    };
  }, [validateAllMemoized]);

  // Function to load data from sessionStorage
  const loadDataFromStorage = useCallback(() => {
    // Reset flag before loading
    isDataLoadedRef.current = false;

    const savedData = loadStep1FormData();

    if (savedData) {
      // Only update if data exists in sessionStorage
      if (savedData.parents && savedData.parents.length > 0) {
        setParents(savedData.parents);
      }
      if (savedData.participantData) {
        setParticipantData(savedData.participantData);
      }
      // Diet is now handled by DietSection component
      if (savedData.accommodationRequest !== undefined) {
        setAccommodationRequest(savedData.accommodationRequest || '');
      }
      if (savedData.healthQuestions) {
        setHealthQuestions(savedData.healthQuestions);
      }
      if (savedData.healthDetails) {
        setHealthDetails(savedData.healthDetails);
      }
      if (savedData.additionalNotes !== undefined) {
        setAdditionalNotes(savedData.additionalNotes || '');
      }
    }

    // Mark data as loaded after state updates are scheduled
    // Use requestAnimationFrame to ensure state updates are processed
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isDataLoadedRef.current = true;
      });
    });
  }, []);

  // Load data from sessionStorage on mount
  // Since we use key prop in parent component, this will run every time user navigates to Step1
  useLayoutEffect(() => {
    loadDataFromStorage();
  }, []); // Empty deps - will run on every mount (which happens when key changes)

  // Also load data when pathname changes to Step1 (handles case when component doesn't remount)
  useEffect(() => {
    if (pathname && pathname.includes('/step/1')) {
      // Reload data when navigating back to Step1
      loadDataFromStorage();
    }
  }, [pathname, loadDataFromStorage]);

  // Save data to sessionStorage whenever any field changes
  // Note: selectedDietId is saved by DietSection component
  // Only save after data has been loaded from sessionStorage to prevent overwriting with empty values
  useEffect(() => {
    // Don't save if data hasn't been loaded yet (prevents overwriting sessionStorage with empty initial values)
    if (!isDataLoadedRef.current) {
      return;
    }

    const savedData = loadStep1FormData();
    const formData: Step1FormData = {
      parents,
      participantData,
      selectedDietId: savedData?.selectedDietId || null,
      accommodationRequest,
      healthQuestions,
      healthDetails,
      additionalNotes,
    };
    saveStep1FormData(formData);
  }, [parents, participantData, accommodationRequest, healthQuestions, healthDetails, additionalNotes]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Dane rodzica / opiekuna prawnego */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
          Dane rodzica / opiekuna prawnego
        </h2>
        {parents.map((parent, index) => (
          <div key={parent.id} className={index > 0 ? 'mt-4 sm:mt-6' : ''}>
            {index > 0 && (
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-700">
                  Opiekun {index + 1}
                </h3>
                {parents.length > 1 && (
                  <button
                    onClick={() => removeParent(parent.id)}
                    disabled={disabled}
                    className="text-red-600 hover:text-red-700 text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Usuń opiekuna
                  </button>
                )}
              </div>
            )}
            <section className="bg-white p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Imię *
                  </label>
                  <input
                    type="text"
                    value={parent.firstName}
                    onChange={(e) => updateParent(parent.id, 'firstName', e.target.value)}
                    disabled={disabled}
                    className={`w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      (parentErrors[parent.id] && parentErrors[parent.id].firstName) ? 'border-red-500' : 'border-gray-400'
                    }`}
                  />
                  {(parentErrors[parent.id] && parentErrors[parent.id].firstName) && (
                    <p className="mt-1 text-xs text-red-600">{parentErrors[parent.id].firstName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Nazwisko *
                  </label>
                  <input
                    type="text"
                    value={parent.lastName}
                    onChange={(e) => updateParent(parent.id, 'lastName', e.target.value)}
                    disabled={disabled}
                    className={`w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      (parentErrors[parent.id] && parentErrors[parent.id].lastName) ? 'border-red-500' : 'border-gray-400'
                    }`}
                  />
                  {(parentErrors[parent.id] && parentErrors[parent.id].lastName) && (
                    <p className="mt-1 text-xs text-red-600">{parentErrors[parent.id].lastName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Adres e-mail {index === 0 ? <span className="text-red-500">*</span> : ''}
                  </label>
                  <input
                    type="email"
                    value={parent.email}
                    onChange={(e) => updateParent(parent.id, 'email', e.target.value)}
                    disabled={disabled}
                    className={`w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      (parentErrors[parent.id] && parentErrors[parent.id].email) ? 'border-red-500' : 'border-gray-400'
                    }`}
                  />
                  {(parentErrors[parent.id] && parentErrors[parent.id].email) && (
                    <p className="mt-1 text-xs text-red-600">{parentErrors[parent.id].email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Numer telefonu *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={parent.phone}
                      onChange={(e) => updateParent(parent.id, 'phone', e.target.value)}
                      disabled={disabled}
                      className="px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] pr-8 sm:pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="+48">+48</option>
                      <option value="+1">+1</option>
                    </select>
                    <div className="flex-1">
                      <input
                        type="tel"
                        value={parent.phoneNumber}
                        onChange={(e) => updateParent(parent.id, 'phoneNumber', e.target.value)}
                        disabled={disabled}
                        className={`w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                          (parentErrors[parent.id] && parentErrors[parent.id].phoneNumber) ? 'border-red-500' : 'border-gray-400'
                        }`}
                      />
                      {(parentErrors[parent.id] && parentErrors[parent.id].phoneNumber) && (
                        <p className="mt-1 text-xs text-red-600">{parentErrors[parent.id].phoneNumber}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Ulica i numer
                  </label>
                  <input
                    type="text"
                    value={parent.street}
                    onChange={(e) => updateParent(parent.id, 'street', e.target.value)}
                    disabled={disabled}
                    className={`w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      (parentErrors[parent.id] && parentErrors[parent.id].street) ? 'border-red-500' : 'border-gray-400'
                    }`}
                  />
                  {(parentErrors[parent.id] && parentErrors[parent.id].street) && (
                    <p className="mt-1 text-xs text-red-600">{parentErrors[parent.id].street}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Kod pocztowy
                  </label>
                  <input
                    type="text"
                    value={parent.postalCode}
                    onChange={(e) => updateParent(parent.id, 'postalCode', e.target.value)}
                    disabled={disabled}
                    className={`w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      (parentErrors[parent.id] && parentErrors[parent.id].postalCode) ? 'border-red-500' : 'border-gray-400'
                    }`}
                  />
                  {(parentErrors[parent.id] && parentErrors[parent.id].postalCode) && (
                    <p className="mt-1 text-xs text-red-600">{parentErrors[parent.id].postalCode}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Miejscowość
                  </label>
                  <input
                    type="text"
                    value={parent.city}
                    onChange={(e) => updateParent(parent.id, 'city', e.target.value)}
                    disabled={disabled}
                    className={`w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      (parentErrors[parent.id] && parentErrors[parent.id].city) ? 'border-red-500' : 'border-gray-400'
                    }`}
                  />
                  {(parentErrors[parent.id] && parentErrors[parent.id].city) && (
                    <p className="mt-1 text-xs text-red-600">{parentErrors[parent.id].city}</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        ))}
        {parents.length < 2 && (
          <div className="flex justify-end mt-4">
            <button
              onClick={addParent}
              disabled={disabled}
              className="text-[#03adf0] hover:text-[#0288c7] text-sm font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Dodaj opiekuna
            </button>
          </div>
        )}
      </div>

      {/* Dane uczestnika */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
          Dane uczestnika
        </h2>
        <section className="bg-white p-4 sm:p-6">
          {/* Zakomentowana sekcja wyboru dziecka */}
          {/* <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Image
              src="/child_pictures.svg"
              alt="Child icon"
              width={40}
              height={40}
              className="w-8 h-8 sm:w-10 sm:h-10"
            />
            <select
              value={participantData.selectedParticipant}
              onChange={(e) => setParticipantData({ ...participantData, selectedParticipant: e.target.value })}
              disabled={disabled}
              className="w-2/3 px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] pr-8 sm:pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Wybierz z listy</option>
              <option value="Jan">Jan</option>
              <option value="Anna">Anna</option>
            </select>
          </div> */}
          {/* Zakomentowana linia przerywana */}
          {/* <div className="mt-4 sm:mt-6 mb-4 sm:mb-6">
            <DashedLine />
          </div> */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Imię uczestnika <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={participantData.firstName}
                onChange={(e) => {
                  setParticipantData({ ...participantData, firstName: e.target.value });
                  // Clear error when user starts typing
                  if (validationAttemptedRef.current && participantErrors.firstName) {
                    setParticipantErrors((prev) => {
                      const { firstName: _, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                placeholder="Imię"
                disabled={disabled}
                className={`w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  participantErrors.firstName ? 'border-red-500' : 'border-gray-400'
                }`}
              />
              {participantErrors.firstName && (
                <p className="mt-1 text-xs text-red-600">{participantErrors.firstName}</p>
              )}
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Nazwisko uczestnika <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={participantData.lastName}
                onChange={(e) => {
                  setParticipantData({ ...participantData, lastName: e.target.value });
                  // Clear error when user starts typing
                  if (validationAttemptedRef.current && participantErrors.lastName) {
                    setParticipantErrors((prev) => {
                      const { lastName: _, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                placeholder="Nazwisko"
                disabled={disabled}
                className={`w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  participantErrors.lastName ? 'border-red-500' : 'border-gray-400'
                }`}
              />
              {participantErrors.lastName && (
                <p className="mt-1 text-xs text-red-600">{participantErrors.lastName}</p>
              )}
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Rocznik <span className="text-red-500">*</span>
              </label>
              <select
                value={participantData.age}
                onChange={(e) => {
                  setParticipantData({ ...participantData, age: e.target.value });
                  // Clear error when user selects
                  if (validationAttemptedRef.current && participantErrors.age) {
                    setParticipantErrors((prev) => {
                      const { age: _, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                disabled={disabled || availableBirthYears.length === 0}
                className={`w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] pr-8 sm:pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  participantErrors.age ? 'border-red-500' : 'border-gray-400'
                }`}
              >
                <option>Wybierz z listy</option>
                {availableBirthYears.length > 0 ? (
                  availableBirthYears.map((year) => (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  ))
                ) : (
                  <option disabled>Brak dostępnych roczników (brak danych obozu)</option>
                )}
              </select>
              {participantErrors.age && (
                <p className="mt-1 text-xs text-red-600">{participantErrors.age}</p>
              )}
              {availableBirthYears.length === 0 && !participantErrors.age && (
                <p className="mt-1 text-xs text-gray-500">Wybierz obóz, aby zobaczyć dostępne roczniki</p>
              )}
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Płeć <span className="text-red-500">*</span>
              </label>
              <select
                value={participantData.gender}
                onChange={(e) => {
                  setParticipantData({ ...participantData, gender: e.target.value });
                  // Clear error when user selects
                  if (validationAttemptedRef.current && participantErrors.gender) {
                    setParticipantErrors((prev) => {
                      const { gender: _, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                disabled={disabled}
                className={`w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] pr-8 sm:pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  participantErrors.gender ? 'border-red-500' : 'border-gray-400'
                }`}
              >
                <option>Wybierz z listy</option>
                <option value="Chłopiec">Chłopiec</option>
                <option value="Dziewczynka">Dziewczynka</option>
              </select>
              {participantErrors.gender && (
                <p className="mt-1 text-xs text-red-600">{participantErrors.gender}</p>
              )}
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Miejsce zamieszkania (miasto) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={participantData.city}
                onChange={(e) => {
                  setParticipantData({ ...participantData, city: e.target.value });
                  // Clear error when user starts typing
                  if (validationAttemptedRef.current && participantErrors.city) {
                    setParticipantErrors((prev) => {
                      const { city: _, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                placeholder="Miejscowość"
                disabled={disabled}
                className={`w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  participantErrors.city ? 'border-red-500' : 'border-gray-400'
                }`}
              />
              {participantErrors.city && (
                <p className="mt-1 text-xs text-red-600">{participantErrors.city}</p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Dieta uczestnika */}
      <DietSection />

      {/* Wniosek o zakwaterowanie */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
          Wniosek o zakwaterowanie uczestnika
        </h2>
        <section className="bg-white p-4 sm:p-6">
          <textarea
            value={accommodationRequest}
            onChange={(e) => setAccommodationRequest(e.target.value)}
            rows={4}
            disabled={disabled}
            className="w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Uzupełnij to pole, jeśli występują specjalne prośby o zakwaterowanie, np. z rodzeństwem lub znajomym/znajomymi (wpisz imię i nazwisko)"
          />
        </section>
      </div>

      {/* Stan zdrowia */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
          Stan zdrowia (choroby/dysfunkcje) uczestnika
        </h2>
        <section className="bg-white p-4 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Chronic diseases */}
            <div>
              <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-900 mb-2">
                Czy uczestnik ma choroby przewlekłe?
                <button className="text-[#03adf0] hover:text-[#0288c7] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                </button>
              </label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="chronicDiseases"
                    value="Tak"
                    checked={healthQuestions.chronicDiseases === 'Tak'}
                    onChange={(e) => setHealthQuestions({ ...healthQuestions, chronicDiseases: e.target.value })}
                    disabled={disabled}
                    className="text-[#03adf0] focus:ring-[#03adf0] disabled:cursor-not-allowed"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Tak</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="chronicDiseases"
                    value="Nie"
                    checked={healthQuestions.chronicDiseases === 'Nie'}
                    onChange={(e) => {
                      setHealthQuestions({ ...healthQuestions, chronicDiseases: e.target.value });
                      setHealthDetails({ ...healthDetails, chronicDiseases: '' });
                    }}
                    disabled={disabled}
                    className="text-[#03adf0] focus:ring-[#03adf0] disabled:cursor-not-allowed"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Nie</span>
                </label>
              </div>
              {healthQuestions.chronicDiseases === 'Tak' && (
                <textarea
                  value={healthDetails.chronicDiseases}
                  onChange={(e) => setHealthDetails({ ...healthDetails, chronicDiseases: e.target.value })}
                  placeholder="Opisz choroby przewlekłe..."
                  disabled={disabled}
                  className="mt-3 w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] overflow-hidden disabled:bg-gray-100 disabled:cursor-not-allowed"
                  style={{
                    animation: 'expandWidth 0.5s ease-out forwards, expandHeight 0.5s ease-out forwards',
                  }}
                />
              )}
            </div>

            {/* Dysfunctions */}
            <div>
              <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-900 mb-2">
                Czy uczestnik ma dysfunkcje?
                <button className="text-[#03adf0] hover:text-[#0288c7] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                </button>
              </label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="dysfunctions"
                    value="Tak"
                    checked={healthQuestions.dysfunctions === 'Tak'}
                    onChange={(e) => setHealthQuestions({ ...healthQuestions, dysfunctions: e.target.value })}
                    disabled={disabled}
                    className="text-[#03adf0] focus:ring-[#03adf0] disabled:cursor-not-allowed"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Tak</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="dysfunctions"
                    value="Nie"
                    checked={healthQuestions.dysfunctions === 'Nie'}
                    onChange={(e) => {
                      setHealthQuestions({ ...healthQuestions, dysfunctions: e.target.value });
                      setHealthDetails({ ...healthDetails, dysfunctions: '' });
                    }}
                    disabled={disabled}
                    className="text-[#03adf0] focus:ring-[#03adf0] disabled:cursor-not-allowed"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Nie</span>
                </label>
              </div>
              {healthQuestions.dysfunctions === 'Tak' && (
                <textarea
                  value={healthDetails.dysfunctions}
                  onChange={(e) => setHealthDetails({ ...healthDetails, dysfunctions: e.target.value })}
                  placeholder="Opisz dysfunkcje..."
                  disabled={disabled}
                  className="mt-3 w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] overflow-hidden disabled:bg-gray-100 disabled:cursor-not-allowed"
                  style={{
                    animation: 'expandWidth 0.5s ease-out forwards, expandHeight 0.5s ease-out forwards',
                  }}
                />
              )}
            </div>

            {/* Psychiatric */}
            <div>
              <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-900 mb-2">
                Czy uczestnik ma problemy psychiatryczne?
                <button className="text-[#03adf0] hover:text-[#0288c7] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                </button>
              </label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="psychiatric"
                    value="Tak"
                    checked={healthQuestions.psychiatric === 'Tak'}
                    onChange={(e) => setHealthQuestions({ ...healthQuestions, psychiatric: e.target.value })}
                    disabled={disabled}
                    className="text-[#03adf0] focus:ring-[#03adf0] disabled:cursor-not-allowed"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Tak</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="psychiatric"
                    value="Nie"
                    checked={healthQuestions.psychiatric === 'Nie'}
                    onChange={(e) => {
                      setHealthQuestions({ ...healthQuestions, psychiatric: e.target.value });
                      setHealthDetails({ ...healthDetails, psychiatric: '' });
                    }}
                    disabled={disabled}
                    className="text-[#03adf0] focus:ring-[#03adf0] disabled:cursor-not-allowed"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Nie</span>
                </label>
              </div>
              {healthQuestions.psychiatric === 'Tak' && (
                <textarea
                  value={healthDetails.psychiatric}
                  onChange={(e) => setHealthDetails({ ...healthDetails, psychiatric: e.target.value })}
                  placeholder="Opisz problemy psychiatryczne..."
                  disabled={disabled}
                  className="mt-3 w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] overflow-hidden disabled:bg-gray-100 disabled:cursor-not-allowed"
                  style={{
                    animation: 'expandWidth 0.5s ease-out forwards, expandHeight 0.5s ease-out forwards',
                  }}
                />
              )}
            </div>

            <DashedLine />

            {/* Alert */}
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-[#D62828] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-bold text-gray-900 mb-1">Uwaga!</p>
                <p className="text-xs sm:text-sm text-gray-700">
                  Prosimy o dokładne wypełnienie wszystkich pól dotyczących stanu zdrowia uczestnika.
                  Informacje te są niezbędne do zapewnienia odpowiedniej opieki podczas obozu.
                </p>
              </div>
            </div>

            <DashedLine />

            {/* Additional notes */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Informacje dodatkowe / Uwagi
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={4}
                disabled={disabled}
                className="w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Wprowadź dodatkowe informacje..."
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

