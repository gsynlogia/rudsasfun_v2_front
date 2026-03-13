import { defineConfig } from 'cypress';

const baseUrl = process.env.CYPRESS_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  e2e: {
    baseUrl,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 15000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    video: true,
    screenshotOnRunFailure: true,
  },
});
