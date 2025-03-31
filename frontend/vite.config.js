import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the parent directory
  const env = loadEnv(mode, path.resolve(__dirname, '..'), 'FRONTEND_');
  
  // Debug: Log available environment variables
  console.log('Available env vars:', env);
  
  // Validate required environment variables
  const requiredVars = ['FRONTEND_SERVER_URL'];
  const missing = requiredVars.filter(varName => !env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file in the root directory.'
    );
  }
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.FRONTEND_SERVER_URL,
          changeOrigin: true,
        },
      },
    },
    // Expose environment variables to import.meta.env
    envDir: path.resolve(__dirname, '..'),
    envPrefix: 'FRONTEND_'
  };
}); 