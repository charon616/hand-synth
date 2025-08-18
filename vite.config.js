import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: ['28fdf24a2910.ngrok-free.app'],
  },
  build: {
    target: 'es2022', // Set the target environment to support top-level await
  },
});
