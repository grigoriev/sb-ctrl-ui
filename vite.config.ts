import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { readFileSync } from 'node:fs'

// The UI version comes from package.json, so the page can name the build it is.
const uiVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version

// https://vite.dev/config/
// Vitest reads its settings from vitest.config.ts.
export default defineConfig({
  plugins: [react()],
  define: { __UI_VERSION__: JSON.stringify(uiVersion) },
})
