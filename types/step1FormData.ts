export interface Step1FormData {
  parents: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneNumber: string;
    street: string;
    postalCode: string;
    city: string;
  }>;
  participantData: {
    firstName: string;
    lastName: string;
    age: string;
    gender: string;
    city: string;
    selectedParticipant: string;
  };
  selectedDietId: number | null;
  accommodationRequest: string;
  healthQuestions: {
    chronicDiseases: string;
    dysfunctions: string;
    psychiatric: string;
  };
  healthDetails: {
    chronicDiseases: string;
    dysfunctions: string;
    psychiatric: string;
  };
  additionalNotes: string;
}

