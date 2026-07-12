import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    proxy: {
      // Proxy all API requests to the backend (auth, invoices, etc.)
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        invoice: resolve(__dirname, 'invoice.html'),
      },
    },
  },
});