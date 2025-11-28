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
    
    // Configuration de build optimisée et SÉCURISÉE
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development', // Source maps uniquement en dev
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['lucide-react', 'react-toastify'],
            'utils-vendor': ['date-fns', 'date-fns/locale/fr', 'jwt-decode'],
          },
          // Optimisation pour éviter les erreurs de taille
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
        }
      },
      chunkSizeWarningLimit: 1000, // Augmenter la limite
      // ✅ CORRECTION : Configuration Terser simplifiée
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production', // Supprimer console.log en prod
        },
        format: {
          comments: false, // Supprimer les commentaires
        }
      }
    },
    
    // Optimisation des dépendances
    optimizeDeps: {
      include: [
        'react',
        'react-dom', 
        'react-router-dom',
        'lucide-react'
      ]
    },
    
    // Base URL
    base: '/',
    
    // ✅ Proxy UNIQUEMENT en développement
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
    
    // Prévisualisation
    preview: {
      port: 4173,
      host: true
    }
  };
});