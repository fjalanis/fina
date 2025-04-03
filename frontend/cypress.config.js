import { defineConfig } from 'cypress';

export default defineConfig({
  screenshotOnRunFailure: false,
  viewportWidth: 1280,
  viewportHeight: 720,
  browser: 'chromium',
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'tests/e2e/**/*.cy.js',
    supportFile: 'tests/support/e2e.js',
    defaultCommandTimeout: 10000,
  },
});
