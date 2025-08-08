import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022', // Set the target environment to support top-level await
  },
});
