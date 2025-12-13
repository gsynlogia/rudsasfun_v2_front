export interface Step2FormData {
  selectedDiets?: number[];
  selectedAddons: string[];
  selectedProtection: string[];
  selectedProtectionIds?: number[];
  selectedPromotion: string;
  promotionJustification?: Record<string, any>;
  transportData: {
    departureType: string;
    departureCity: string;
    returnType: string;
    returnCity: string;
    differentCities?: boolean;
  };
  transportModalConfirmed?: boolean;
  selectedSource: string;
  inneText: string;
}

