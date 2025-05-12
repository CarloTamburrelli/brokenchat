import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  
  plugins: [
    react(),
  ],
  test: {
    globals: true,
    setupFiles: "./src/setupTests.ts", // 🔥 Carica Jest-Dom nei test
    environment: "jsdom", // 🏗️ Simula il DOM
  },
  server: {
    host: '0.0.0.0', // Ascolta su tutte le interfacce di rete
    port: 3000, // Porta personalizzabile
    strictPort: true, // Fa sì che Vite non tenti altre porte se questa è occupata
    allowedHosts: [
      'b55e-2-37-207-57.ngrok-free.app',
      'broken.chat',
      'localhost',  // Puoi anche aggiungere localhost se necessario
    ],
    proxy: {
      '/sitemap.xml': {
        target: 'https://api.broken.chat',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg'],  // Aggiungi questa riga
  },
  build: {
    manifest: true,  // Attiva la creazione del manifesto
  },
  

})
