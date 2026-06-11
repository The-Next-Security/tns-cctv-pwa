import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.spec.*', 'backend/tests/**/*.test.js'],
    environmentMatchGlobs: [
      ['tests/**/*.spec.*', 'jsdom'],
      ['backend/tests/**/*.test.js', 'node'],
    ],
    setupFiles: ['src/test/setup.ts'],
  },
})
