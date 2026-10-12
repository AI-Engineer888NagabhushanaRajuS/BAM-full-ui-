import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Always serve on 5174; fail loudly instead of drifting to another port.
  server: {
    port: 5174, strictPort: true,
    // Local backends behind the dev server (no CORS setup needed): Cognee API and the Laya judge service.
    proxy: {
      '/cognee': { target: process.env.COGNEE_URL ?? 'http://localhost:8000', changeOrigin: true, rewrite: p => p.replace(/^\/cognee/, '') },
      '/laya': { target: process.env.LAYA_URL ?? 'http://localhost:8787', changeOrigin: true, rewrite: p => p.replace(/^\/laya/, '') },
    },
  },
  preview: { port: 5174, strictPort: true },
})
