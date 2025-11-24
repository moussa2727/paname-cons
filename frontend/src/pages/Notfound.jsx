/* eslint-disable react-hooks/exhaustive-deps */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiArrowLeft, FiFrown } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [redirecting, setRedirecting] = useState(true);

  // Compte à rebours + redirection
  useEffect(() => {
    if (!redirecting) return;

    const interval = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const timeout = setTimeout(() => {
      navigate('/');
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [redirecting]);

  const handleStopRedirect = () => {
    setRedirecting(false);
    setCountdown(5);
  };

  return (
    <>
      <Helmet>
        <title>404 — Page non trouvée | Paname Consulting</title>
        <meta name='description' content='Oups ! Cette page semble avoir disparu. Retournez à l’accueil de Paname Consulting.' />
        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
        <link rel='icon' href='/icons/paname-consulting.ico' />
        <link rel='apple-touch-icon' href='/icons/paname-consulting-512.png' />
        <link rel='manifest' href='/manifest.json' />
        <link rel='canonical' href='https://panameconsulting.vercel.app/' />
        <meta name='robots' content='noindex, nofollow' />
        <style>{`
          html, body {
            overscroll-behavior-x: none;
            overflow-x: hidden;
          }
        `}</style>
      </Helmet>

      <main
        role='main'
        aria-label='Page non trouvée'
        className='min-h-screen bg-gradient-to-br from-sky-600 to-sky-500 flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden'
      >
        {/* Cercles décoratifs */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className='absolute -top-32 -left-32 w-64 h-64 bg-white/10 rounded-full blur-3xl'
        />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className='absolute -bottom-32 -right-32 w-64 h-64 bg-sky-400/20 rounded-full blur-3xl'
        />

        <section className='relative z-10 text-center max-w-xl md:max-w-2xl mx-auto'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={{ rotate: [-10, 10, -10] }}
              transition={{ duration: 2, repeat: Infinity }}
              className='inline-block mb-4'
            >
              <FiFrown className='w-20 h-20 text-white/90 mx-auto' aria-hidden='true' />
            </motion.div>

            <h1 className='text-6xl md:text-8xl font-extrabold text-white mb-2'>
              404
            </h1>
            <h2 className='text-2xl md:text-3xl font-semibold text-white mb-6'>
              Oups ! Page introuvable
            </h2>

            {/* Barre de progression */}
            <AnimatePresence>
              {redirecting && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 5, ease: 'linear' }}
                  className='h-1 bg-white/20 rounded-full overflow-hidden mb-6'
                >
                  <div className='h-full bg-white/50' />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Boutons */}
            <div className='flex flex-col sm:flex-row justify-center gap-4'>
              <Link to='/'>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className='flex items-center justify-center bg-white/10 text-white px-6 py-2.5 rounded-lg font-semibold backdrop-blur-sm hover:bg-white/20 transition-all'
                >
                  <FiArrowLeft className='mr-2 w-5 h-5' />
                  Retour à l’accueil
                </motion.button>
              </Link>

              {redirecting && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStopRedirect}
                  className='flex items-center justify-center bg-white/10 text-white px-6 py-2.5 rounded-lg font-semibold backdrop-blur-sm hover:bg-white/20 transition-all'
                >
                  Annuler ({countdown})
                </motion.button>
              )}
            </div>
          </motion.div>
        </section>
      </main>
    </>
  );
};

export default NotFound;