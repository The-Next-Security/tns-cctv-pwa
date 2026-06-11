import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{spec,test}.{js,ts,jsx,tsx}', 'backend/tests/**/*.test.js'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
