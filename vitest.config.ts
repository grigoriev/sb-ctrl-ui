import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

import { readFileSync } from 'node:fs'

// The UI version comes from package.json, so the page can name the build it is.
const uiVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version

export default defineConfig({
  plugins: [react()],
  define: { __UI_VERSION__: JSON.stringify(uiVersion) },
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
})
