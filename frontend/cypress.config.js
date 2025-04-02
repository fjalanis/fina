import { defineConfig } from 'cypress';
import { execSync } from 'child_process';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('task', {
        resetDatabase() {
          // Run the script synchronously
          console.log('Resetting database with test data...');
          execSync('node ../scripts/generateTestData.js', { stdio: 'inherit' });
          return null;
        }
      });
    },
  },
});
