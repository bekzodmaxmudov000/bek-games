import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // In development the multiplayer server (npm run server) is reached through the same address.
  server: { proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } } },
});
