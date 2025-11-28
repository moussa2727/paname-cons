import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Charger les variables d'environnement
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
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
    base: '/',
    // ✅ Proxy UNIQUEMENT en développement
    server: mode === 'development' ? {
      proxy: {
        '/api': {
          target: 'https://panameconsulting.up.railway.app',
          changeOrigin: true,
          secure: false,
        }
      }
    } : undefined,
  };
});