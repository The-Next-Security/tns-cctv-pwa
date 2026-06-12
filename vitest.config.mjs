import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(rootDir, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'tests/**/*.spec.js',
      'tests/**/*.spec.ts',
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'components/**/*.test.tsx',
      'backend/tests/**/*.test.js',
    ],
  },
})
