import { defineConfig } from 'cypress';
import { execSync } from 'child_process';

export default defineConfig({
  e2e: {
    viewportWidth: 1280,
    viewportHeight: 720,
  },
});
