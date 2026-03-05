import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'echarts': ['echarts', 'echarts-for-react'],
          'vendor': ['react', 'react-dom', 'react-router-dom', 'axios']
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3002',
        changeOrigin: true
      }
    }
  }
})
