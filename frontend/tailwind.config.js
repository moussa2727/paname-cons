/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
  // Optimisation pour le build
  corePlugins: {
    // Désactiver les plugins non utilisés pour accélérer le build
    preflight: true,
  },
};
