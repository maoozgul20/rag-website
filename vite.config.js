import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development, requests to /api go to the FastAPI backend on port 8000,
// so you do not need CORS or an API URL while testing locally.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
