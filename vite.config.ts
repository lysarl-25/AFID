import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { createAdsbMiddleware } from './server/adsb.mjs'

const adsbMiddleware = createAdsbMiddleware()

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'afid-adsb-proxy',
      configureServer(server) {
        server.middlewares.use(adsbMiddleware)
      },
      configurePreviewServer(server) {
        server.middlewares.use(adsbMiddleware)
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
