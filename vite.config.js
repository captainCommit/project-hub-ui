import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    logLevel: 'info', // Suppress warnings, only show errors
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // Serve the API from the UI's origin in dev so the SameSite=Strict session cookie is first-party.
      proxy: {
        '/api': { target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000' },
      },
    },
  }
});
