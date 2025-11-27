'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import DashedLine from './DashedLine';
import type { StepComponentProps } from '@/types/reservation';
import { useReservation } from '@/context/ReservationContext';
import { saveStep1FormData, loadStep1FormData, type Step1FormData } from '@/utils/sessionStorage';

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
export default function Step1({ onNext, onPrevious }: StepComponentProps) {
  const { addReservationItem, removeReservationItemsByType } = useReservation();
  
  const [parents, setParents] = useState<ParentData[]>([
    {
      id: '1',
      firstName: 'Andrzej',
      lastName: 'Nazwisko',
      email: 'Adres e-mail',
      phone: '+48',
      phoneNumber: '',
      street: 'Ulica i numer budynku/mieszkania',
      postalCode: 'np. 00-000',
      city: 'Miejscowość',
    },
  ]);

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
    }
  };

  const updateParent = (id: string, field: keyof ParentData, value: string) => {
    setParents(
      parents.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const [participantData, setParticipantData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    gender: '',
    city: '',
    selectedParticipant: '',
  });

  const [diet, setDiet] = useState<'standard' | 'vegetarian' | null>(null);
  const [accommodationRequest, setAccommodationRequest] = useState('');
  const prevDietRef = useRef<'standard' | 'vegetarian' | null>(null);
  const { reservation } = useReservation();

  // Update reservation when diet changes
  useEffect(() => {
    // Only update if diet actually changed
    if (prevDietRef.current === diet) return;
    
    if (diet === 'vegetarian') {
      addReservationItem({
        name: 'Dieta wegetariańska',
        price: 50,
        type: 'diet',
      });
    } else if (prevDietRef.current === 'vegetarian' && (diet === 'standard' || diet === null)) {
      // Only remove if we're switching FROM vegetarian TO standard/null
      // Use helper function to remove all diet items by type
      removeReservationItemsByType('diet');
    }
    
    prevDietRef.current = diet;
  }, [diet, addReservationItem, removeReservationItemsByType]);
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

  // Load data from sessionStorage on mount
  useEffect(() => {
    const savedData = loadStep1FormData();
    if (savedData) {
      setParents(savedData.parents);
      setParticipantData(savedData.participantData);
      setDiet(savedData.diet);
      setAccommodationRequest(savedData.accommodationRequest);
      setHealthQuestions(savedData.healthQuestions);
      setHealthDetails(savedData.healthDetails);
      setAdditionalNotes(savedData.additionalNotes);
    }
  }, []);

  // Save data to sessionStorage whenever any field changes
  useEffect(() => {
    const formData: Step1FormData = {
      parents,
      participantData,
      diet,
      accommodationRequest,
      healthQuestions,
      healthDetails,
      additionalNotes,
    };
    saveStep1FormData(formData);
  }, [parents, participantData, diet, accommodationRequest, healthQuestions, healthDetails, additionalNotes]);

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
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
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
                    className="w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Nazwisko *
                  </label>
                  <input
                    type="text"
                    value={parent.lastName}
                    onChange={(e) => updateParent(parent.id, 'lastName', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Adres e-mail *
                  </label>
                  <input
                    type="email"
                    value={parent.email}
                    onChange={(e) => updateParent(parent.id, 'email', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Numer telefonu *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={parent.phone}
                      onChange={(e) => updateParent(parent.id, 'phone', e.target.value)}
                      className="px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] pr-8 sm:pr-10"
                    >
                      <option value="+48">+48</option>
                      <option value="+1">+1</option>
                    </select>
                    <input
                      type="tel"
                      value={parent.phoneNumber}
                      onChange={(e) => updateParent(parent.id, 'phoneNumber', e.target.value)}
                      placeholder="111 222 333"
                      className="flex-1 px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Ulica i numer *
                  </label>
                  <input
                    type="text"
                    value={parent.street}
                    onChange={(e) => updateParent(parent.id, 'street', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Kod pocztowy *
                  </label>
                  <input
                    type="text"
                    value={parent.postalCode}
                    onChange={(e) => updateParent(parent.id, 'postalCode', e.target.value)}
                    placeholder="np. 00-000"
                    className="w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Miejscowość *
                  </label>
                  <input
                    type="text"
                    value={parent.city}
                    onChange={(e) => updateParent(parent.id, 'city', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  />
                </div>
              </div>
            </section>
          </div>
        ))}
        {parents.length < 2 && (
          <div className="flex justify-end mt-4">
            <button
              onClick={addParent}
              className="text-[#03adf0] hover:text-[#0288c7] text-sm font-medium flex items-center gap-1"
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
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
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
              className="w-2/3 px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] pr-8 sm:pr-10"
            >
              <option value="">Wybierz z listy</option>
              <option value="Jan">Jan</option>
              <option value="Anna">Anna</option>
            </select>
          </div>
          <div className="mt-4 sm:mt-6 mb-4 sm:mb-6">
            <DashedLine />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Imię uczestnika <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={participantData.firstName}
                onChange={(e) => setParticipantData({ ...participantData, firstName: e.target.value })}
                placeholder="Imię"
                className="w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Nazwisko uczestnika <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={participantData.lastName}
                onChange={(e) => setParticipantData({ ...participantData, lastName: e.target.value })}
                placeholder="Nazwisko"
                className="w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Wiek <span className="text-red-500">*</span>
              </label>
              <select
                value={participantData.age}
                onChange={(e) => setParticipantData({ ...participantData, age: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] pr-8 sm:pr-10"
              >
                <option>Wybierz z listy</option>
                <option value="7">7</option>
                <option value="8">8</option>
                <option value="9">9</option>
                <option value="10">10</option>
                <option value="11">11</option>
                <option value="12">12</option>
                <option value="13">13</option>
                <option value="14">14</option>
                <option value="15">15</option>
                <option value="16">16</option>
                <option value="17">17</option>
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Płeć <span className="text-red-500">*</span>
              </label>
              <select
                value={participantData.gender}
                onChange={(e) => setParticipantData({ ...participantData, gender: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] pr-8 sm:pr-10"
              >
                <option>Wybierz z listy</option>
                <option value="Chłopiec">Chłopiec</option>
                <option value="Dziewczynka">Dziewczynka</option>
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Miejsce zamieszkania (miasto) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={participantData.city}
                onChange={(e) => setParticipantData({ ...participantData, city: e.target.value })}
                placeholder="Miejscowość"
                className="w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
              />
            </div>
          </div>
        </section>
      </div>

      {/* Dieta uczestnika */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
          Dieta uczestnika
        </h2>
        <section className="bg-white p-4 sm:p-6">
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <button
              onClick={() => setDiet('standard')}
              className={`w-32 h-32 sm:w-36 sm:h-36 flex flex-col items-center justify-center gap-2 transition-colors ${
                diet === 'standard'
                  ? 'bg-[#03adf0] text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className={`text-xs sm:text-sm font-medium ${diet === 'standard' ? 'text-white' : 'text-gray-600'}`}>Standardowa</span>
              <span className={`text-[10px] sm:text-xs ${diet === 'standard' ? 'text-white' : 'text-gray-500'}`}>(+0zł)</span>
            </button>
            <button
              onClick={() => setDiet('vegetarian')}
              className={`w-32 h-32 sm:w-36 sm:h-36 flex flex-col items-center justify-center gap-2 transition-colors ${
                diet === 'vegetarian'
                  ? 'bg-[#03adf0] text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className={`text-xs sm:text-sm font-medium ${diet === 'vegetarian' ? 'text-white' : 'text-gray-600'}`}>Wegetariańska</span>
              <span className={`text-[10px] sm:text-xs ${diet === 'vegetarian' ? 'text-white' : 'text-gray-500'}`}>(+50zł)</span>
            </button>
          </div>
        </section>
      </div>

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
            className="w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
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
                    className="text-[#03adf0] focus:ring-[#03adf0]"
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
                    className="text-[#03adf0] focus:ring-[#03adf0]"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Nie</span>
                </label>
              </div>
              {healthQuestions.chronicDiseases === 'Tak' && (
                <textarea
                  value={healthDetails.chronicDiseases}
                  onChange={(e) => setHealthDetails({ ...healthDetails, chronicDiseases: e.target.value })}
                  placeholder="Opisz choroby przewlekłe..."
                  className="mt-3 w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] overflow-hidden"
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
                    className="text-[#03adf0] focus:ring-[#03adf0]"
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
                    className="text-[#03adf0] focus:ring-[#03adf0]"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Nie</span>
                </label>
              </div>
              {healthQuestions.dysfunctions === 'Tak' && (
                <textarea
                  value={healthDetails.dysfunctions}
                  onChange={(e) => setHealthDetails({ ...healthDetails, dysfunctions: e.target.value })}
                  placeholder="Opisz dysfunkcje..."
                  className="mt-3 w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] overflow-hidden"
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
                    className="text-[#03adf0] focus:ring-[#03adf0]"
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
                    className="text-[#03adf0] focus:ring-[#03adf0]"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Nie</span>
                </label>
              </div>
              {healthQuestions.psychiatric === 'Tak' && (
                <textarea
                  value={healthDetails.psychiatric}
                  onChange={(e) => setHealthDetails({ ...healthDetails, psychiatric: e.target.value })}
                  placeholder="Opisz problemy psychiatryczne..."
                  className="mt-3 w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] overflow-hidden"
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
                className="w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                placeholder="Wprowadź dodatkowe informacje..."
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

