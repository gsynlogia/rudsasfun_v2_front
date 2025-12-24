'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import DashedLine from './DashedLine';

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

export default function ReservationForm() {
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
    // Maksymalnie 2 opiekunów: pierwszy obowiązkowy, drugi opcjonalny
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
      parents.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const [participantData, setParticipantData] = useState({
    firstName: 'Imię',
    lastName: 'Nazwisko',
    age: '',
    gender: '',
    city: 'Miejscowość',
  });

  const [diet, setDiet] = useState<'standard' | 'vegetarian' | null>(null);
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
                    className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Usuń
                  </button>
                )}
              </div>
            )}
            <section className="bg-white rounded-xl p-4 sm:p-6  relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Imię <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={parent.firstName}
                    onChange={(e) => updateParent(parent.id, 'firstName', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Nazwisko <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={parent.lastName}
                    onChange={(e) => updateParent(parent.id, 'lastName', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Adres e-mail <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={parent.email}
                    onChange={(e) => updateParent(parent.id, 'email', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Numer telefonu <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={parent.phone}
                      onChange={(e) => updateParent(parent.id, 'phone', e.target.value)}
                      className="px-3 pr-8 py-2 border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
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
                      type="tel"
                      value={parent.phoneNumber}
                      onChange={(e) => updateParent(parent.id, 'phoneNumber', e.target.value)}
                      placeholder="111 222 333"
                      className="flex-1 px-4 py-2 border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Ulica i numer <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={parent.street}
                    onChange={(e) => updateParent(parent.id, 'street', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Kod pocztowy <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={parent.postalCode}
                    onChange={(e) => updateParent(parent.id, 'postalCode', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Miejscowość <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={parent.city}
                    onChange={(e) => updateParent(parent.id, 'city', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                  />
                </div>
              </div>
              {/* Przycisk "Dodaj opiekuna" w prawym dolnym rogu - tylko gdy jest jeden opiekun (maksymalnie 2 opiekunów) */}
              {index === parents.length - 1 && parents.length < 2 && (
                <div className="flex justify-end mt-4 sm:mt-6">
                  <button
                    onClick={addParent}
                    className="flex items-center gap-2 text-[#03adf0] hover:text-[#0288c7] transition-colors text-sm sm:text-base font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Dodaj opiekuna
                  </button>
                </div>
              )}
            </section>
          </div>
        ))}
      </div>

      {/* Dane uczestnika */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">Dane uczestnika</h2>
        <section className="bg-white rounded-xl p-4 sm:p-6 ">
          <div className="mb-3 sm:mb-4 flex justify-center items-center gap-2 sm:gap-3">
          <div className="flex items-center">
            <Image
              src="/child_pictures.svg"
              alt="Child icon"
              width={40}
              height={33}
              className="w-8 h-8 sm:w-10 sm:h-10"
            />
          </div>
          <select className="w-2/3 px-3 sm:px-4 pr-8 sm:pr-10 py-2 text-sm sm:text-base border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent">
            <option>Wybierz z listy</option>
            <option>Dodaj nowego uczestnika</option>
          </select>
        </div>
        <DashedLine />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Imię uczestnika
            </label>
            <input
              type="text"
              value={participantData.firstName}
              onChange={(e) => setParticipantData({ ...participantData, firstName: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Nazwisko uczestnika
            </label>
            <input
              type="text"
              value={participantData.lastName}
              onChange={(e) => setParticipantData({ ...participantData, lastName: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Wiek</label>
            <select
              value={participantData.age}
              onChange={(e) => setParticipantData({ ...participantData, age: e.target.value })}
              className="w-full px-3 sm:px-4 pr-8 sm:pr-10 py-2 text-sm sm:text-base border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
            >
              <option>Wybierz z listy</option>
              <option>7</option>
              <option>8</option>
              <option>9</option>
              <option>10</option>
              <option>11</option>
              <option>12</option>
              <option>13</option>
              <option>14</option>
              <option>15</option>
              <option>16</option>
              <option>17</option>
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Płeć</label>
            <select
              value={participantData.gender}
              onChange={(e) => setParticipantData({ ...participantData, gender: e.target.value })}
              className="w-full px-3 sm:px-4 pr-8 sm:pr-10 py-2 text-sm sm:text-base border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
            >
              <option>Wybierz z listy</option>
              <option>Chłopiec</option>
              <option>Dziewczynka</option>
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Miejsce zamieszkania (miasto) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={participantData.city}
              onChange={(e) => setParticipantData({ ...participantData, city: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
            />
          </div>
          </div>
        </section>
      </div>

      {/* Dieta uczestnika */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">Dieta uczestnika</h2>
        <section className="bg-white rounded-xl p-4 sm:p-6 ">
          <div className="flex gap-3 sm:gap-4">
          <button
            onClick={() => setDiet('standard')}
            className={`w-32 h-32 sm:w-36 sm:h-36 p-4 sm:p-6 transition-all flex flex-col items-center justify-center ${
              diet === 'standard'
                ? 'bg-[#03adf0] text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 mb-2 sm:mb-3 flex items-center justify-center">
              <svg className={`w-8 h-8 sm:w-12 sm:h-12 ${diet === 'standard' ? 'text-white' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <span className={`font-medium text-sm sm:text-base ${diet === 'standard' ? 'text-white' : 'text-gray-600'}`}>Standardowa</span>
            <span className={`text-xs sm:text-sm ${diet === 'standard' ? 'text-white' : 'text-gray-500'}`}>(+0zł)</span>
          </button>
          <button
            onClick={() => setDiet('vegetarian')}
            className={`w-32 h-32 sm:w-36 sm:h-36 p-4 sm:p-6 transition-all flex flex-col items-center justify-center ${
              diet === 'vegetarian'
                ? 'bg-[#03adf0] text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 mb-2 sm:mb-3 flex items-center justify-center">
              <svg className={`w-8 h-8 sm:w-12 sm:h-12 ${diet === 'vegetarian' ? 'text-white' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className={`font-medium text-sm sm:text-base ${diet === 'vegetarian' ? 'text-white' : 'text-gray-600'}`}>Wegetariańska</span>
            <span className={`text-xs sm:text-sm ${diet === 'vegetarian' ? 'text-white' : 'text-gray-500'}`}>(+50zł)</span>
          </button>
          </div>
        </section>
      </div>

      {/* Wniosek o zakwaterowanie */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
          Wniosek o zakwaterowanie uczestnika
        </h2>
        <section className="bg-white rounded-xl p-4 sm:p-6 ">
          <textarea
          placeholder="Uzupełnij to pole, jeśli występują specjalne prośby o zakwaterowanie, np. z rodzeństwem lub znajomym/znajomymi (wpisz imię i nazwisko)"
          className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent min-h-[100px] sm:min-h-[120px] resize-y"
        />
        </section>
      </div>

      {/* Stan zdrowia */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
          Stan zdrowia (choroby/dysfunkcje) uczestnika
        </h2>
        <section className="bg-white rounded-xl p-4 sm:p-6 ">
          <div className="space-y-3 sm:space-y-4 mb-3 sm:mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs sm:text-sm font-bold text-gray-900">
                Czy dziecko/uczestnik choruje na choroby przewlekłe?
              </label>
              <button className="text-[#03adf0] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'transparent' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4"/>
                  <path d="M12 8h.01"/>
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="chronicDiseases"
                  value="Tak"
                  checked={healthQuestions.chronicDiseases === 'Tak'}
                  onChange={(e) => setHealthQuestions({ ...healthQuestions, chronicDiseases: e.target.value })}
                  className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0]"
                />
                <span className="text-gray-700">Tak</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="chronicDiseases"
                  value="Nie"
                  checked={healthQuestions.chronicDiseases === 'Nie'}
                  onChange={(e) => setHealthQuestions({ ...healthQuestions, chronicDiseases: e.target.value })}
                  className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0]"
                />
                <span className="text-gray-700">Nie</span>
              </label>
            </div>
            {/* Animated textarea for chronic diseases */}
            <div
              className={`overflow-hidden transition-all duration-500 ease-out ${
                healthQuestions.chronicDiseases === 'Tak'
                  ? 'max-h-[200px] opacity-100 mt-3'
                  : 'max-h-0 opacity-0 mt-0'
              }`}
            >
              <div
                className={`transition-all duration-500 ease-out ${
                  healthQuestions.chronicDiseases === 'Tak'
                    ? 'w-full opacity-100'
                    : 'w-0 opacity-0'
                }`}
                style={{
                  transformOrigin: 'left',
                }}
              >
                <textarea
                  value={healthDetails.chronicDiseases}
                  onChange={(e) => setHealthDetails({ ...healthDetails, chronicDiseases: e.target.value })}
                  placeholder="Opisz choroby przewlekłe dziecka/uczestnika..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent min-h-[80px] sm:min-h-[100px] resize-y"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs sm:text-sm font-bold text-gray-900">
                Czy dziecko/uczestnik posiada jakieś dysfunkcje?
              </label>
              <button className="text-[#03adf0] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'transparent' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4"/>
                  <path d="M12 8h.01"/>
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dysfunctions"
                  value="Tak"
                  checked={healthQuestions.dysfunctions === 'Tak'}
                  onChange={(e) => setHealthQuestions({ ...healthQuestions, dysfunctions: e.target.value })}
                  className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0]"
                />
                <span className="text-gray-700">Tak</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dysfunctions"
                  value="Nie"
                  checked={healthQuestions.dysfunctions === 'Nie'}
                  onChange={(e) => setHealthQuestions({ ...healthQuestions, dysfunctions: e.target.value })}
                  className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0]"
                />
                <span className="text-gray-700">Nie</span>
              </label>
            </div>
            {/* Animated textarea for dysfunctions */}
            <div
              className={`overflow-hidden transition-all duration-500 ease-out ${
                healthQuestions.dysfunctions === 'Tak'
                  ? 'max-h-[200px] opacity-100 mt-3'
                  : 'max-h-0 opacity-0 mt-0'
              }`}
            >
              <div
                className={`transition-all duration-500 ease-out ${
                  healthQuestions.dysfunctions === 'Tak'
                    ? 'w-full opacity-100'
                    : 'w-0 opacity-0'
                }`}
                style={{
                  transformOrigin: 'left',
                }}
              >
                <textarea
                  value={healthDetails.dysfunctions}
                  onChange={(e) => setHealthDetails({ ...healthDetails, dysfunctions: e.target.value })}
                  placeholder="Opisz dysfunkcje dziecka/uczestnika..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent min-h-[80px] sm:min-h-[100px] resize-y"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs sm:text-sm font-bold text-gray-900">
                Czy dziecko/uczestnik leczy bądź leczyło się psychiatrycznie?
              </label>
              <button className="text-[#03adf0] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'transparent' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4"/>
                  <path d="M12 8h.01"/>
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="psychiatric"
                  value="Tak"
                  checked={healthQuestions.psychiatric === 'Tak'}
                  onChange={(e) => setHealthQuestions({ ...healthQuestions, psychiatric: e.target.value })}
                  className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0]"
                />
                <span className="text-gray-700">Tak</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="psychiatric"
                  value="Nie"
                  checked={healthQuestions.psychiatric === 'Nie'}
                  onChange={(e) => setHealthQuestions({ ...healthQuestions, psychiatric: e.target.value })}
                  className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0]"
                />
                <span className="text-gray-700">Nie</span>
              </label>
            </div>
            {/* Animated textarea for psychiatric treatment */}
            <div
              className={`overflow-hidden transition-all duration-500 ease-out ${
                healthQuestions.psychiatric === 'Tak'
                  ? 'max-h-[200px] opacity-100 mt-3'
                  : 'max-h-0 opacity-0 mt-0'
              }`}
            >
              <div
                className={`transition-all duration-500 ease-out ${
                  healthQuestions.psychiatric === 'Tak'
                    ? 'w-full opacity-100'
                    : 'w-0 opacity-0'
                }`}
                style={{
                  transformOrigin: 'left',
                }}
              >
                <textarea
                  value={healthDetails.psychiatric}
                  onChange={(e) => setHealthDetails({ ...healthDetails, psychiatric: e.target.value })}
                  placeholder="Opisz leczenie psychiatryczne dziecka/uczestnika..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent min-h-[80px] sm:min-h-[100px] resize-y"
                />
              </div>
            </div>
          </div>
        </div>

          <DashedLine />
          <div className="p-3 sm:p-4 mb-3 sm:mb-4">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#D62828] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-xs sm:text-sm text-gray-700">
                <p className="font-bold mb-1 text-gray-900">Uwaga!</p>
                <p>
                  Z uwagi na brak możliwości zapewnienia pełnej opieki osobom z zaburzeniami ze spektrum autyzmu (Autyzm, Zespół Aspergera, Zespół Retta, Zespół Hellera, Zespół Tourette'a) oraz chorobą autoimmunologiczną - Celiakia, nie przyjmujemy uczestników z tymi schorzeniami.
                </p>
              </div>
            </div>
          </div>
          <DashedLine />
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Informacje dodatkowe / Uwagi
            </label>
            <textarea
              placeholder="Jeśli wybrałeś 'Tak', wpisz nazwę choroby lub dysfunkcji. Jeśli występują, opisz również inne problemy zdrowotne takie jak choroba lokomocyjna, wada wzroku itp."
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent min-h-[80px] sm:min-h-[100px] resize-y"
            />
          </div>
        </section>
      </div>

      {/* Przycisk przejścia */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 pt-3 sm:pt-4">
        <Link href="#" className="text-gray-600 hover:text-[#03adf0] text-xs sm:text-sm text-center sm:text-left">
          &lt; wróć
        </Link>
        <button className="bg-[#03adf0] text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-medium hover:bg-[#0288c7] transition-colors flex items-center justify-center gap-2 text-sm sm:text-base">
          przejdź dalej
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

