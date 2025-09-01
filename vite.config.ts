import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production'
  
  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: true,
      ...(isProduction && {
        https: false, // يمكن تفعيل HTTPS في الإنتاج
        cors: true
      })
    },
    build: {
      outDir: 'dist',
      sourcemap: isProduction ? false : true, // إيقاف sourcemap في الإنتاج
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
      minify: 'esbuild',
      // إضافة تحسينات الإنتاج
      cssCodeSplit: true,
      reportCompressedSize: false,
      // تحسين التحميل
      assetsInlineLimit: 4096
    },
    // تحسين الأداء في التطوير
    optimizeDeps: {
      include: ['react', 'react-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore']
    },
    // إعدادات الإنتاج
    define: {
      __DEV__: !isProduction,
      __PROD__: isProduction
    }
  }
})
