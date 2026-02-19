'use client';

import { Printer } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';

interface AuthorizationFormProps {
  reservationData?: {
    parentPhone?: string;
    reservationId?: string;
  };
  printMode?: boolean;
}

export function AuthorizationForm({ reservationData, printMode = false }: AuthorizationFormProps) {
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureCode, setSignatureCode] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [showResponsibilityError, setShowResponsibilityError] = useState(false);

  // Automatyczny druk w trybie printMode
  useEffect(() => {
    if (printMode) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printMode]);

  // Aktualna data i godzina
  const getCurrentDateTime = () => {
    const now = new Date();
    const date = now.toLocaleDateString('pl-PL');
    const time = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    return `${date}, ${time}`;
  };

  const [formData, setFormData] = useState({
    authorizations: [{
      fullName: '',
      documentType: 'dowód osobisty' as const,
      documentNumber: '',
      canPickup: false,
      canTemporaryPickup: false,
    }],
    independentReturn: false,
    acceptsResponsibility: false,
    parentPhone: reservationData?.parentPhone || '+48 724680812',
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAuthorizationChange = (index: number, field: string, value: any) => {
    const newAuthorizations = [...formData.authorizations];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      newAuthorizations[index] = {
        ...newAuthorizations[index],
        [parent]: {
          ...(newAuthorizations[index] as any)[parent],
          [child]: value,
        },
      };
    } else {
      newAuthorizations[index] = {
        ...newAuthorizations[index],
        [field]: value,
      };
    }
    setFormData(prev => ({ ...prev, authorizations: newAuthorizations }));
  };

  const addNewAuthorization = () => {
    setFormData(prev => ({
      ...prev,
      authorizations: [
        ...prev.authorizations,
        {
          fullName: '',
          documentType: 'dowód osobisty' as const,
          documentNumber: '',
          canPickup: false,
          canTemporaryPickup: false,
        },
      ],
    }));
  };

  const removeAuthorization = (index: number) => {
    if (index === 0) return; // Nie można usunąć pierwszej osoby
    setFormData(prev => ({
      ...prev,
      authorizations: prev.authorizations.filter((_, i) => i !== index),
    }));
  };

  const handlePrint = () => {
    if (printMode) {
      window.print();
    } else {
      // Otwórz stronę druku w nowym oknie
      const reservationId = reservationData?.reservationId || '';
      window.open(`/druk/upowaznienia/${reservationId}`, '_blank');
    }
  };

  const handleSignDocument = () => {
    // Sprawdź czy zaznaczono checkbox z odpowiedzialnością
    if (!formData.acceptsResponsibility) {
      setShowResponsibilityError(true);
      // Przewiń do sekcji z deklaracją odpowiedzialności
      const responsibilitySection = document.querySelector('.declaration-box');
      if (responsibilitySection) {
        responsibilitySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Jeśli wszystko OK, otwórz modal
    setShowResponsibilityError(false);
    setShowSignatureModal(true);
  };

  const handleResendCode = () => {
    alert('Kod został wysłany ponownie');
    setResendTimer(60);
  };

  const handleConfirmSignature = () => {
    if (signatureCode.length === 4) {
      setIsSigned(true);
      setShowSignatureModal(false);
      setSignatureCode('');
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  return (
    <>
      {/* Przycisk druku - ukryty przy druku i w printMode */}
      {!printMode && (
        <div className="no-print max-w-[210mm] mx-auto px-4 pt-4 flex justify-end">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#03adf0] text-white px-4 py-2 rounded hover:bg-[#0299d6] transition text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            Drukuj
          </button>
        </div>
      )}

      {/* Formularz - strona A4 */}
      <div className="form-container">
        <div className="page">
          {/* Nagłówek */}
          <div className="header">
            <div className="date">{getCurrentDateTime()}</div>
            <div className="title-center">Upoważnienia - LATO 2026</div>
            <Image src="/logo.png" alt="RADSAS fun" width={85} height={45} className="logo" />
          </div>

          <h1 className="main-title">UPOWAŻNIENIA</h1>

          {/* Sekcja upoważnień */}
          <section className="section">
            {formData.authorizations.map((auth, index) => (
              <div key={index} className="authorization-card">
                <div className="auth-header">
                  <span>Osoba upoważniona #{index + 1}</span>
                  {index > 0 && (
                    <button
                      onClick={() => removeAuthorization(index)}
                      className="remove-button no-print"
                      title="Usuń osobę upoważnioną"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Imię i nazwisko - w jednym rzędzie */}
                <div className="field-row-inline">
                  <span className="label-inline">Upoważniam (imię i nazwisko)</span>
                  <input
                    type="text"
                    value={auth.fullName}
                    onChange={(e) => handleAuthorizationChange(index, 'fullName', e.target.value)}
                    className={`input-inline-full ${!isSigned ? 'editable-field' : ''}`}
                    placeholder="Jan Kowalski"
                  />
                </div>

                {/* Dokument - w jednym rzędzie */}
                <div className="field-row">
                  <div className="field-inline">
                    <label>Legitymującą/ego się dokumentem</label>
                    <select
                      value={auth.documentType}
                      onChange={(e) => handleAuthorizationChange(index, 'documentType', e.target.value)}
                      className={`select-field ${!isSigned ? 'editable-field' : ''}`}
                    >
                      <option value="dowód osobisty">Dowód osobisty</option>
                      <option value="paszport">Paszport</option>
                    </select>
                  </div>
                  <div className="field-inline">
                    <label>Numer dokumentu</label>
                    <input
                      type="text"
                      value={auth.documentNumber}
                      onChange={(e) => handleAuthorizationChange(index, 'documentNumber', e.target.value)}
                      className={`input-line ${!isSigned ? 'editable-field' : ''}`}
                      placeholder="ABC123456"
                    />
                  </div>
                </div>

                {/* Do czego upoważniamy */}
                <div className="field-group">
                  <label className="section-label">Do czego upoważniam:</label>

                  <div className="checkbox-container">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={auth.canPickup}
                        onChange={(e) => handleAuthorizationChange(index, 'canPickup', e.target.checked)}
                      />
                      Do odbioru dziecka z obozu: ośrodka i/lub miejsca zbiórki transportu zbiorowego
                    </label>

                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={auth.canTemporaryPickup}
                        onChange={(e) => handleAuthorizationChange(index, 'canTemporaryPickup', e.target.checked)}
                      />
                      Odwiedzin dziecka i/lub zabrania go poza teren ośrodka na określony czas, w trakcie trwania obozu
                    </label>
                  </div>
                </div>
              </div>
            ))}

            {/* Prosty checkbox dodawania kolejnej osoby */}
            <div className="simple-action">
              <label className="simple-action-label">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      addNewAuthorization();
                      e.target.checked = false; // Reset checkbox
                    }
                  }}
                />
                <span className="simple-action-text">Upoważniam kolejną osobę</span>
              </label>
            </div>

            {/* Wyeksponowany checkbox samodzielnego powrotu */}
            <div className="consent-box">
              <label className="consent-label">
                <input
                  type="checkbox"
                  checked={formData.independentReturn}
                  onChange={(e) => handleChange('independentReturn', e.target.checked)}
                />
                <span className="consent-text">Wyrażam zgodę na samodzielny powrót dziecka do domu z miejsca zbiórki transportu zbiorowego</span>
              </label>
            </div>

            {/* Informacja o odpowiedzialności */}
            <div className={`declaration-box ${showResponsibilityError ? 'declaration-error' : ''}`}>
              <label className="declaration-checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.acceptsResponsibility}
                  onChange={(e) => {
                    handleChange('acceptsResponsibility', e.target.checked);
                    if (e.target.checked) {
                      setShowResponsibilityError(false);
                    }
                  }}
                />
                <p className="declaration-text">
                  Biorę pełną odpowiedzialność za niniejsze upoważnienie.
                </p>
              </label>
            </div>
            {showResponsibilityError && (
              <div className="error-message">
                ⚠️ Musisz potwierdzić świadomość wzięcia odpowiedzialności przed podpisaniem dokumentu.
              </div>
            )}
          </section>

          {/* Podpis */}
          <section className="section">
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
              {isSigned ? (
                <div className="signed-confirmation">
                  <div className="signed-header">Dokument podpisany przez:</div>
                  <div className="signed-role">Opiekun prawny</div>
                  <div className="signed-timestamp">{getCurrentDateTime()}</div>
                </div>
              ) : (
                <button
                  onClick={handleSignDocument}
                  className="sign-button no-print"
                >
                  PODPISZ DOKUMENT
                </button>
              )}
            </div>
          </section>

          <div className="page-number">1/1</div>
        </div>
      </div>

      {/* Modal do potwierdzenia podpisu */}
      {showSignatureModal && (
        <div className="modal-overlay no-print" onClick={() => setShowSignatureModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Potwierdzenie</h3>
            <p className="modal-text">
              Na podany w rezerwacji numer telefonu <strong>{formData.parentPhone}</strong>, przesłany został 4 cyfrowy kod.
              Wpisanie kodu jest jednoznaczne z podpisaniem niniejszego dokumentu.
            </p>
            <div className="modal-input-group">
              <label>Kod autoryzacyjny</label>
              <input
                type="text"
                maxLength={4}
                value={signatureCode}
                onChange={(e) => setSignatureCode(e.target.value.replace(/\D/g, ''))}
                placeholder="_ _ _ _"
                className="modal-input"
              />
            </div>
            <div className="modal-buttons">
              <button
                onClick={() => setShowSignatureModal(false)}
                className="modal-button modal-button-cancel"
              >
                Anuluj
              </button>
              <button
                onClick={handleResendCode}
                className="modal-button modal-button-resend"
                disabled={resendTimer > 0}
              >
                {resendTimer > 0 ? `Ponownie za ${resendTimer}s` : 'Wyślij ponownie kod'}
              </button>
              <button
                onClick={handleConfirmSignature}
                className="modal-button modal-button-confirm"
                disabled={signatureCode.length !== 4}
              >
                Potwierdź
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          .form-container {
            width: 100%;
          }
          
          .page {
            page-break-after: always;
            page-break-inside: avoid;
          }

          input, textarea, select {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }

        @media screen {
          .form-container {
            max-width: 210mm;
            margin: 2rem auto;
            background: #f5f5f5;
          }
          
          .page {
            background: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            margin-bottom: 2rem;
            border-radius: 4px;
          }
        }

        .page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm 20mm;
          box-sizing: border-box;
          position: relative;
          font-size: 9pt;
          line-height: 1.3;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1a1a1a;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
          gap: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #0066cc;
        }

        .date {
          font-size: 8pt;
          flex-shrink: 0;
          color: #666;
        }

        .title-center {
          text-align: center;
          font-size: 10pt;
          flex: 1;
          font-weight: 600;
          color: #0066cc;
        }

        .logo {
          width: 85px;
          height: auto;
          flex-shrink: 0;
        }

        .main-title {
          text-align: center;
          font-size: 13pt;
          font-weight: 700;
          margin: 1rem 0;
          padding: 0.6rem;
          background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
          color: white;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }

        .section {
          margin: 1rem 0;
        }

        .authorization-card {
          border: 1.5px solid #ddd;
          border-radius: 4px;
          padding: 0.75rem;
          margin-bottom: 0.75rem;
          background: #f9f9f9;
        }

        .auth-header {
          font-size: 9pt;
          font-weight: 600;
          color: #0066cc;
          margin-bottom: 0.5rem;
          padding-bottom: 0.3rem;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .remove-button {
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 4px;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 14pt;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          padding: 0;
        }

        .remove-button:hover {
          background: #cc0000;
          transform: scale(1.1);
        }

        .field-row-inline {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .label-inline {
          font-size: 9pt;
          color: #333;
          font-weight: 500;
          white-space: nowrap;
        }

        .input-inline-full {
          flex: 1;
          padding: 0.3rem 0.4rem;
          border: none;
          border-bottom: 1px solid #b0b0b0;
          font-size: 9pt;
          background: transparent;
          transition: border-color 0.2s;
          font-family: inherit;
        }

        .input-inline-full:focus {
          outline: none;
          border-bottom-color: #0066cc;
          background: #f8faff;
        }

        .field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .field-inline {
          display: flex;
          flex-direction: column;
        }

        .field-inline label {
          font-size: 7.5pt;
          color: #666;
          margin-bottom: 0.2rem;
          font-weight: 500;
        }

        .input-line {
          padding: 0.3rem 0.4rem;
          border: none;
          border-bottom: 1px solid #b0b0b0;
          font-size: 9pt;
          background: transparent;
          transition: border-color 0.2s;
          font-family: inherit;
        }

        .input-line:focus {
          outline: none;
          border-bottom-color: #0066cc;
          background: #f8faff;
        }

        /* Edytowalne pola - pastelowy żółty kolor przed podpisaniem */
        .editable-field {
          background: #fef9c3 !important;
        }

        .select-field {
          padding: 0.3rem 0.4rem;
          border: none;
          border-bottom: 1px solid #b0b0b0;
          font-size: 9pt;
          background: transparent;
          transition: border-color 0.2s;
          font-family: inherit;
          cursor: pointer;
        }

        .select-field:focus {
          outline: none;
          border-bottom-color: #0066cc;
          background: #f8faff;
        }

        .field-group {
          margin: 0.5rem 0;
        }

        .field-group label {
          font-size: 8pt;
          display: block;
          margin-bottom: 0.3rem;
          color: #555;
          font-weight: 500;
        }

        .section-label {
          font-size: 8.5pt;
          margin-bottom: 0.4rem;
          color: #333;
          font-weight: 600;
          display: block;
        }

        .checkbox-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.5rem;
          background: #fff;
          border-radius: 3px;
          border: 1px solid #e0e0e0;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 9pt;
          cursor: pointer;
          transition: color 0.2s;
        }

        .checkbox-label:hover {
          color: #0066cc;
        }

        .checkbox-label input[type="checkbox"] {
          width: 15px;
          height: 15px;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background: white;
          border: 2px solid #0066cc;
          border-radius: 2px;
          position: relative;
          transition: all 0.2s;
        }

        .checkbox-label input[type="checkbox"]:hover {
          border-color: #0052a3;
          box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
        }

        .checkbox-label input[type="checkbox"]:checked {
          background: white;
          border-color: #0066cc;
        }

        .checkbox-label input[type="checkbox"]:checked::after {
          content: '';
          position: absolute;
          left: 2px;
          top: -1px;
          width: 6px;
          height: 10px;
          border: solid #0066cc;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .simple-action {
          margin: 1rem 0;
          padding: 0.5rem;
          background: #f8f8f8;
          border-radius: 4px;
        }

        .simple-action-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: color 0.2s;
        }

        .simple-action-label:hover {
          color: #0066cc;
        }

        .simple-action-label input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background: white;
          border: 2px solid #0066cc;
          border-radius: 2px;
          position: relative;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .simple-action-label input[type="checkbox"]:hover {
          border-color: #0052a3;
          box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
        }

        .simple-action-label input[type="checkbox"]:checked {
          background: white;
          border-color: #0066cc;
        }

        .simple-action-label input[type="checkbox"]:checked::after {
          content: '';
          position: absolute;
          left: 3px;
          top: 0px;
          width: 5px;
          height: 9px;
          border: solid #0066cc;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .simple-action-text {
          font-size: 9pt;
          font-weight: 500;
          color: #333;
        }

        .consent-box {
          margin: 1rem 0;
          padding: 0.75rem;
          background: #fff5f5;
          border-radius: 4px;
          border: 1.5px solid #ffb3b3;
        }

        .consent-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: color 0.2s;
        }

        .consent-label:hover {
          color: #0066cc;
        }

        .consent-label input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background: white;
          border: 2px solid #0066cc;
          border-radius: 2px;
          position: relative;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .consent-label input[type="checkbox"]:hover {
          border-color: #0052a3;
          box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
        }

        .consent-label input[type="checkbox"]:checked {
          background: white;
          border-color: #0066cc;
        }

        .consent-label input[type="checkbox"]:checked::after {
          content: '';
          position: absolute;
          left: 3px;
          top: 0px;
          width: 5px;
          height: 9px;
          border: solid #0066cc;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .consent-text {
          font-size: 9pt;
          font-weight: 500;
          color: #333;
        }

        .declaration-box {
          border: 2px solid #0066cc;
          padding: 0.75rem;
          margin: 0.75rem 0;
          background: #f8faff;
          border-radius: 4px;
        }

        .declaration-error {
          border: 2px solid #c00 !important;
          background: #fff5f5 !important;
          animation: shake 0.5s;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .declaration-checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          cursor: pointer;
        }

        .declaration-checkbox-label input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background: white;
          border: 2.5px solid #0066cc;
          border-radius: 3px;
          position: relative;
          transition: all 0.2s;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .declaration-checkbox-label input[type="checkbox"]:hover {
          border-color: #0052a3;
          box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.15);
        }

        .declaration-checkbox-label input[type="checkbox"]:checked {
          background: #0066cc;
          border-color: #0066cc;
        }

        .declaration-checkbox-label input[type="checkbox"]:checked::after {
          content: '';
          position: absolute;
          left: 5px;
          top: 1px;
          width: 6px;
          height: 11px;
          border: solid white;
          border-width: 0 2.5px 2.5px 0;
          transform: rotate(45deg);
        }

        .declaration-text {
          font-size: 9pt;
          font-weight: 700;
          margin: 0;
          color: #0066cc;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          line-height: 1.3;
          text-align: left;
        }

        .error-message {
          background: #fff5f5;
          color: #c00;
          padding: 0.75rem;
          border-radius: 4px;
          border-left: 3px solid #c00;
          font-size: 9pt;
          font-weight: 600;
          margin: 0.5rem 0;
          animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .signed-confirmation {
          background: #d4edda;
          color: #155724;
          padding: 0.6rem 1.2rem;
          border-radius: 4px;
          font-size: 9pt;
          font-weight: 600;
          display: inline-block;
          text-align: left;
        }

        .signed-header {
          font-weight: 700;
          font-size: 9pt;
          color: #0066cc;
          margin-bottom: 0.3rem;
        }

        .signed-role {
          font-weight: 600;
          font-size: 10pt;
          color: #0052a3;
          margin: 0.3rem 0;
        }

        .signed-timestamp {
          font-weight: 400;
          font-size: 8pt;
          color: #666;
        }

        .sign-button {
          background: #0066cc;
          color: white;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
          font-size: 10pt;
          font-weight: 600;
        }

        .sign-button:hover {
          background: #0052a3;
        }

        .page-number {
          position: absolute;
          bottom: 10mm;
          right: 20mm;
          font-size: 8pt;
          font-weight: 600;
          color: #333;
          padding: 0.2rem 0.5rem;
          background: #f0f0f0;
          border-radius: 3px;
        }

        @media (max-width: 768px) {
          .page {
            width: 100%;
            min-height: auto;
            padding: 10mm;
          }

          .header {
            flex-direction: column;
            align-items: center;
          }

          .logo {
            width: 75px;
          }

          .field-row {
            grid-template-columns: 1fr;
          }
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .modal-content {
          background: white;
          padding: 2rem 1.5rem;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          width: 400px;
          max-width: 90%;
          text-align: center;
          animation: slideUp 0.3s ease-out;
        }

        .modal-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #0066cc;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .modal-title::before {
          content: '🔒';
          font-size: 1.5rem;
        }

        .modal-text {
          font-size: 0.95rem;
          color: #555;
          margin-bottom: 1.5rem;
          line-height: 1.6;
          text-align: left;
        }

        .modal-text strong {
          color: #0066cc;
          font-weight: 600;
        }

        .modal-input-group {
          margin-bottom: 1.5rem;
        }

        .modal-input-group label {
          font-size: 0.9rem;
          color: #333;
          margin-bottom: 0.5rem;
          display: block;
          font-weight: 600;
        }

        .modal-input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1.5rem;
          text-align: center;
          font-family: monospace;
          letter-spacing: 0.5rem;
          transition: all 0.3s;
          background: #f8f9fa;
        }

        .modal-input:focus {
          outline: none;
          border-color: #0066cc;
          background: white;
          box-shadow: 0 0 0 4px rgba(0, 102, 204, 0.1);
        }

        .modal-buttons {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .modal-button {
          padding: 0.75rem 1.25rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 600;
          font-size: 0.9rem;
          min-width: 110px;
        }

        .modal-button-cancel {
          background: #f0f0f0;
          color: #666;
        }

        .modal-button-cancel:hover {
          background: #e0e0e0;
          color: #333;
        }

        .modal-button-resend {
          background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(0, 102, 204, 0.3);
        }

        .modal-button-resend:hover {
          background: linear-gradient(135deg, #0052a3 0%, #004080 100%);
          box-shadow: 0 4px 12px rgba(0, 102, 204, 0.4);
          transform: translateY(-2px);
        }

        .modal-button-resend:disabled {
          background: #ccc;
          color: #666;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        .modal-button-confirm {
          background: linear-gradient(135deg, #28a745 0%, #218838 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
        }

        .modal-button-confirm:hover {
          background: linear-gradient(135deg, #218838 0%, #1e7e34 100%);
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
          transform: translateY(-2px);
        }

        .modal-button-confirm:disabled {
          background: #ccc;
          color: #666;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }
      `}</style>
    </>
  );
}