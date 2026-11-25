import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site under /<repo-name>/
export default defineConfig({
  base: process.env.BASE_PATH || '/friend-village/',
  plugins: [react()],
});
