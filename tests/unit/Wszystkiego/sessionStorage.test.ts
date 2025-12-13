/**
 * Unit tests for sessionStorage utilities
 * All tests are positive (happy path)
 * All data is locked/mocked - no database usage
 */

import {
  saveStep1FormData,
  loadStep1FormData,
  clearStep1FormData,
  saveStep2FormData,
  loadStep2FormData,
  clearStep2FormData,
  saveStep3FormData,
  loadStep3FormData,
  clearStep3FormData,
  saveStep4FormData,
  loadStep4FormData,
  clearStep4FormData,
  saveStep5FormData,
  loadStep5FormData,
  clearStep5FormData,
  saveReservationState,
  loadReservationState,
  clearReservationState,
  clearAllSessionData,
} from '@/utils/sessionStorage';
import { Step1FormData } from '@/types/step1FormData';
import { Step2FormData } from '@/types/step2FormData';
import { Step3FormData } from '@/types/step3FormData';
import { Step4FormData } from '@/types/step4FormData';
import { Step5FormData } from '@/types/step5FormData';
import { ReservationStorageState } from '@/types/reservationStorageState';

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

describe('sessionStorage Utilities - Step1FormData', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    jest.clearAllMocks();
  });

  const mockStep1Data: Step1FormData = {
    parents: [
      {
        id: 'parent1',
        firstName: 'Jan',
        lastName: 'Kowalski',
        email: 'jan.kowalski@example.com',
        phone: '+48',
        phoneNumber: '123456789',
        street: 'ul. Testowa 1',
        postalCode: '00-001',
        city: 'Warszawa',
      },
    ],
    participantData: {
      firstName: 'Anna',
      lastName: 'Kowalska',
      age: '10',
      gender: 'female',
      city: 'Warszawa',
      selectedParticipant: 'Anna Kowalska',
    },
    selectedDietId: 1,
    accommodationRequest: 'Pokój na parterze',
    healthQuestions: {
      chronicDiseases: 'Nie',
      dysfunctions: 'Nie',
      psychiatric: 'Nie',
    },
    healthDetails: {
      chronicDiseases: '',
      dysfunctions: '',
      psychiatric: '',
    },
    additionalNotes: 'Brak uwag',
  };

  test('should save Step1 form data', () => {
    saveStep1FormData(mockStep1Data);

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      'radsasfun_step1_form_data',
      JSON.stringify(mockStep1Data)
    );
  });

  test('should load Step1 form data', () => {
    sessionStorageMock.setItem('radsasfun_step1_form_data', JSON.stringify(mockStep1Data));

    const loadedData = loadStep1FormData();

    expect(loadedData).toEqual(mockStep1Data);
  });

  test('should return null when no Step1 data is stored', () => {
    const loadedData = loadStep1FormData();

    expect(loadedData).toBeNull();
  });

  test('should clear Step1 form data', () => {
    sessionStorageMock.setItem('radsasfun_step1_form_data', JSON.stringify(mockStep1Data));

    clearStep1FormData();

    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('radsasfun_step1_form_data');
    expect(loadStep1FormData()).toBeNull();
  });
});

describe('sessionStorage Utilities - Step2FormData', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    jest.clearAllMocks();
  });

  const mockStep2Data: Step2FormData = {
    selectedDiets: [1, 2],
    selectedAddons: ['addon1', 'addon2'],
    selectedProtection: ['protection1'],
    selectedProtectionIds: [1],
    selectedPromotion: 'promo1',
    promotionJustification: { reason: 'test' },
    transportData: {
      departureType: 'zbiorowy',
      departureCity: 'Warszawa',
      returnType: 'zbiorowy',
      returnCity: 'Warszawa',
      differentCities: false,
    },
    transportModalConfirmed: true,
    selectedSource: 'internet',
    inneText: '',
  };

  test('should save Step2 form data', () => {
    saveStep2FormData(mockStep2Data);

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      'radsasfun_step2_form_data',
      JSON.stringify(mockStep2Data)
    );
  });

  test('should load Step2 form data', () => {
    sessionStorageMock.setItem('radsasfun_step2_form_data', JSON.stringify(mockStep2Data));

    const loadedData = loadStep2FormData();

    expect(loadedData).toEqual(mockStep2Data);
  });

  test('should clear Step2 form data', () => {
    sessionStorageMock.setItem('radsasfun_step2_form_data', JSON.stringify(mockStep2Data));

    clearStep2FormData();

    expect(loadStep2FormData()).toBeNull();
  });
});

describe('sessionStorage Utilities - Step3FormData', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    jest.clearAllMocks();
  });

  const mockStep3Data: Step3FormData = {
    invoiceType: 'private',
    privateData: {
      firstName: 'Jan',
      lastName: 'Kowalski',
      email: 'jan@example.com',
      phone: '+48',
      street: 'ul. Testowa 1',
      postalCode: '00-001',
      city: 'Warszawa',
      nip: '',
    },
    companyData: {
      companyName: '',
      nip: '',
      street: '',
      postalCode: '',
      city: '',
    },
    deliveryType: 'electronic',
    differentAddress: false,
    deliveryAddress: {
      street: '',
      postalCode: '',
      city: '',
    },
  };

  test('should save Step3 form data', () => {
    saveStep3FormData(mockStep3Data);

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      'radsasfun_step3_form_data',
      JSON.stringify(mockStep3Data)
    );
  });

  test('should load Step3 form data', () => {
    sessionStorageMock.setItem('radsasfun_step3_form_data', JSON.stringify(mockStep3Data));

    const loadedData = loadStep3FormData();

    expect(loadedData).toEqual(mockStep3Data);
  });

  test('should clear Step3 form data', () => {
    sessionStorageMock.setItem('radsasfun_step3_form_data', JSON.stringify(mockStep3Data));

    clearStep3FormData();

    expect(loadStep3FormData()).toBeNull();
  });
});

describe('sessionStorage Utilities - Step4FormData', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    jest.clearAllMocks();
  });

  const mockStep4Data: Step4FormData = {
    selectAllConsents: true,
    consent1: true,
    consent2: true,
    consent3: true,
    consent4: true,
  };

  test('should save Step4 form data', () => {
    saveStep4FormData(mockStep4Data);

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      'radsasfun_step4_form_data',
      JSON.stringify(mockStep4Data)
    );
  });

  test('should load Step4 form data', () => {
    sessionStorageMock.setItem('radsasfun_step4_form_data', JSON.stringify(mockStep4Data));

    const loadedData = loadStep4FormData();

    expect(loadedData).toEqual(mockStep4Data);
  });

  test('should clear Step4 form data', () => {
    sessionStorageMock.setItem('radsasfun_step4_form_data', JSON.stringify(mockStep4Data));

    clearStep4FormData();

    expect(loadStep4FormData()).toBeNull();
  });
});

describe('sessionStorage Utilities - Step5FormData', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    jest.clearAllMocks();
  });

  const mockStep5Data: Step5FormData = {
    payNow: true,
    paymentMethod: 'online',
    paymentAmount: 'full',
    paymentInstallments: 'full',
  };

  test('should save Step5 form data', () => {
    saveStep5FormData(mockStep5Data);

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      'radsasfun_step5_form_data',
      JSON.stringify(mockStep5Data)
    );
  });

  test('should load Step5 form data', () => {
    sessionStorageMock.setItem('radsasfun_step5_form_data', JSON.stringify(mockStep5Data));

    const loadedData = loadStep5FormData();

    expect(loadedData).toEqual(mockStep5Data);
  });

  test('should clear Step5 form data', () => {
    sessionStorageMock.setItem('radsasfun_step5_form_data', JSON.stringify(mockStep5Data));

    clearStep5FormData();

    expect(loadStep5FormData()).toBeNull();
  });
});

describe('sessionStorage Utilities - ReservationStorageState', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    jest.clearAllMocks();
  });

  const mockReservationState: ReservationStorageState = {
    basePrice: 1000,
    items: [
      {
        id: 'item1',
        name: 'Base Camp',
        price: 1000,
        type: 'base',
      },
      {
        id: 'item2',
        name: 'Diet',
        price: 200,
        type: 'diet',
      },
    ],
    totalPrice: 1200,
    camp: {
      id: 1,
      name: 'Test Camp',
      properties: {
        period: 'lato',
        city: 'Warszawa',
        start_date: '2024-07-01',
        end_date: '2024-07-14',
      },
    },
  };

  test('should save reservation state', () => {
    saveReservationState(mockReservationState);

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      'radsasfun_reservation_state',
      JSON.stringify(mockReservationState)
    );
  });

  test('should load reservation state', () => {
    sessionStorageMock.setItem('radsasfun_reservation_state', JSON.stringify(mockReservationState));

    const loadedState = loadReservationState();

    expect(loadedState).toEqual(mockReservationState);
  });

  test('should clear reservation state', () => {
    sessionStorageMock.setItem('radsasfun_reservation_state', JSON.stringify(mockReservationState));

    clearReservationState();

    expect(loadReservationState()).toBeNull();
  });
});

describe('sessionStorage Utilities - clearAllSessionData', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    jest.clearAllMocks();
  });

  test('should clear all session data', () => {
    const mockStep1: Step1FormData = {
      parents: [],
      participantData: {
        firstName: 'Test',
        lastName: 'User',
        age: '10',
        gender: 'male',
        city: 'Warszawa',
        selectedParticipant: 'Test User',
      },
      selectedDietId: null,
      accommodationRequest: '',
      healthQuestions: {
        chronicDiseases: '',
        dysfunctions: '',
        psychiatric: '',
      },
      healthDetails: {
        chronicDiseases: '',
        dysfunctions: '',
        psychiatric: '',
      },
      additionalNotes: '',
    };

    saveStep1FormData(mockStep1);
    saveReservationState({
      basePrice: 1000,
      items: [],
      totalPrice: 1000,
    });

    clearAllSessionData();

    expect(loadStep1FormData()).toBeNull();
    expect(loadReservationState()).toBeNull();
  });
});

