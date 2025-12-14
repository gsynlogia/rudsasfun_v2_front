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

      const data = await qualificationCardService.getQualificationCardData(reservation.id);

      console.log('Loaded qualification card data:', data);
      console.log('Reservation parents_data:', reservation.parents_data);
      console.log('Has second parent:', hasSecondParent);

      // Format date for input type="date" (YYYY-MM-DD)
      let formattedBirthDate = null;
      if (data.participant_birth_date) {
        try {
          const date = new Date(data.participant_birth_date);
          if (!isNaN(date.getTime())) {
            formattedBirthDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
          }
        } catch (e) {
          console.error('Error parsing birth date:', e);
        }
      }

      // Pre-fill form with existing data or reservation data
      // Priority: saved data > reservation data
      const formDataToSet = {
        participant_birth_date: formattedBirthDate || null,
        participant_birth_place: data.participant_birth_place || null,
        participant_pesel: data.participant_pesel || null,
        participant_street: data.participant_street || reservation.parents_data?.[0]?.street || null,
        participant_postal_code: data.participant_postal_code || reservation.parents_data?.[0]?.postalCode || null,
        participant_city_address: data.participant_city_address || reservation.participant_city || null,
        parent1_first_name: data.parent1_first_name || reservation.parents_data?.[0]?.firstName || null,
        parent1_last_name: data.parent1_last_name || reservation.parents_data?.[0]?.lastName || null,
        parent1_street: data.parent1_street || reservation.parents_data?.[0]?.street || null,
        parent1_postal_code: data.parent1_postal_code || reservation.parents_data?.[0]?.postalCode || null,
        parent1_city: data.parent1_city || reservation.parents_data?.[0]?.city || null,
        parent1_phone: data.parent1_phone || (reservation.parents_data?.[0]?.phone || reservation.parents_data?.[0]?.phoneNumber || '') || null,
        parent1_email: data.parent1_email || reservation.parents_data?.[0]?.email || null,
        parent2_first_name: data.parent2_first_name || (hasSecondParent ? reservation.parents_data?.[1]?.firstName : null) || null,
        parent2_last_name: data.parent2_last_name || (hasSecondParent ? reservation.parents_data?.[1]?.lastName : null) || null,
        parent2_street: data.parent2_street || (hasSecondParent ? reservation.parents_data?.[1]?.street : null) || null,
        parent2_postal_code: data.parent2_postal_code || (hasSecondParent ? reservation.parents_data?.[1]?.postalCode : null) || null,
        parent2_city: data.parent2_city || (hasSecondParent ? reservation.parents_data?.[1]?.city : null) || null,
        parent2_phone: data.parent2_phone || (hasSecondParent ? (reservation.parents_data?.[1]?.phone || reservation.parents_data?.[1]?.phoneNumber || '') : null) || null,
        parent2_email: data.parent2_email || (hasSecondParent ? reservation.parents_data?.[1]?.email : null) || null,
      };

      console.log('Setting form data:', formDataToSet);
      setFormData(formDataToSet);

      // Check if can generate
      const canGen = await qualificationCardService.canGenerateQualificationCard(reservation.id);
      setCanGenerate(canGen.can_generate);
    } catch (err) {
      console.error('Error loading qualification card data:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas ładowania danych');

      // Even if loading fails, pre-fill with reservation data
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
        parent1_phone: (reservation.parents_data?.[0]?.phone || reservation.parents_data?.[0]?.phoneNumber || '') || null,
        parent1_email: reservation.parents_data?.[0]?.email || null,
        parent2_first_name: hasSecondParent ? reservation.parents_data?.[1]?.firstName : null,
        parent2_last_name: hasSecondParent ? reservation.parents_data?.[1]?.lastName : null,
        parent2_street: hasSecondParent ? reservation.parents_data?.[1]?.street : null,
        parent2_postal_code: hasSecondParent ? reservation.parents_data?.[1]?.postalCode : null,
        parent2_city: hasSecondParent ? reservation.parents_data?.[1]?.city : null,
        parent2_phone: hasSecondParent ? (reservation.parents_data?.[1]?.phone || reservation.parents_data?.[1]?.phoneNumber || '') : null,
        parent2_email: hasSecondParent ? reservation.parents_data?.[1]?.email : null,
      };

      console.log('Setting fallback form data:', fallbackFormData);
      setFormData(fallbackFormData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      await qualificationCardService.saveQualificationCardData(reservation.id, formData);

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
    try {
      setIsSaving(true);
      setError(null);

      // First save data
      await qualificationCardService.saveQualificationCardData(reservation.id, formData);

      // Then generate card
      await qualificationCardService.generateQualificationCard(reservation.id);

      // Show important information about qualification card after generation
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
      console.error('Error generating qualification card:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas generowania karty');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof QualificationCardDataUpdate, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
        parent2_phone: hasSecondParent ? (reservation.parents_data?.[1]?.phone || reservation.parents_data?.[1]?.phoneNumber || '') || null : null,
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
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    />
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
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PESEL (opcjonalne)
                    </label>
                    <input
                      type="text"
                      value={formData.participant_pesel || ''}
                      onChange={(e) => updateField('participant_pesel', e.target.value || null)}
                      maxLength={11}
                      placeholder="11 cyfr"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    />
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
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    />
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
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    />
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
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    />
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
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nazwisko <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.parent1_last_name || ''}
                        onChange={(e) => updateField('parent1_last_name', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ulica <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.parent1_street || ''}
                        onChange={(e) => updateField('parent1_street', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kod pocztowy <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.parent1_postal_code || ''}
                        onChange={(e) => updateField('parent1_postal_code', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Miasto <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.parent1_city || ''}
                        onChange={(e) => updateField('parent1_city', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefon <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.parent1_phone || ''}
                        onChange={(e) => updateField('parent1_phone', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.parent1_email || ''}
                        onChange={(e) => updateField('parent1_email', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      />
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
                        className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${noSecondParent ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
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
                        className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${noSecondParent ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
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
                        className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${noSecondParent ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
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
                        className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${noSecondParent ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
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
                        className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${noSecondParent ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefon <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.parent2_phone || ''}
                        onChange={(e) => updateField('parent2_phone', e.target.value || null)}
                        disabled={noSecondParent}
                        className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${noSecondParent ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
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
                        className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${noSecondParent ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>
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
