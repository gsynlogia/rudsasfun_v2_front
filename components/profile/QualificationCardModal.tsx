'use client';

import { X, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

import { qualificationCardService } from '@/lib/services/QualificationCardService';
import type { ReservationResponse } from '@/lib/services/ReservationService';
import type { QualificationCardDataUpdate } from '@/types/qualificationCardDataResponse';

interface QualificationCardModalProps {
  reservation: ReservationResponse;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QualificationCardModal({
  reservation,
  isOpen,
  onClose,
  onSuccess,
}: QualificationCardModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canGenerate, setCanGenerate] = useState(false);
  const [noSecondParent, setNoSecondParent] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [validationAttempted, setValidationAttempted] = useState(false);

  // Form data
  const [formData, setFormData] = useState<QualificationCardDataUpdate>({
    participant_birth_date: null,
    participant_birth_place: null,
    participant_pesel: null,
    participant_street: null,
    participant_postal_code: null,
    participant_city_address: null,
    parent1_first_name: null,
    parent1_last_name: null,
    parent1_street: null,
    parent1_postal_code: null,
    parent1_city: null,
    parent1_phone: null,
    parent1_email: null,
    parent2_first_name: null,
    parent2_last_name: null,
    parent2_street: null,
    parent2_postal_code: null,
    parent2_city: null,
    parent2_phone: null,
    parent2_email: null,
  });

  // Phone code states (separate from phone number)
  const [parent1PhoneCode, setParent1PhoneCode] = useState<string>('+48');
  const [parent2PhoneCode, setParent2PhoneCode] = useState<string>('+48');

  // Health and additional info states
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
  const [participantAdditionalInfo, setParticipantAdditionalInfo] = useState('');

  // Check if second parent exists - recalculate on each render to ensure it's up to date
  const hasSecondParent = useMemo(() => {
    const has = reservation.parents_data && Array.isArray(reservation.parents_data) && reservation.parents_data.length > 1;
    console.log('hasSecondParent calculated:', has, 'parents_data:', reservation.parents_data);
    return has;
  }, [reservation.parents_data]);

  // Get first parent data (read-only, from reservation)
  const firstParent = reservation.parents_data && Array.isArray(reservation.parents_data) && reservation.parents_data.length > 0
    ? reservation.parents_data[0]
    : null;

  // Load existing data
  useEffect(() => {
    if (isOpen && reservation.id) {
      loadData();
    }
  }, [isOpen, reservation.id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Dane wyłącznie z rezerwacji – nie wczytujemy z qualification_card_data
      let formattedBirthDate: string | null = null;
      const age = reservation.participant_age;
      if (age !== null && age !== undefined && age !== '') {
        const ageNum = typeof age === 'string' ? parseInt(age, 10) : age;
        if (!isNaN(ageNum)) {
          const birthYear = new Date().getFullYear() - ageNum;
          formattedBirthDate = `${birthYear}-01-01`;
        }
      }

      const formDataToSet = {
        participant_birth_date: formattedBirthDate,
        participant_birth_place: null,
        participant_pesel: null,
        participant_street: reservation.parents_data?.[0]?.street ?? null,
        participant_postal_code: reservation.parents_data?.[0]?.postalCode ?? null,
        participant_city_address: reservation.participant_city ?? null,
        parent1_first_name: reservation.parents_data?.[0]?.firstName ?? null,
        parent1_last_name: reservation.parents_data?.[0]?.lastName ?? null,
        parent1_street: reservation.parents_data?.[0]?.street ?? null,
        parent1_postal_code: reservation.parents_data?.[0]?.postalCode ?? null,
        parent1_city: reservation.parents_data?.[0]?.city ?? null,
        parent1_phone: (() => {
          const phone = (reservation.parents_data?.[0]?.phoneNumber || reservation.parents_data?.[0]?.phone) ?? null;
          const phoneParts = extractPhoneParts(phone);
          setParent1PhoneCode(phoneParts.code);
          return phoneParts.number;
        })(),
        parent1_email: reservation.parents_data?.[0]?.email ?? null,
        parent2_first_name: hasSecondParent ? reservation.parents_data?.[1]?.firstName ?? null : null,
        parent2_last_name: hasSecondParent ? reservation.parents_data?.[1]?.lastName ?? null : null,
        parent2_street: hasSecondParent ? reservation.parents_data?.[1]?.street ?? null : null,
        parent2_postal_code: hasSecondParent ? reservation.parents_data?.[1]?.postalCode ?? null : null,
        parent2_city: hasSecondParent ? reservation.parents_data?.[1]?.city ?? null : null,
        parent2_phone: (() => {
          if (!hasSecondParent) return null;
          const phone = (reservation.parents_data?.[1]?.phoneNumber || reservation.parents_data?.[1]?.phone) ?? null;
          const phoneParts = extractPhoneParts(phone);
          setParent2PhoneCode(phoneParts.code);
          return phoneParts.number;
        })(),
        parent2_email: hasSecondParent ? reservation.parents_data?.[1]?.email ?? null : null,
      };

      setFormData(formDataToSet);
      setAccommodationRequest(reservation.accommodation_request || '');

      if (reservation.health_questions && typeof reservation.health_questions === 'object') {
        setHealthQuestions({
          chronicDiseases: reservation.health_questions.chronicDiseases || 'Nie',
          dysfunctions: reservation.health_questions.dysfunctions || 'Nie',
          psychiatric: reservation.health_questions.psychiatric || 'Nie',
        });
      }
      if (reservation.health_details && typeof reservation.health_details === 'object') {
        setHealthDetails({
          chronicDiseases: reservation.health_details.chronicDiseases || '',
          dysfunctions: reservation.health_details.dysfunctions || '',
          psychiatric: reservation.health_details.psychiatric || '',
        });
      }
      setAdditionalNotes(reservation.additional_notes || '');
      setParticipantAdditionalInfo(reservation.participant_additional_info || '');

      const canGen = await qualificationCardService.canGenerateQualificationCard(reservation.id);
      setCanGenerate(canGen.can_generate);
    } catch (err) {
      console.error('Error loading qualification card data:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas ładowania danych');

      const fallbackFormData = {
        participant_birth_date: null,
        participant_birth_place: null,
        participant_pesel: null,
        participant_street: reservation.parents_data?.[0]?.street || null,
        participant_postal_code: reservation.parents_data?.[0]?.postalCode || null,
        participant_city_address: reservation.participant_city || null,
        parent1_first_name: reservation.parents_data?.[0]?.firstName || null,
        parent1_last_name: reservation.parents_data?.[0]?.lastName || null,
        parent1_street: reservation.parents_data?.[0]?.street || null,
        parent1_postal_code: reservation.parents_data?.[0]?.postalCode || null,
        parent1_city: reservation.parents_data?.[0]?.city || null,
        parent1_phone: (() => {
          const phone = (reservation.parents_data?.[0]?.phoneNumber || reservation.parents_data?.[0]?.phone) ?? null;
          const phoneParts = extractPhoneParts(phone);
          setParent1PhoneCode(phoneParts.code);
          return phoneParts.number;
        })(),
        parent1_email: reservation.parents_data?.[0]?.email || null,
        parent2_first_name: hasSecondParent ? reservation.parents_data?.[1]?.firstName : null,
        parent2_last_name: hasSecondParent ? reservation.parents_data?.[1]?.lastName : null,
        parent2_street: hasSecondParent ? reservation.parents_data?.[1]?.street : null,
        parent2_postal_code: hasSecondParent ? reservation.parents_data?.[1]?.postalCode : null,
        parent2_city: hasSecondParent ? reservation.parents_data?.[1]?.city : null,
        parent2_phone: (() => {
          if (!hasSecondParent) return null;
          const phone = (reservation.parents_data?.[1]?.phoneNumber || reservation.parents_data?.[1]?.phone) ?? null;
          if (phone && typeof phone === 'string' && phone.startsWith('+48')) {
            return phone.replace(/^\+48\s*/, '').trim();
          }
          return phone;
        })(),
        parent2_email: hasSecondParent ? reservation.parents_data?.[1]?.email : null,
      };

      console.log('Setting fallback form data:', fallbackFormData);
      setFormData(fallbackFormData);

      // Load health and additional info from reservation (fallback)
      setAccommodationRequest(reservation.accommodation_request || '');

      if (reservation.health_questions && typeof reservation.health_questions === 'object') {
        setHealthQuestions({
          chronicDiseases: reservation.health_questions.chronicDiseases || 'Nie',
          dysfunctions: reservation.health_questions.dysfunctions || 'Nie',
          psychiatric: reservation.health_questions.psychiatric || 'Nie',
        });
      }

      if (reservation.health_details && typeof reservation.health_details === 'object') {
        setHealthDetails({
          chronicDiseases: reservation.health_details.chronicDiseases || '',
          dysfunctions: reservation.health_details.dysfunctions || '',
          psychiatric: reservation.health_details.psychiatric || '',
        });
      }

      setAdditionalNotes(reservation.additional_notes || '');
      setParticipantAdditionalInfo(reservation.participant_additional_info || '');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to prepare phone number for saving (combine code + number)
  const preparePhoneForSave = (phoneCode: string, phoneNumber: string | null | undefined): string | null => {
    if (!phoneNumber || phoneNumber.trim() === '') return null;
    const cleaned = phoneNumber.trim();
    // Combine code and number
    return `${phoneCode} ${cleaned}`;
  };

  // Helper function to extract phone code and number from saved phone
  const extractPhoneParts = (phone: string | null | undefined): { code: string; number: string } => {
    if (!phone || phone.trim() === '') return { code: '+48', number: '' };
    const cleaned = phone.trim();
    // Try to extract code (starts with +)
    const match = cleaned.match(/^(\+\d{1,4})\s*(.+)$/);
    if (match) {
      return { code: match[1], number: match[2] };
    }
    // If no code found, assume it's just a number and default to +48
    return { code: '+48', number: cleaned };
  };

  const handleSave = async () => {
    // Validate before saving
    if (!validateForm()) {
      setError('Wypełnij wszystkie wymagane pola');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Prepare data with phone numbers (add +48 if needed)
      const dataToSave = {
        ...formData,
        parent1_phone: preparePhoneForSave(parent1PhoneCode, formData.parent1_phone),
        parent2_phone: preparePhoneForSave(parent2PhoneCode, formData.parent2_phone),
      };

      await qualificationCardService.saveQualificationCardData(reservation.id, dataToSave);

      // Save health and additional info to reservation
      await qualificationCardService.updateReservationHealthInfo(reservation.id, {
        accommodation_request: accommodationRequest,
        health_questions: healthQuestions,
        health_details: healthDetails,
        additional_notes: additionalNotes,
        participant_additional_info: participantAdditionalInfo,
      });

      // Check if can generate now
      const canGen = await qualificationCardService.canGenerateQualificationCard(reservation.id);
      setCanGenerate(canGen.can_generate);

      onSuccess();
    } catch (err) {
      console.error('Error saving qualification card data:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas zapisywania danych');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = async () => {
    // Validate before generating
    if (!validateForm()) {
      setError('Wypełnij wszystkie wymagane pola przed wygenerowaniem karty');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Prepare data with phone numbers (add +48 if needed)
      const dataToSave = {
        ...formData,
        parent1_phone: preparePhoneForSave(parent1PhoneCode, formData.parent1_phone),
        parent2_phone: preparePhoneForSave(parent2PhoneCode, formData.parent2_phone),
      };

      // First save data
      await qualificationCardService.saveQualificationCardData(reservation.id, dataToSave);

      // Open HTML card in new window (similar to contract)
      // Use Next.js route instead of direct API URL to handle authentication
      const formatReservationNumber = (reservationId: number, createdAt: string) => {
        const year = new Date(createdAt).getFullYear();
        const paddedId = String(reservationId).padStart(3, '0');
        return `REZ-${year}-${paddedId}`;
      };
      const reservationNumber = formatReservationNumber(reservation.id, reservation.created_at);
      const url = `/profil/aktualne-rezerwacje/${reservationNumber}/karta-kwalifikacyjna`;
      window.open(url, '_blank');

      // Show important information about qualification card
      alert(`WAŻNE INFORMACJE O KARCIE KWALIFIKACYJNEJ:\n\n` +
            `• Karta jest uzupełniona na podstawie rezerwacji.\n` +
            `• MUSISZ uzupełnić pozostałe dane: PESEL (jeśli nie został podany) oraz informacje o chorobach/zdrowiu.\n` +
            `• MUSISZ odesłać PODPISANĄ kartę kwalifikacyjną.\n` +
            `• Masz 2 dni na wgranie podpisanej karty do systemu.\n` +
            `• Możesz podpisać kartę odręcznie lub podpisem zaufanym.\n${
            hasSecondParent ? '• W karcie muszą być dane obojga rodziców/opiekunów.\n' : ''}`);

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error opening qualification card:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas otwierania karty');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof QualificationCardDataUpdate, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validation function
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Participant required fields
    if (!formData.participant_birth_date || formData.participant_birth_date.trim() === '') {
      errors.participant_birth_date = 'To pole jest wymagane';
    }
    if (!formData.participant_birth_place || formData.participant_birth_place.trim() === '') {
      errors.participant_birth_place = 'To pole jest wymagane';
    }
    if (!formData.participant_pesel || formData.participant_pesel.trim() === '') {
      errors.participant_pesel = 'To pole jest wymagane';
    }
    if (!formData.participant_street || formData.participant_street.trim() === '') {
      errors.participant_street = 'To pole jest wymagane';
    }
    if (!formData.participant_postal_code || formData.participant_postal_code.trim() === '') {
      errors.participant_postal_code = 'To pole jest wymagane';
    }
    if (!formData.participant_city_address || formData.participant_city_address.trim() === '') {
      errors.participant_city_address = 'To pole jest wymagane';
    }

    // Parent 1 required fields
    if (!formData.parent1_first_name || formData.parent1_first_name.trim() === '') {
      errors.parent1_first_name = 'To pole jest wymagane';
    }
    if (!formData.parent1_last_name || formData.parent1_last_name.trim() === '') {
      errors.parent1_last_name = 'To pole jest wymagane';
    }
    if (!formData.parent1_street || formData.parent1_street.trim() === '') {
      errors.parent1_street = 'To pole jest wymagane';
    }
    if (!formData.parent1_postal_code || formData.parent1_postal_code.trim() === '') {
      errors.parent1_postal_code = 'To pole jest wymagane';
    }
    if (!formData.parent1_city || formData.parent1_city.trim() === '') {
      errors.parent1_city = 'To pole jest wymagane';
    }
    // Phone validation: if only "+48" or empty, it's invalid
    const parent1PhoneValue = formData.parent1_phone || '';
    const parent1PhoneCleaned = parent1PhoneValue.replace(/^\+48\s*/, '').trim();
    if (!parent1PhoneValue || parent1PhoneCleaned === '') {
      errors.parent1_phone = 'To pole jest wymagane';
    }
    if (!formData.parent1_email || formData.parent1_email.trim() === '') {
      errors.parent1_email = 'To pole jest wymagane';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parent1_email)) {
      errors.parent1_email = 'Nieprawidłowy adres email';
    }

    // Parent 2 required fields (always required, even if "brak")
    if (!formData.parent2_first_name || formData.parent2_first_name.trim() === '') {
      errors.parent2_first_name = 'To pole jest wymagane';
    }
    if (!formData.parent2_last_name || formData.parent2_last_name.trim() === '') {
      errors.parent2_last_name = 'To pole jest wymagane';
    }
    if (!formData.parent2_street || formData.parent2_street.trim() === '') {
      errors.parent2_street = 'To pole jest wymagane';
    }
    if (!formData.parent2_postal_code || formData.parent2_postal_code.trim() === '') {
      errors.parent2_postal_code = 'To pole jest wymagane';
    }
    if (!formData.parent2_city || formData.parent2_city.trim() === '') {
      errors.parent2_city = 'To pole jest wymagane';
    }
    // Phone validation: if only "+48" or empty, it's invalid
    const parent2PhoneValue = formData.parent2_phone || '';
    const parent2PhoneCleaned = parent2PhoneValue.replace(/^\+48\s*/, '').trim();
    if (!parent2PhoneValue || parent2PhoneCleaned === '') {
      errors.parent2_phone = 'To pole jest wymagane';
    }
    if (!formData.parent2_email || formData.parent2_email.trim() === '') {
      errors.parent2_email = 'To pole jest wymagane';
    } else if (!noSecondParent && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parent2_email)) {
      errors.parent2_email = 'Nieprawidłowy adres email';
    }

    setValidationErrors(errors);
    setValidationAttempted(true);
    return Object.keys(errors).length === 0;
  };

  const handleNoSecondParentChange = (checked: boolean) => {
    setNoSecondParent(checked);
    if (checked) {
      // Fill all parent2 fields with "brak"
      setFormData(prev => ({
        ...prev,
        parent2_first_name: 'brak',
        parent2_last_name: 'brak',
        parent2_street: 'brak',
        parent2_postal_code: 'brak',
        parent2_city: 'brak',
        parent2_phone: 'brak',
        parent2_email: 'brak',
      }));
    } else {
      // Clear parent2 fields or restore from reservation
      setFormData(prev => ({
        ...prev,
        parent2_first_name: hasSecondParent ? reservation.parents_data?.[1]?.firstName || null : null,
        parent2_last_name: hasSecondParent ? reservation.parents_data?.[1]?.lastName || null : null,
        parent2_street: hasSecondParent ? reservation.parents_data?.[1]?.street || null : null,
        parent2_postal_code: hasSecondParent ? reservation.parents_data?.[1]?.postalCode || null : null,
        parent2_city: hasSecondParent ? reservation.parents_data?.[1]?.city || null : null,
        parent2_phone: (() => {
          if (!hasSecondParent) return null;
          // Priority: phoneNumber from reservation > phone from reservation
          const phone = reservation.parents_data?.[1]?.phoneNumber || reservation.parents_data?.[1]?.phone || null;
          // Remove +48 prefix if present for display
          if (phone && typeof phone === 'string' && phone.startsWith('+48')) {
            return phone.replace(/^\+48\s*/, '').trim();
          }
          return phone;
        })(),
        parent2_email: hasSecondParent ? reservation.parents_data?.[1]?.email || null : null,
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fadeIn"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto animate-scaleIn"
        style={{ borderRadius: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Wypełnij kartę kwalifikacyjną</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            style={{ cursor: 'pointer' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info message */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900 space-y-2">
                <p className="font-bold text-base uppercase mb-2">WAŻNE INFORMACJE:</p>
                <div className="space-y-1.5">
                  <p className="font-semibold">• Karta kwalifikacyjna jest uzupełniona na podstawie rezerwacji.</p>
                  <p className="font-semibold">• MUSISZ uzupełnić pozostałe dane: PESEL (jeśli nie został podany) oraz informacje o chorobach/zdrowiu.</p>
                  <p className="font-semibold text-red-700">• MUSISZ odesłać PODPISANĄ kartę kwalifikacyjną.</p>
                  <p className="font-semibold text-blue-900">• Masz <span className="text-red-700 uppercase">2 dni</span> na wgranie podpisanej karty do systemu.</p>
                  <p className="font-semibold">• Możesz podpisać kartę odręcznie lub podpisem zaufanym.</p>
                  {hasSecondParent && (
                    <p className="font-semibold">• W karcie muszą być dane obojga rodziców/opiekunów.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
              <p className="text-sm text-gray-500 mt-2">Ładowanie danych...</p>
            </div>
          ) : (
            <>
              {/* Uczestnik Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#03adf0]" />
                  Dane uczestnika
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data urodzenia <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.participant_birth_date || ''}
                      onChange={(e) => updateField('participant_birth_date', e.target.value || null)}
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                        validationErrors.participant_birth_date
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-[#03adf0]'
                      }`}
                    />
                    {validationErrors.participant_birth_date && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.participant_birth_date}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Miejsce urodzenia <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.participant_birth_place || ''}
                      onChange={(e) => updateField('participant_birth_place', e.target.value || null)}
                      placeholder="np. Gdańsk"
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                        validationErrors.participant_birth_place
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-[#03adf0]'
                      }`}
                    />
                    {validationErrors.participant_birth_place && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.participant_birth_place}</p>
                    )}
                  </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PESEL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.participant_pesel || ''}
                        onChange={(e) => updateField('participant_pesel', e.target.value || null)}
                        maxLength={11}
                        placeholder="11 cyfr"
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                          validationErrors.participant_pesel
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#03adf0]'
                        }`}
                      />
                      {validationErrors.participant_pesel && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.participant_pesel}</p>
                      )}
                    </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ulica <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.participant_street || ''}
                      onChange={(e) => updateField('participant_street', e.target.value || null)}
                      placeholder="np. ul. Długa 1"
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                        validationErrors.participant_street
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-[#03adf0]'
                      }`}
                    />
                    {validationErrors.participant_street && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.participant_street}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kod pocztowy <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.participant_postal_code || ''}
                      onChange={(e) => updateField('participant_postal_code', e.target.value || null)}
                      placeholder="00-000"
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                        validationErrors.participant_postal_code
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-[#03adf0]'
                      }`}
                    />
                    {validationErrors.participant_postal_code && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.participant_postal_code}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Miasto <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.participant_city_address || ''}
                      onChange={(e) => updateField('participant_city_address', e.target.value || null)}
                      placeholder="np. Gdańsk"
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                        validationErrors.participant_city_address
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-[#03adf0]'
                      }`}
                    />
                    {validationErrors.participant_city_address && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.participant_city_address}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Opiekun 1 Section - Editable */}
              {firstParent && (
                <div className="space-y-4 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-[#03adf0]" />
                    Dane pierwszego opiekuna <span className="text-red-500">*</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Imię <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.parent1_first_name || ''}
                        onChange={(e) => updateField('parent1_first_name', e.target.value || null)}
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                          validationErrors.parent1_first_name
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#03adf0]'
                        }`}
                      />
                      {validationErrors.parent1_first_name && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.parent1_first_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nazwisko <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.parent1_last_name || ''}
                        onChange={(e) => updateField('parent1_last_name', e.target.value || null)}
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                          validationErrors.parent1_last_name
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#03adf0]'
                        }`}
                      />
                      {validationErrors.parent1_last_name && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.parent1_last_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ulica <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.parent1_street || ''}
                        onChange={(e) => updateField('parent1_street', e.target.value || null)}
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                          validationErrors.parent1_street
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#03adf0]'
                        }`}
                      />
                      {validationErrors.parent1_street && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.parent1_street}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kod pocztowy <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.parent1_postal_code || ''}
                        onChange={(e) => updateField('parent1_postal_code', e.target.value || null)}
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                          validationErrors.parent1_postal_code
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#03adf0]'
                        }`}
                      />
                      {validationErrors.parent1_postal_code && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.parent1_postal_code}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Miasto <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.parent1_city || ''}
                        onChange={(e) => updateField('parent1_city', e.target.value || null)}
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                          validationErrors.parent1_city
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#03adf0]'
                        }`}
                      />
                      {validationErrors.parent1_city && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.parent1_city}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefon <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={parent1PhoneCode}
                          onChange={(e) => setParent1PhoneCode(e.target.value)}
                          className="px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                        >
                          <option value="+48">+48 (Polska)</option>
                          <option value="+1">+1 (USA/Kanada)</option>
                          <option value="+44">+44 (Wielka Brytania)</option>
                          <option value="+49">+49 (Niemcy)</option>
                          <option value="+33">+33 (Francja)</option>
                          <option value="+39">+39 (Włochy)</option>
                          <option value="+34">+34 (Hiszpania)</option>
                          <option value="+7">+7 (Rosja/Kazachstan)</option>
                          <option value="+86">+86 (Chiny)</option>
                          <option value="+81">+81 (Japonia)</option>
                          <option value="+82">+82 (Korea Południowa)</option>
                          <option value="+61">+61 (Australia)</option>
                          <option value="+31">+31 (Holandia)</option>
                          <option value="+32">+32 (Belgia)</option>
                          <option value="+41">+41 (Szwajcaria)</option>
                          <option value="+43">+43 (Austria)</option>
                          <option value="+46">+46 (Szwecja)</option>
                          <option value="+47">+47 (Norwegia)</option>
                          <option value="+45">+45 (Dania)</option>
                          <option value="+358">+358 (Finlandia)</option>
                          <option value="+351">+351 (Portugalia)</option>
                          <option value="+30">+30 (Grecja)</option>
                          <option value="+40">+40 (Rumunia)</option>
                          <option value="+36">+36 (Węgry)</option>
                          <option value="+420">+420 (Czechy)</option>
                          <option value="+421">+421 (Słowacja)</option>
                          <option value="+385">+385 (Chorwacja)</option>
                          <option value="+353">+353 (Irlandia)</option>
                        </select>
                        <input
                          type="text"
                          value={formData.parent1_phone || ''}
                          onChange={(e) => updateField('parent1_phone', e.target.value || null)}
                          placeholder="123456789"
                          className={`flex-1 px-3 py-2 border focus:outline-none focus:ring-2 ${
                            validationErrors.parent1_phone
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-gray-300 focus:ring-[#03adf0]'
                          }`}
                        />
                      </div>
                      {validationErrors.parent1_phone && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.parent1_phone}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.parent1_email || ''}
                        onChange={(e) => updateField('parent1_email', e.target.value || null)}
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                          validationErrors.parent1_email
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#03adf0]'
                        }`}
                      />
                      {validationErrors.parent1_email && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.parent1_email}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Opiekun 2 Section - Always visible */}
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-[#03adf0]" />
                    Dane drugiego opiekuna <span className="text-red-500">*</span>
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noSecondParent}
                      onChange={(e) => handleNoSecondParentChange(e.target.checked)}
                      className="w-4 h-4 text-[#03adf0] border-gray-300 rounded focus:ring-[#03adf0]"
                    />
                    <span className="text-sm text-gray-700">Brak drugiego opiekuna</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Imię <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.parent2_first_name || ''}
                        onChange={(e) => updateField('parent2_first_name', e.target.value || null)}
                        disabled={noSecondParent}
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                          validationErrors.parent2_first_name
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#03adf0]'
                        } ${noSecondParent ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      {validationErrors.parent2_first_name && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.parent2_first_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nazwisko <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.parent2_last_name || ''}
                        onChange={(e) => updateField('parent2_last_name', e.target.value || null)}
                        disabled={noSecondParent}
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                          validationErrors.parent2_last_name
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#03adf0]'
                        } ${noSecondParent ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      {validationErrors.parent2_last_name && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.parent2_last_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ulica <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.parent2_street || ''}
                        onChange={(e) => updateField('parent2_street', e.target.value || null)}
                        disabled={noSecondParent}
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                          validationErrors.parent2_street
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#03adf0]'
                        } ${noSecondParent ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      {validationErrors.parent2_street && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.parent2_street}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kod pocztowy <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.parent2_postal_code || ''}
                        onChange={(e) => updateField('parent2_postal_code', e.target.value || null)}
                        disabled={noSecondParent}
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                          validationErrors.parent2_postal_code
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#03adf0]'
                        } ${noSecondParent ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      {validationErrors.parent2_postal_code && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.parent2_postal_code}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Miasto <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.parent2_city || ''}
                        onChange={(e) => updateField('parent2_city', e.target.value || null)}
                        disabled={noSecondParent}
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                          validationErrors.parent2_city
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#03adf0]'
                        } ${noSecondParent ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      {validationErrors.parent2_city && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.parent2_city}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefon <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={parent2PhoneCode}
                          onChange={(e) => setParent2PhoneCode(e.target.value)}
                          disabled={noSecondParent}
                          className={`px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${
                            noSecondParent ? 'bg-gray-100 cursor-not-allowed opacity-50' : ''
                          }`}
                        >
                          <option value="+48">+48 (Polska)</option>
                          <option value="+1">+1 (USA/Kanada)</option>
                          <option value="+44">+44 (Wielka Brytania)</option>
                          <option value="+49">+49 (Niemcy)</option>
                          <option value="+33">+33 (Francja)</option>
                          <option value="+39">+39 (Włochy)</option>
                          <option value="+34">+34 (Hiszpania)</option>
                          <option value="+7">+7 (Rosja/Kazachstan)</option>
                          <option value="+86">+86 (Chiny)</option>
                          <option value="+81">+81 (Japonia)</option>
                          <option value="+82">+82 (Korea Południowa)</option>
                          <option value="+61">+61 (Australia)</option>
                          <option value="+31">+31 (Holandia)</option>
                          <option value="+32">+32 (Belgia)</option>
                          <option value="+41">+41 (Szwajcaria)</option>
                          <option value="+43">+43 (Austria)</option>
                          <option value="+46">+46 (Szwecja)</option>
                          <option value="+47">+47 (Norwegia)</option>
                          <option value="+45">+45 (Dania)</option>
                          <option value="+358">+358 (Finlandia)</option>
                          <option value="+351">+351 (Portugalia)</option>
                          <option value="+30">+30 (Grecja)</option>
                          <option value="+40">+40 (Rumunia)</option>
                          <option value="+36">+36 (Węgry)</option>
                          <option value="+420">+420 (Czechy)</option>
                          <option value="+421">+421 (Słowacja)</option>
                          <option value="+385">+385 (Chorwacja)</option>
                          <option value="+353">+353 (Irlandia)</option>
                        </select>
                        <input
                          type="text"
                          value={formData.parent2_phone || ''}
                          onChange={(e) => updateField('parent2_phone', e.target.value || null)}
                          disabled={noSecondParent}
                          placeholder="123456789"
                          className={`flex-1 px-3 py-2 border focus:outline-none focus:ring-2 ${
                            validationErrors.parent2_phone
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-gray-300 focus:ring-[#03adf0]'
                          } ${noSecondParent ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                      </div>
                      {validationErrors.parent2_phone && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.parent2_phone}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.parent2_email || ''}
                        onChange={(e) => updateField('parent2_email', e.target.value || null)}
                        disabled={noSecondParent}
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                          validationErrors.parent2_email
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#03adf0]'
                        } ${noSecondParent ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      {validationErrors.parent2_email && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.parent2_email}</p>
                      )}
                    </div>
                  </div>
                </div>

              {/* Zakwaterowanie */}
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#03adf0]" />
                  Wniosek o zakwaterowanie uczestnika
                </h3>
                <textarea
                  value={accommodationRequest}
                  onChange={(e) => setAccommodationRequest(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  placeholder="Uzupełnij to pole, jeśli występują specjalne prośby o zakwaterowanie, np. z rodzeństwem lub znajomym/znajomymi (wpisz imię i nazwisko)"
                />
              </div>

              {/* Stan zdrowia */}
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#03adf0]" />
                  Stan zdrowia (choroby/dysfunkcje) uczestnika
                </h3>
                <div className="space-y-4">
                  {/* Chronic diseases */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Czy uczestnik choruje na choroby przewlekłe? (czy choruje na choroby długotrwałe, np. na AZS, cukrzycę, łuszczycę, depresję itp.)
                    </label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="chronicDiseases"
                          value="Tak"
                          checked={healthQuestions.chronicDiseases === 'Tak'}
                          onChange={(e) => setHealthQuestions({ ...healthQuestions, chronicDiseases: e.target.value })}
                          className="text-[#03adf0] focus:ring-[#03adf0]"
                        />
                        <span className="text-sm text-gray-700">Tak</span>
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
                          className="text-[#03adf0] focus:ring-[#03adf0]"
                        />
                        <span className="text-sm text-gray-700">Nie</span>
                      </label>
                    </div>
                    {healthQuestions.chronicDiseases === 'Tak' && (
                      <textarea
                        value={healthDetails.chronicDiseases}
                        onChange={(e) => setHealthDetails({ ...healthDetails, chronicDiseases: e.target.value })}
                        placeholder="Opisz choroby przewlekłe..."
                        rows={3}
                        className="mt-3 w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      />
                    )}
                  </div>

                  {/* Dysfunctions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Czy uczestnik posiada jakieś dysfunkcje? (np. ADHD, opóźnienie w stopniu lekkim, niepełnosprawność, jaka? Itp.)
                    </label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="dysfunctions"
                          value="Tak"
                          checked={healthQuestions.dysfunctions === 'Tak'}
                          onChange={(e) => setHealthQuestions({ ...healthQuestions, dysfunctions: e.target.value })}
                          className="text-[#03adf0] focus:ring-[#03adf0]"
                        />
                        <span className="text-sm text-gray-700">Tak</span>
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
                          className="text-[#03adf0] focus:ring-[#03adf0]"
                        />
                        <span className="text-sm text-gray-700">Nie</span>
                      </label>
                    </div>
                    {healthQuestions.dysfunctions === 'Tak' && (
                      <textarea
                        value={healthDetails.dysfunctions}
                        onChange={(e) => setHealthDetails({ ...healthDetails, dysfunctions: e.target.value })}
                        placeholder="Opisz dysfunkcje..."
                        rows={3}
                        className="mt-3 w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      />
                    )}
                  </div>

                  {/* Psychiatric */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Czy uczestnik leczył się lub leczy psychiatrycznie? (jeśli tak, wpisać kiedy i z jakiego powodu)
                    </label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="psychiatric"
                          value="Tak"
                          checked={healthQuestions.psychiatric === 'Tak'}
                          onChange={(e) => setHealthQuestions({ ...healthQuestions, psychiatric: e.target.value })}
                          className="text-[#03adf0] focus:ring-[#03adf0]"
                        />
                        <span className="text-sm text-gray-700">Tak</span>
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
                          className="text-[#03adf0] focus:ring-[#03adf0]"
                        />
                        <span className="text-sm text-gray-700">Nie</span>
                      </label>
                    </div>
                    {healthQuestions.psychiatric === 'Tak' && (
                      <textarea
                        value={healthDetails.psychiatric}
                        onChange={(e) => setHealthDetails({ ...healthDetails, psychiatric: e.target.value })}
                        placeholder="Opisz problemy psychiatryczne..."
                        rows={3}
                        className="mt-3 w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      />
                    )}
                  </div>

                  {/* Additional notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dodatkowe informacje o stanie zdrowia uczestnika
                    </label>
                    <p className="text-xs text-gray-600 mb-2">
                      Prosimy o podanie dodatkowych informacji, np.: alergie, choroba lokomocyjna, czy nosi okulary, czy przyjmuje leki (jeśli tak, prosimy o podanie nazwy leków i dawek), czy może uprawiać sport, czy ma problemy ze słuchem itp.
                    </p>
                    <p className="text-xs text-gray-600 mb-3">
                      <strong>Informacja:</strong> Leki podaje kadra na obozie lub uczestnik samodzielnie, jeśli rodzic/opiekun prawny napisze na to zgodę.
                    </p>
                    <textarea
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      placeholder="Wprowadź dodatkowe informacje..."
                    />
                  </div>
                </div>
              </div>

              {/* Informacje dodatkowe */}
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#03adf0]" />
                  Informacje dodatkowe dotyczące uczestnika
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Inne informacje, np. wyczesać włosy, nie je wieprzowiny, NIE dla quadów, ograniczone prawa rodzicielskie 2 rodzica itp.
                </p>
                <textarea
                  value={participantAdditionalInfo}
                  onChange={(e) => setParticipantAdditionalInfo(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  placeholder="Wprowadź dodatkowe informacje..."
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {canGenerate && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Wszystkie wymagane pola są wypełnione</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              style={{ borderRadius: 0 }}
            >
              Anuluj
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-[#03adf0] text-white rounded hover:bg-[#0288c7] transition-colors disabled:opacity-50"
              style={{ borderRadius: 0 }}
            >
              {isSaving ? 'Zapisywanie...' : 'Zapisz'}
            </button>
            {canGenerate && (
              <button
                onClick={handleGenerate}
                disabled={isSaving}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                style={{ borderRadius: 0 }}
              >
                <CheckCircle className="w-4 h-4" />
                {isSaving ? 'Generowanie...' : 'Pobierz kartę'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Animations CSS */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}