import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Charger les variables d'environnement
  const env = loadEnv(mode, process.cwd(), '');
  
  // Déterminer la cible de l'API selon l'environnement
  const apiTarget = mode === 'development' 
    ? 'https://panameconsulting.up.railway.app'
    : 'https://panameconsulting.up.railway.app';
  
  return {
    plugins: [react()],
    
    // Configuration de build optimisée
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['lucide-react', 'react-toastify'],
            'utils-vendor': ['date-fns', 'date-fns/locale/fr', 'jwt-decode'],
            'admin-chunk': [
              './src/pages/admin/AdminDashboard.tsx',
              './src/pages/admin/UsersManagement.tsx',
              './src/pages/admin/AdminMessages.tsx'
            ]
          }
        }
      },
      chunkSizeWarningLimit: 800,
      minify: mode === 'production' ? 'terser' : false,
    },
    
    // Optimisation des dépendances
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'lucide-react'
      ],
      exclude: ['lazy-loaded-components']
    },
    
    // Base URL
    base: '/',
    
    // ✅ Proxy UNIQUEMENT en développement avec types corrects
    server: mode === 'development' ? {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Proxying request:', req.method, req.url);
            });
          }
        }
      }
    } : undefined,
    
    // Prévisualisation
    preview: {
      port: 4173,
      host: true
    }
  };
});