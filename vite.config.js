import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: ['c69a39a4f952.ngrok-free.app'],
  },
  build: {
    target: 'es2022', // Set the target environment to support top-level await
  },
});
