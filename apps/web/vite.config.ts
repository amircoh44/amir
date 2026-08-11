import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const pkg = (name: string) =>
  fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Workspace packages ship TypeScript source rather than a build artifact,
    // so point the bundler straight at their entry files.
    alias: {
      '@amir/shipping-core': pkg('shipping-core'),
      '@amir/shipping-client': pkg('shipping-client'),
    },
  },
})
