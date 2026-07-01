import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // respect PORT env (used by preview harness); fall back to Vite default
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
})
