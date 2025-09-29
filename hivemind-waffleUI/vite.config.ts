
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  root: resolve(__dirname, 'src/client'),
  plugins: [react()],
  server: {
    host: true,                 // listen on all interfaces (needed behind proxies)
    port: 5173,
    allowedHosts: true,         // allow proxied preview hosts (e.g., *.beamlit.net)
    hmr: { clientPort: 443 },   // helps HMR when preview is wrapped in HTTPS
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
  build: {
    outDir: resolve(__dirname, 'dist/client'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      // keep imports relative as the project uses explicit paths; this slot is here for future use
    },
  },
})
