'use client';

import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '@/utils/api-config';

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

interface EditReservationStep1Props {
  data: {
    parents_data: ParentData[];
    participant_first_name: string;
    participant_last_name: string;
    participant_age: string;
    participant_gender: string;
    participant_city: string;
    diet: number | null;
    accommodation_request?: string | null;
    health_questions?: {
      chronicDiseases: string;
      dysfunctions: string;
      psychiatric: string;
    };
    health_details?: {
      chronicDiseases: string;
      dysfunctions: string;
      psychiatric: string;
    };
    additional_notes?: string | null;
  };
  camp_id: number;
  property_id: number;
  onChange: (data: any) => void;
}

interface Diet {
  id: number;
  name: string;
  price: number;
}

export default function EditReservationStep1({ data, camp_id, property_id, onChange }: EditReservationStep1Props) {
  // Normalize parents_data - ensure it's an array
  const normalizeParents = (parentsData: any): ParentData[] => {
    if (!parentsData) return [];
    if (typeof parentsData === 'string') {
      try {
        return JSON.parse(parentsData);
      } catch {
        return [];
      }
    }
    if (Array.isArray(parentsData)) {
      return parentsData.map((p, idx) => ({
        id: p.id || String(idx + 1),
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        email: p.email || '',
        phone: p.phone || p.phoneNumber || '',
        phoneNumber: p.phoneNumber || p.phone || '',
        street: p.street || '',
        postalCode: p.postalCode || '',
        city: p.city || '',
      }));
    }
    return [];
  };

  const [parents, setParents] = useState<ParentData[]>(normalizeParents(data.parents_data));
  const [participantData, setParticipantData] = useState({
    firstName: data.participant_first_name || '',
    lastName: data.participant_last_name || '',
    age: data.participant_age || '',
    gender: data.participant_gender || '',
    city: data.participant_city || '',
  });
  // If diet is null, we need to find and select the default/standard diet
  const [selectedDietId, setSelectedDietId] = useState<number | null>(data.diet);
  const [accommodationRequest, setAccommodationRequest] = useState(data.accommodation_request || '');
  const [healthQuestions, setHealthQuestions] = useState({
    chronicDiseases: data.health_questions?.chronicDiseases || 'Nie',
    dysfunctions: data.health_questions?.dysfunctions || 'Nie',
    psychiatric: data.health_questions?.psychiatric || 'Nie',
  });
  const [healthDetails, setHealthDetails] = useState({
    chronicDiseases: data.health_details?.chronicDiseases || '',
    dysfunctions: data.health_details?.dysfunctions || '',
    psychiatric: data.health_details?.psychiatric || '',
  });
  const [additionalNotes, setAdditionalNotes] = useState(data.additional_notes || '');
  const [diets, setDiets] = useState<Diet[]>([]);
  const [loadingDiets, setLoadingDiets] = useState(true);

  // Fetch diets
  useEffect(() => {
    const fetchDiets = async () => {
      try {
        setLoadingDiets(true);
        const response = await fetch(`${API_BASE_URL}/api/camps/${camp_id}/properties/${property_id}/diets`);
        let dietsData: Diet[] = [];
        if (response.ok) {
          dietsData = await response.json();
          setDiets(Array.isArray(dietsData) ? dietsData : []);
        } else {
          // Fallback to public diets
          const response2 = await fetch(`${API_BASE_URL}/api/diets/public`);
          if (response2.ok) {
            const data2 = await response2.json();
            dietsData = data2.diets || [];
            setDiets(dietsData);
          }
        }
        
        // If no diet is selected (data.diet is null), find and select default/standard diet
        if (!data.diet && dietsData.length > 0) {
          // Try to find "ogólna", "standardowa", "standard", or "general" diet
          const standardDiet = dietsData.find((d: Diet) =>
            d.name?.toLowerCase().includes('ogólna') ||
            d.name?.toLowerCase().includes('ogolna') ||
            d.name?.toLowerCase().includes('standardowa') ||
            d.name?.toLowerCase().includes('standard') ||
            d.name?.toLowerCase().includes('general')
          );
          // If found, select it; otherwise use first diet
          const defaultDiet = standardDiet || dietsData[0];
          setSelectedDietId(defaultDiet.id);
        }
      } catch (err) {
        console.error('Error fetching diets:', err);
      } finally {
        setLoadingDiets(false);
      }
    };
    fetchDiets();
  }, [camp_id, property_id, data.diet]);

  // Notify parent of changes - use useRef to track previous values and only call onChange when actually changed
  const prevDataRef = useRef<any>(null);
  
  useEffect(() => {
    const newData = {
      parents_data: parents,
      participant_first_name: participantData.firstName,
      participant_last_name: participantData.lastName,
      participant_age: participantData.age,
      participant_gender: participantData.gender,
      participant_city: participantData.city,
      diet: selectedDietId,
      accommodation_request: accommodationRequest,
      health_questions: healthQuestions,
      health_details: healthDetails,
      additional_notes: additionalNotes,
    };
    
    // Only call onChange if data actually changed
    if (JSON.stringify(prevDataRef.current) !== JSON.stringify(newData)) {
      prevDataRef.current = newData;
      onChange(newData);
    }
  }, [parents, participantData, selectedDietId, accommodationRequest, healthQuestions, healthDetails, additionalNotes, onChange]);

  const addParent = () => {
    const newParent: ParentData = {
      id: Date.now().toString(),
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      phoneNumber: '',
      street: '',
      postalCode: '',
      city: '',
    };
    setParents([...parents, newParent]);
  };

  const removeParent = (id: string) => {
    if (parents.length > 1) {
      setParents(parents.filter(p => p.id !== id));
    }
  };

  const updateParent = (id: string, field: keyof ParentData, value: string) => {
    setParents(parents.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Krok 1: Dane osobowe</h2>

      {/* Opiekunowie */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Opiekunowie</h3>
          <button
            type="button"
            onClick={addParent}
            className="px-4 py-2 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-colors"
            style={{ borderRadius: 0 }}
          >
            + Dodaj opiekuna
          </button>
        </div>
        <div className="space-y-4">
          {parents.map((parent, index) => (
            <div key={parent.id} className="border border-gray-200 rounded p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-900">Opiekun {index + 1}</h4>
                {parents.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeParent(parent.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Usuń
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Imię *</label>
                  <input
                    type="text"
                    value={parent.firstName}
                    onChange={(e) => updateParent(parent.id, 'firstName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nazwisko *</label>
                  <input
                    type="text"
                    value={parent.lastName}
                    onChange={(e) => updateParent(parent.id, 'lastName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email {index === 0 ? '*' : ''}
                  </label>
                  <input
                    type="email"
                    value={parent.email}
                    onChange={(e) => updateParent(parent.id, 'email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                  <div className="flex gap-2">
                    <select
                      value={parent.phone || '+48'}
                      onChange={(e) => updateParent(parent.id, 'phone', e.target.value)}
                      className="px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      style={{ borderRadius: 0 }}
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
                      className="flex-1 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      style={{ borderRadius: 0 }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ulica</label>
                  <input
                    type="text"
                    value={parent.street}
                    onChange={(e) => updateParent(parent.id, 'street', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kod pocztowy</label>
                  <input
                    type="text"
                    value={parent.postalCode}
                    onChange={(e) => updateParent(parent.id, 'postalCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Miasto</label>
                  <input
                    type="text"
                    value={parent.city}
                    onChange={(e) => updateParent(parent.id, 'city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    style={{ borderRadius: 0 }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Uczestnik */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dane uczestnika</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Imię *</label>
            <input
              type="text"
              value={participantData.firstName}
              onChange={(e) => setParticipantData({ ...participantData, firstName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
              style={{ borderRadius: 0 }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nazwisko *</label>
            <input
              type="text"
              value={participantData.lastName}
              onChange={(e) => setParticipantData({ ...participantData, lastName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
              style={{ borderRadius: 0 }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rocznik *</label>
            <input
              type="text"
              value={participantData.age}
              onChange={(e) => setParticipantData({ ...participantData, age: e.target.value })}
              placeholder="np. 2010"
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
              style={{ borderRadius: 0 }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Płeć *</label>
            <select
              value={participantData.gender}
              onChange={(e) => setParticipantData({ ...participantData, gender: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
              style={{ borderRadius: 0 }}
            >
              <option value="">Wybierz z listy</option>
              <option value="Chłopiec">Chłopiec</option>
              <option value="Dziewczynka">Dziewczynka</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Miasto *</label>
            <input
              type="text"
              value={participantData.city}
              onChange={(e) => setParticipantData({ ...participantData, city: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
              style={{ borderRadius: 0 }}
            />
          </div>
        </div>
      </div>

      {/* Dieta */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dieta główna</h3>
        {loadingDiets ? (
          <p className="text-sm text-gray-500">Ładowanie diet...</p>
        ) : (
          <select
            value={selectedDietId || ''}
            onChange={(e) => setSelectedDietId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
            style={{ borderRadius: 0 }}
          >
            <option value="">Brak diety</option>
            {diets.map((diet) => (
              <option key={diet.id} value={diet.id}>
                {diet.name} {diet.price > 0 ? `(+${diet.price.toFixed(2)} PLN)` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Prośba o zakwaterowanie */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Prośba o zakwaterowanie</h3>
        <textarea
          value={accommodationRequest}
          onChange={(e) => setAccommodationRequest(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
          style={{ borderRadius: 0 }}
        />
      </div>

      {/* Informacje zdrowotne */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informacje zdrowotne</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Choroby przewlekłe:</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="Tak"
                  checked={healthQuestions.chronicDiseases === 'Tak'}
                  onChange={(e) => setHealthQuestions({ ...healthQuestions, chronicDiseases: e.target.value })}
                  className="w-4 h-4"
                />
                <span>Tak</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="Nie"
                  checked={healthQuestions.chronicDiseases === 'Nie'}
                  onChange={(e) => setHealthQuestions({ ...healthQuestions, chronicDiseases: e.target.value })}
                  className="w-4 h-4"
                />
                <span>Nie</span>
              </label>
            </div>
            {healthQuestions.chronicDiseases === 'Tak' && (
              <textarea
                value={healthDetails.chronicDiseases}
                onChange={(e) => setHealthDetails({ ...healthDetails, chronicDiseases: e.target.value })}
                placeholder="Opisz choroby przewlekłe..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                style={{ borderRadius: 0 }}
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dysfunkcje:</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="Tak"
                  checked={healthQuestions.dysfunctions === 'Tak'}
                  onChange={(e) => setHealthQuestions({ ...healthQuestions, dysfunctions: e.target.value })}
                  className="w-4 h-4"
                />
                <span>Tak</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="Nie"
                  checked={healthQuestions.dysfunctions === 'Nie'}
                  onChange={(e) => setHealthQuestions({ ...healthQuestions, dysfunctions: e.target.value })}
                  className="w-4 h-4"
                />
                <span>Nie</span>
              </label>
            </div>
            {healthQuestions.dysfunctions === 'Tak' && (
              <textarea
                value={healthDetails.dysfunctions}
                onChange={(e) => setHealthDetails({ ...healthDetails, dysfunctions: e.target.value })}
                placeholder="Opisz dysfunkcje..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                style={{ borderRadius: 0 }}
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Leczenie psychiatryczne/psychologiczne:</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="Tak"
                  checked={healthQuestions.psychiatric === 'Tak'}
                  onChange={(e) => setHealthQuestions({ ...healthQuestions, psychiatric: e.target.value })}
                  className="w-4 h-4"
                />
                <span>Tak</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="Nie"
                  checked={healthQuestions.psychiatric === 'Nie'}
                  onChange={(e) => setHealthQuestions({ ...healthQuestions, psychiatric: e.target.value })}
                  className="w-4 h-4"
                />
                <span>Nie</span>
              </label>
            </div>
            {healthQuestions.psychiatric === 'Tak' && (
              <textarea
                value={healthDetails.psychiatric}
                onChange={(e) => setHealthDetails({ ...healthDetails, psychiatric: e.target.value })}
                placeholder="Opisz leczenie..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                style={{ borderRadius: 0 }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Dodatkowe uwagi */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dodatkowe uwagi</h3>
        <textarea
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
          style={{ borderRadius: 0 }}
        />
      </div>
    </div>
  );
}

