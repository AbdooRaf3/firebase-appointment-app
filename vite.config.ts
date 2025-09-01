import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // تحسين الأداء للهواتف
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/messaging'],
          router: ['react-router-dom'],
          ui: ['lucide-react']
        }
      }
    },
    // تحسين حجم الملفات
    chunkSizeWarningLimit: 1000,
    // تحسين الأداء
    target: 'es2015',
    minify: 'esbuild'
  },
  // تحسين الأداء في التطوير
  optimizeDeps: {
    include: ['react', 'react-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore']
  }
})
