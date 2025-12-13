export interface Step3FormData {
  invoiceType: 'private' | 'company';
  privateData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    postalCode: string;
    city: string;
    nip: string;
  };
  companyData: {
    companyName: string;
    nip: string;
    street: string;
    postalCode: string;
    city: string;
  };
  deliveryType: 'electronic' | 'paper';
  differentAddress: boolean;
  deliveryAddress: {
    street: string;
    postalCode: string;
    city: string;
  };
}

