import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: ['4e35c8b15b2e.ngrok-free.app'],
  },
  build: {
    target: 'es2022', // Set the target environment to support top-level await
  },
});
