import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      // Local auth server (Node.js, port 3001) — handles email/password login
      // by calling Peloton's internal auth-self-service from within the cluster.
      // This bypasses Cloudflare's server-side request blocking on /auth/login.
      '/local-auth': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/local-auth/, ''),
      },
      // Main Peloton API — Bearer token set after login
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
      },
    },
  },
})
