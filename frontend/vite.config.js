import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Configuration adaptée pour GitHub Pages (base relative)
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss()
  ]
})
