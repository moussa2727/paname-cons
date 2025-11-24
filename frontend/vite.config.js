import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'react-toastify'],
          'date-vendor': ['date-fns', 'date-fns/locale/fr'],
          'admin': [
            './src/pages/admin/AdminDashboard.tsx',
            './src/pages/admin/UsersManagement.tsx',
            './src/pages/admin/AdminMessages.tsx',
            './src/pages/admin/AdminProfile.tsx',
            './src/pages/admin/AdminProcedure.tsx',
            './src/pages/admin/AdminDestinations.tsx'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    include: [
      'date-fns',
      'date-fns/locale/fr'
    ],
    exclude: ['date-fns-tz']
  },
  // Configuration spécifique à Vercel
  base: process.env.NODE_ENV === 'production' ? '/' : '/',
  // Configuration du serveur uniquement en développement
  server: mode === 'development' ? {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  } : undefined,
}));