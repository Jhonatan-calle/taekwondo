import path from 'node:path'

import { defineConfig } from 'vitest/config'

// Configuración de Vitest para el stack Next.js: resuelve el alias @/ y ejecuta TS.
// El motor de emparejamiento es puro → environment 'node'.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
  },
})