import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  define: {
    "import.meta.env.MODE": JSON.stringify(process.env.NODE_ENV),
  },

  css: {
    devSourcemap: false, // Disable sourcemaps in production
    transformer: "lightningcss", // Faster CSS processing (requires installation)
    // Optimiser le CSS pour le build
    postcss: {
      plugins: [
        // Ajout des optimisations PostCSS           
      ],
    },
  },

  build: {
    chunkSizeWarningLimit: 708, // Ajusté pour les vendors lourdes (antd, charts)
    minify: "oxc", // natif Vite 8, pas besoin d'installation
    cssMinify: "lightningcss", // Faster CSS minification
    sourcemap: false, // Disable sourcemaps in production for faster builds
    target: "esnext", // Meilleure optimisation pour les navigateurs modernes
    rollupOptions: {
      output: {
        // Optimisation du cache busting
        entryFileNames: "assets/[name].[hash].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]",
        // Strategy de chunking optimisée
        manualChunks: (id) => {
          // Librairies de charts - très lourdes, chunk séparé
          if (
            id.includes("node_modules/recharts/") ||
            id.includes("node_modules/echarts/") ||
            id.includes("node_modules/react-charts/")
          ) {
            return "charts-vendor";
          }

          // Ant Design - librairie UI complète
          if (
            id.includes("node_modules/antd/") ||
            id.includes("node_modules/@ant-design/")
          ) {
            return "antd-vendor";
          }

          // Tremor React - dashboard analytics
          if (id.includes("node_modules/@tremor/")) {
            return "tremor-vendor";
          }

          // React core
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router-dom/")
          ) {
            return "react-vendor";
          }

          // UI utilities (plus léger)
          if (
            id.includes("node_modules/lucide-react/") ||
            id.includes("node_modules/react-toastify/") ||
            id.includes("node_modules/react-hot-toast/")
          ) {
            return "ui-vendor";
          }

          // Framer Motion - animations
          if (id.includes("node_modules/framer-motion/")) {
            return "motion-vendor";
          }

          // React Query - state management
          if (
            id.includes("node_modules/react-query/") ||
            id.includes("node_modules/@tanstack/")
          ) {
            return "query-vendor";
          }
          if (id.includes("/pages/gestionnaire/")) {
            if (id.includes("statistiques")) {
              return "gestionnaire-statistiques";
            }
            if (id.includes("utilisateurs")) {
              return "gestionnaire-utilisateurs";
            }
            if (id.includes("rendezvous")) {
              return "gestionnaire-rendezvous";
            }
            if (id.includes("messages")) {
              return "gestionnaire-messages";
            }
            if (id.includes("procedures")) {
              return "gestionnaire-procedures";
            }
            if (id.includes("destinations")) {
              return "gestionnaire-destinations";
            }
            if (id.includes("profil")) {
              return "gestionnaire-profil";
            }

            return "gestionnaire";
          }
          if (id.includes("/pages/user/")) {
            if (id.includes("profile")) {
              return "user-profile";
            }
            if (id.includes("rendezvous")) {
              if (id.includes("MesRendezvous")) {
                return "user-mes-rendezvous";
              }
              if (id.includes("RendezVous")) {
                return "user-RendezVous";
              }
              return "user-rendezvous";
            }
            if (id.includes("procedures")) {
              return "user-procedures";
            }

            return "user";
          }
          if (id.includes("/pages/auth/")) {
            if (id.includes("Login")) {
              return "auth-login";
            }
            if (id.includes("Register")) {
              return "auth-register";
            }
            if (id.includes("ForgotPassword")) {
              return "auth-forgot-password";
            }
            if (id.includes("ResetPassword")) {
              return "auth-reset-password";
            }
            return "auth";
          }
          if (id.includes("/pages/(main)/")) {
            if (id.includes("Home")) {
              return "main-home";
            }
            if (id.includes("About")) {
              return "main-about";
            }
            if (id.includes("Contact")) {
              return "main-contact";
            }
            if (id.includes("Services")) {
              return "main-services";
            }
            return "main";
          }
        },
      },
    },
  },

  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:10000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:10000",
        changeOrigin: true,
      },
    },
  },
});
