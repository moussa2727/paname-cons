import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const apiTarget = 'https://panameconsulting.up.railway.app';
  
  return {
    plugins: [react()],
    
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['lucide-react', 'react-toastify'],
            'utils-vendor': ['date-fns', 'date-fns/locale/fr', 'jwt-decode'],
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
        }
      },
      chunkSizeWarningLimit: 1000,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
        },
        format: {
          comments: false,
        }
      }
    },
    
    optimizeDeps: {
      include: [
        'react',
        'react-dom', 
        'react-router-dom',
        'lucide-react'
      ]
    },
    
    base: '/',
    
    server: mode === 'development' ? {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false
        }
      }
    } : undefined,
    
    preview: {
      port: 4173,
      host: true
    }
  };
});