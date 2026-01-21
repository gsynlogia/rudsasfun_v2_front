'use client';

import { useState, useEffect, useRef } from 'react';

interface EditReservationStep3Props {
  data: {
    wants_invoice: boolean;
    invoice_type?: string | null;
    invoice_first_name?: string | null;
    invoice_last_name?: string | null;
    invoice_email?: string | null;
    invoice_phone?: string | null;
    invoice_company_name?: string | null;
    invoice_nip?: string | null;
    invoice_street?: string | null;
    invoice_postal_code?: string | null;
    invoice_city?: string | null;
    delivery_type?: string | null;
    delivery_different_address?: boolean;
    delivery_street?: string | null;
    delivery_postal_code?: string | null;
    delivery_city?: string | null;
  };
  onChange: (data: any) => void;
}

export default function EditReservationStep3({ data, onChange }: EditReservationStep3Props) {
  const [wantsInvoice, setWantsInvoice] = useState(data.wants_invoice || false);
  const [invoiceType, setInvoiceType] = useState<'private' | 'company'>((data.invoice_type as 'private' | 'company') || 'private');
  const [privateData, setPrivateData] = useState({
    firstName: data.invoice_first_name || '',
    lastName: data.invoice_last_name || '',
    email: data.invoice_email || '',
    phone: data.invoice_phone || '',
  });
  const [companyData, setCompanyData] = useState({
    companyName: data.invoice_company_name || '',
    nip: data.invoice_nip || '',
  });
  const [invoiceAddress, setInvoiceAddress] = useState({
    street: data.invoice_street || '',
    postalCode: data.invoice_postal_code || '',
    city: data.invoice_city || '',
  });
  const [deliveryType, setDeliveryType] = useState<'electronic' | 'paper'>((data.delivery_type as 'electronic' | 'paper') || 'electronic');
  const [differentAddress, setDifferentAddress] = useState(data.delivery_different_address || false);
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: data.delivery_street || '',
    postalCode: data.delivery_postal_code || '',
    city: data.delivery_city || '',
  });

  // Notify parent of changes - use useRef to track previous values and only call onChange when actually changed
  const prevDataRef = useRef<any>(null);

  useEffect(() => {
    const newData = {
      wants_invoice: wantsInvoice,
      invoice_type: invoiceType,
      invoice_first_name: invoiceType === 'private' ? privateData.firstName : null,
      invoice_last_name: invoiceType === 'private' ? privateData.lastName : null,
      invoice_email: invoiceType === 'private' ? privateData.email : null,
      invoice_phone: invoiceType === 'private' ? privateData.phone : null,
      invoice_company_name: invoiceType === 'company' ? companyData.companyName : null,
      invoice_nip: invoiceType === 'company' ? companyData.nip : null,
      invoice_street: invoiceAddress.street,
      invoice_postal_code: invoiceAddress.postalCode,
      invoice_city: invoiceAddress.city,
      delivery_type: deliveryType,
      delivery_different_address: differentAddress,
      delivery_street: differentAddress ? deliveryAddress.street : null,
      delivery_postal_code: differentAddress ? deliveryAddress.postalCode : null,
      delivery_city: differentAddress ? deliveryAddress.city : null,
    };

    // Only call onChange if data actually changed
    if (JSON.stringify(prevDataRef.current) !== JSON.stringify(newData)) {
      prevDataRef.current = newData;
      onChange(newData);
    }
  }, [wantsInvoice, invoiceType, privateData, companyData, invoiceAddress, deliveryType, differentAddress, deliveryAddress, onChange]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Krok 3: Faktura</h2>

      {/* Czy chce fakturę */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={wantsInvoice}
            onChange={(e) => setWantsInvoice(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium text-gray-900">Chcę otrzymać fakturę</span>
        </label>
      </div>

      {wantsInvoice && (
        <>
          {/* Typ faktury */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Typ faktury</h3>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="private"
                  checked={invoiceType === 'private'}
                  onChange={(e) => setInvoiceType(e.target.value as 'private')}
                  className="w-4 h-4"
                />
                <span>Osoba prywatna</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="company"
                  checked={invoiceType === 'company'}
                  onChange={(e) => setInvoiceType(e.target.value as 'company')}
                  className="w-4 h-4"
                />
                <span>Firma</span>
              </label>
            </div>
          </div>

          {/* Dane do faktury */}
          {invoiceType === 'private' ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dane osoby prywatnej</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Imię *</label>
                  <input
                    type="text"
                    value={privateData.firstName}
                    onChange={(e) => setPrivateData({ ...privateData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nazwisko *</label>
                  <input
                    type="text"
                    value={privateData.lastName}
                    onChange={(e) => setPrivateData({ ...privateData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={privateData.email}
                    onChange={(e) => setPrivateData({ ...privateData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                  <input
                    type="tel"
                    value={privateData.phone}
                    onChange={(e) => setPrivateData({ ...privateData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    style={{ borderRadius: 0 }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dane firmy</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa firmy *</label>
                  <input
                    type="text"
                    value={companyData.companyName}
                    onChange={(e) => setCompanyData({ ...companyData, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIP *</label>
                  <input
                    type="text"
                    value={companyData.nip}
                    onChange={(e) => setCompanyData({ ...companyData, nip: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    style={{ borderRadius: 0 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Adres faktury */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Adres faktury</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ulica *</label>
                <input
                  type="text"
                  value={invoiceAddress.street}
                  onChange={(e) => setInvoiceAddress({ ...invoiceAddress, street: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  style={{ borderRadius: 0 }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kod pocztowy *</label>
                <input
                  type="text"
                  value={invoiceAddress.postalCode}
                  onChange={(e) => setInvoiceAddress({ ...invoiceAddress, postalCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  style={{ borderRadius: 0 }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Miasto *</label>
                <input
                  type="text"
                  value={invoiceAddress.city}
                  onChange={(e) => setInvoiceAddress({ ...invoiceAddress, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  style={{ borderRadius: 0 }}
                />
              </div>
            </div>
          </div>

          {/* Typ dostawy */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Typ dostawy faktury</h3>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="electronic"
                  checked={deliveryType === 'electronic'}
                  onChange={(e) => setDeliveryType(e.target.value as 'electronic')}
                  className="w-4 h-4"
                />
                <span>Elektroniczna</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="paper"
                  checked={deliveryType === 'paper'}
                  onChange={(e) => setDeliveryType(e.target.value as 'paper')}
                  className="w-4 h-4"
                />
                <span>Papierowa</span>
              </label>
            </div>
          </div>

          {/* Adres dostawy (tylko dla papierowej) */}
          {deliveryType === 'paper' && (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <label className="flex items-center gap-2 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={differentAddress}
                    onChange={(e) => setDifferentAddress(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-900">Inny adres dostawy</span>
                </label>
                {differentAddress && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ulica</label>
                      <input
                        type="text"
                        value={deliveryAddress.street}
                        onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                        style={{ borderRadius: 0 }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kod pocztowy</label>
                      <input
                        type="text"
                        value={deliveryAddress.postalCode}
                        onChange={(e) => setDeliveryAddress({ ...deliveryAddress, postalCode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                        style={{ borderRadius: 0 }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Miasto</label>
                      <input
                        type="text"
                        value={deliveryAddress.city}
                        onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                        style={{ borderRadius: 0 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}