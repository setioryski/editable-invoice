import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      // string shorthand: http://localhost:5173/api -> http://localhost:3000/api
      '/api': 'http://localhost:3000',
    },
  },
});