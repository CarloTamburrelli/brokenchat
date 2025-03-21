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
      'd83b-2-37-204-97.ngrok-free.app',  // Aggiungi qui l'host generato da ngrok
    'localhost',  // Puoi anche aggiungere localhost se necessario
    ]
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg'],  // Aggiungi questa riga
  },
  

})
