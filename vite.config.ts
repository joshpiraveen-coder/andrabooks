import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0' },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replaceAll('\\', '/');
          if (normalized.includes('/node_modules/framer-motion/')) return 'motion';
          if (normalized.includes('/node_modules/lucide-react/')) return 'icons';
        },
      },
    },
  },
});
