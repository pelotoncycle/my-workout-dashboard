import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      // Auth login endpoint lives at /auth/login (not under /api)
      '/auth': {
        target: 'https://api.onepeloton.com',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: '',
      },
      '/api': {
        target: 'https://api.onepeloton.com',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: '',
      },
      '/fit-feed': {
        target: 'https://fit-feed.ge.onepeloton.com',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: '',
      }
    }
  }
})
