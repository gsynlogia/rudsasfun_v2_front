/**
 * TDD: unit testy dla helpera shouldRetryWithForceAccept (REZ-1828 fix).
 * Pure function — testowalna bez DOM, bez window.confirm (przekazujemy mock).
 */
import { shouldRetryWithForceAccept } from '@/lib/utils/confirmForceAcceptIfNeeded';

describe('shouldRetryWithForceAccept', () => {
  describe('błąd backend o weryfikacji SMS', () => {
    it('powinien pytać i zwrócić true gdy admin klika OK', () => {
      const error = new Error('Kartę kwalifikacyjną można zaakceptować dopiero po weryfikacji kodu SMS przez klienta. Klient musi wpisać kod z SMS w modal podpisu.');
      const confirmMock = jest.fn(() => true);
      const result = shouldRetryWithForceAccept(error, confirmMock);
      expect(result).toBe(true);
      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('Klient nie wpisał kodu SMS'));
    });

    it('powinien pytać i zwrócić false gdy admin klika Anuluj', () => {
      const error = new Error('Umowę można zaakceptować dopiero po weryfikacji kodu SMS przez klienta.');
      const confirmMock = jest.fn(() => false);
      const result = shouldRetryWithForceAccept(error, confirmMock);
      expect(result).toBe(false);
      expect(confirmMock).toHaveBeenCalledTimes(1);
    });

    it('powinien wykryć obie wersje (karta i umowa)', () => {
      const cardError = new Error('Kartę kwalifikacyjną można zaakceptować dopiero po weryfikacji kodu SMS przez klienta.');
      const contractError = new Error('Umowę można zaakceptować dopiero po weryfikacji kodu SMS przez klienta.');
      const confirmMock = jest.fn(() => true);
      expect(shouldRetryWithForceAccept(cardError, confirmMock)).toBe(true);
      expect(shouldRetryWithForceAccept(contractError, confirmMock)).toBe(true);
      expect(confirmMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('inne błędy backend', () => {
    it('NIE powinien pytać ani zwrócić true dla innego błędu', () => {
      const error = new Error('Dokument nie został znaleziony');
      const confirmMock = jest.fn(() => true);
      const result = shouldRetryWithForceAccept(error, confirmMock);
      expect(result).toBe(false);
      expect(confirmMock).not.toHaveBeenCalled();
    });

    it('NIE powinien pytać dla błędu 500', () => {
      const error = new Error('Błąd podczas aktualizacji statusu dokumentu');
      const confirmMock = jest.fn(() => true);
      expect(shouldRetryWithForceAccept(error, confirmMock)).toBe(false);
      expect(confirmMock).not.toHaveBeenCalled();
    });

    it('NIE powinien pytać dla "Brak uprawnień"', () => {
      const error = new Error('Brak uprawnień do zmiany statusu dokumentu');
      const confirmMock = jest.fn(() => true);
      expect(shouldRetryWithForceAccept(error, confirmMock)).toBe(false);
      expect(confirmMock).not.toHaveBeenCalled();
    });
  });

  describe('input typu non-Error', () => {
    it('powinien zwrócić false dla null', () => {
      const confirmMock = jest.fn(() => true);
      expect(shouldRetryWithForceAccept(null, confirmMock)).toBe(false);
      expect(confirmMock).not.toHaveBeenCalled();
    });

    it('powinien zwrócić false dla undefined', () => {
      const confirmMock = jest.fn(() => true);
      expect(shouldRetryWithForceAccept(undefined, confirmMock)).toBe(false);
      expect(confirmMock).not.toHaveBeenCalled();
    });

    it('powinien zwrócić false dla string (nie Error)', () => {
      const confirmMock = jest.fn(() => true);
      expect(shouldRetryWithForceAccept('niejaki tekst', confirmMock)).toBe(false);
      expect(confirmMock).not.toHaveBeenCalled();
    });

    it('powinien zwrócić false dla object bez message', () => {
      const confirmMock = jest.fn(() => true);
      expect(shouldRetryWithForceAccept({ foo: 'bar' }, confirmMock)).toBe(false);
      expect(confirmMock).not.toHaveBeenCalled();
    });
  });

  describe('default confirmFn (window.confirm)', () => {
    it('powinien użyć window.confirm domyślnie', () => {
      const error = new Error('Kartę kwalifikacyjną można zaakceptować dopiero po weryfikacji kodu SMS przez klienta.');
      const originalConfirm = window.confirm;
      const spy = jest.fn(() => true);
      window.confirm = spy;
      try {
        const result = shouldRetryWithForceAccept(error);
        expect(result).toBe(true);
        expect(spy).toHaveBeenCalledTimes(1);
      } finally {
        window.confirm = originalConfirm;
      }
    });
  });
});
