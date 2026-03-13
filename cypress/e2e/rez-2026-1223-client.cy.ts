/**
 * Cypress E2E: REZ-2026-1223 – admin → magic link → klient (karta kwalifikacyjna).
 *
 * Wymagania: Backend 8000, Frontend 3000. Admin sguzik / Glob@l2026! (seed_admin_users.py).
 *
 * Uruchomienie: npx cypress run --spec cypress/e2e/rez-2026-1223-client.cy.ts
 *              npx cypress open  (interaktywny, headed)
 */

const RESERVATION_NUMBER = 'REZ-2026-1223';
const ADMIN_LOGIN = 'sguzik';
const ADMIN_PASSWORD = 'Glob@l2026!';

describe('REZ-2026-1223 – admin → magic link → klient', () => {
  it('logowanie jako admin i wejście na rezerwację', () => {
    cy.visit('/admin-panel/login');
    cy.get('#login').type(ADMIN_LOGIN);
    cy.get('#password').type(ADMIN_PASSWORD);
    cy.get('button[type="submit"]').click();
    cy.url().should('match', /\/(admin-panel)(\/)?(\?|$)/);

    cy.visit(`/admin-panel/rezerwacja/${RESERVATION_NUMBER}`);
    cy.contains(RESERVATION_NUMBER, { matchCase: false }).should('be.visible');
  });

  it('generowanie magic linku i przejście na kartę kwalifikacyjną jako klient', () => {
    cy.visit('/admin-panel/login');
    cy.get('#login').type(ADMIN_LOGIN);
    cy.get('#password').type(ADMIN_PASSWORD);
    cy.get('button[type="submit"]').click();
    cy.url().should('match', /\/(admin-panel)(\/)?(\?|$)/);

    cy.visit(`/admin-panel/rezerwacja/${RESERVATION_NUMBER}`);
    cy.contains(RESERVATION_NUMBER, { matchCase: false }).should('be.visible');

    cy.intercept('POST', '**/generate-magic-link**').as('magicLink');
    cy.contains('button', /Zaloguj się bezpośrednio na konto klienta/i).click();
    cy.wait('@magicLink').then((interception: any) => {
      expect(interception.response.statusCode).to.eq(200);
      const body = interception.response?.body || {};
      const link = body.link_local || body.link_production;
      expect(link).to.include('token=');
      cy.visit(link);
    });

    cy.contains(/Logowanie zakończone sukcesem|Przekierowywanie|Zalogowano/i, { matchCase: false, timeout: 15000 }).should('be.visible');
    cy.url().then((url) => {
      if (url.includes('/auth/verify')) {
        cy.wait(2000);
      }
    });

    cy.visit(`/profil/aktualne-rezerwacje/${RESERVATION_NUMBER}/karta-kwalifikacyjna`, { timeout: 15000 });
    cy.get('body').should('be.visible');
    cy.contains(/Zapisz zmiany|Podpisz dokument|Drukuj/i).should('be.visible');
  });
});
