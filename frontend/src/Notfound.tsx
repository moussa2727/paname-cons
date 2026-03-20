import React from 'react';
import { Helmet } from 'react-helmet-async';

interface NotFoundProps {
  title?: string;
  message?: string;
  className?: string;
}

const Notfound: React.FC<NotFoundProps> = ({ 
  title = "Page non trouvée",
  message = "Désolé, la page que vous recherchez n'existe pas ou a été déplacée.",
  className = ""
}) => {
  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      
      <div className={`min-h-screen bg-linear-to-b from-sky-50 to-blue-100 flex items-center justify-center px-4 ${className}`}>
        <div className="max-w-lg w-full text-center">
          {/* Icône 404 avec animation légère */}
          <div className="mb-8 relative">
            <div className="text-9xl font-bold text-blue-300/30 select-none">404</div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg 
                className="w-32 h-32 text-blue-400/50 animate-pulse" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
          </div>

          {/* Titre */}
          <h1 className="text-4xl font-light text-blue-900 mb-4">
            {title}
          </h1>

          {/* Message */}
          <p className="text-blue-700/80 mb-8 text-lg">
            {message}
          </p>

          {/* Bouton de retour */}
          <a 
            href="/"
            className="inline-flex items-center px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            rel="nofollow"
          >
            <svg 
              className="w-5 h-5 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18" 
              />
            </svg>
            Retour à l'accueil
          </a>

          {/* Éléments décoratifs */}
          <div className="mt-12 flex justify-center space-x-2" aria-hidden="true">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full bg-blue-300/50 animate-pulse`}
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Notfound;