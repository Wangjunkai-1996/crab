import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const buildCreatedAt = new Date().toISOString()
const buildId =
  process.env.ADMIN_WEB_BUILD_ID ??
  buildCreatedAt.replace(/[-:.TZ]/g, '').slice(0, 14)

export default defineConfig({
  plugins: [vue()],
  define: {
    __ADMIN_WEB_BUILD_ID__: JSON.stringify(buildId),
    __ADMIN_WEB_BUILD_CREATED_AT__: JSON.stringify(buildCreatedAt),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
