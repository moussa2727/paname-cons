import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';
import 'react-toastify/dist/ReactToastify.css';

// Configuration simplifiée pour le développement
const setupDevelopmentConfig = () => {
  if (!import.meta.env.DEV) return;

  // Filtrage des erreurs non critiques en développement
  const originalError = console.error;
  console.error = (...args) => {
    const message = args[0]?.toString() || '';
    
    const shouldIgnore = [
      'gen_204',
      'ERR_BLOCKED_BY_CLIENT',
      'Google Maps JavaScript API',
      'Lottie',
    ].some(pattern => message.includes(pattern));

    if (shouldIgnore) return;
    originalError.apply(console, args);
  };
};

// Rendu de l'application
const renderApp = () => {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    console.error('Élément racine non trouvé');
    return;
  }

  try {
    setupDevelopmentConfig();

    const root = createRoot(rootElement);
    
    root.render(
      <React.StrictMode>
        <HelmetProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AuthProvider>
              <App />
              <ToastContainer
                position="top-right"
                autoClose={4000}
                hideProgressBar={false}
                newestOnTop={true}
                closeOnClick={true}
                rtl={false}
                pauseOnFocusLoss={false}
                draggable={false}
                pauseOnHover={false}
                theme="light"
                style={{
                  zIndex: 9999,
                  marginTop: '50px'
                }}
                limit={1} 
                stacked={true} 
              />
            </AuthProvider>
          </BrowserRouter>
        </HelmetProvider>
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Erreur lors du rendu de l\'application:', error);
    
    // Fallback pour l'utilisateur
    rootElement.innerHTML = `
      <div style="padding: 2rem; text-align: center; font-family: system-ui, sans-serif;">
        <h1>Erreur de chargement</h1>
        <p>Une erreur est survenue lors du chargement de l'application.</p>
        <p>Veuillez rafraîchir la page ou nous contacter si le problème persiste.</p>
      </div>
    `;
  }
};

// Démarrer l'application
renderApp();