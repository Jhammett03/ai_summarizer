import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // ✅ Use Tailwind's Vite plugin

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // ✅ Tailwind plugin for Vite
  ],
});
