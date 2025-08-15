import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    proxy: {
      // Proxy API requests to the backend
      '/api': 'http://localhost:3000',
      
      // Add this rule to proxy the invoice page
      // This forces the backend's authentication check to run
    //   '/invoice.html': 'http://localhost:3000',
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