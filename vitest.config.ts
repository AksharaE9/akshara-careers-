import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}', 'tests/integration/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['lib/**', 'components/**', 'app/api/**'],
      exclude: ['**/*.d.ts', '**/node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, '.'),
    },
  },
})

