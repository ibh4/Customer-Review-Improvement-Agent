import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/ and index.html
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    // echarts (tree-shaken) legitimately weighs ~780kB minified as a single demo bundle
    chunkSizeWarningLimit: 2048,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
