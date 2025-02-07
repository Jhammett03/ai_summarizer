import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // ✅ Use Tailwind's Vite plugin

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      "/summarize": "http://localhost:5000",
      "/generate-questions": "http://localhost:5000",
      "/upload": "http://localhost:5000",
    },
  },
});
