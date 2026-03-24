import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis', // sockjs-client expects Node's global
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/viewer-latest.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/viewer-latest.css'
          }

          return 'assets/[name][extname]'
        },
      },
    },
  },
})
