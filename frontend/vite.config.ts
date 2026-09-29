import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // `backend:3000` only resolves inside docker compose, so the target has to be
  // switchable: localhost when the dev server runs on the host, service name in Docker.
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:3000'

  return {
    plugins: [react()],
    server: {
      host: true,
      watch: {
        usePolling: true,
        interval: 500,
      },
      proxy: {
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
