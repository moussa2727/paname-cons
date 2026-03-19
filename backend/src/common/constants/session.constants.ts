export const SessionConstants = {
  // Durées
  ACCESS_TOKEN_EXPIRY: 15 * 60 * 1000, // 15 minutes
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 jours
  SESSION_MAX_AGE: 30 * 24 * 60 * 60 * 1000, // 30 jours
  INACTIVITY_TIMEOUT: 60 * 60 * 1000, // 1 heure

  // Limites
  MAX_CONCURRENT_SESSIONS: 2,
  MAX_REFRESH_ROTATIONS: 10,

  // Cookies
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: true,
    samesite: 'none',
    path: '/',
  },

  // Messages
  MESSAGES: {
    SESSION_EXPIRED: 'Votre session a expiré. Veuillez vous reconnecter.',
    SESSION_MAX_AGE:
      'Durée maximale de session atteinte. Veuillez vous reconnecter.',
    INACTIVITY: "Session expirée pour cause d'inactivité.",
    MAX_SESSIONS: 'Nombre maximum de sessions atteint.',
    DEVICE_CHANGED:
      'Nouvel appareil détecté. Vérification supplémentaire requise.',
  },
} as const;
