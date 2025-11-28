import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: (redirectPath?: string, silent?: boolean) => void;
  register: (data: RegisterFormData) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  refreshToken: () => Promise<boolean>;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  saveToSession: (key: string, data: any) => void;
  getFromSession: (key: string) => any;
  removeFromSession: (key: string) => void;
  clearSession: () => void;
}

interface User {
  telephone?: string;
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  isAdmin?: boolean
}

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
  jti?: string;
}

interface LoginResponse {
  accessToken: string;
  user: User;
  message?: string;
}

interface RefreshResponse {
  accessToken?: string;
  refreshToken?: string;
  loggedOut?: boolean;
}

// Clés autorisées pour le sessionStorage (whitelist)
const ALLOWED_SESSION_KEYS = {
  REDIRECT_PATH: 'auth_redirect_path',
  LOGIN_TIMESTAMP: 'login_timestamp',
  UI_PREFERENCES: 'ui_preferences',
  SESSION_METADATA: 'session_metadata',
  NAVIGATION_STATE: 'navigation_state',
  FORM_DRAFTS: 'form_drafts_',
  FILTERS_STATE: 'filters_state_'
} as const;

// Clés interdites (blacklist)
const SENSITIVE_KEYS = [
  'user_email', 'user_password', 'user_id', 'user_role',
  'jwt_token', 'access_token', 'refresh_token', 'personal_data',
  'auth_token', 'credentials', 'password', 'email'
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshInFlightRef = useRef<Promise<boolean> | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const refreshTimeoutRef = useRef<number | null>(null);
  const checkIntervalRef = useRef<number | null>(null);

  const VITE_API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // === FONCTIONS SESSIONSTORAGE SÉCURISÉES ===

  const validateSessionKey = (key: string): boolean => {
    // Vérifier si la clé est dans la blacklist
    if (SENSITIVE_KEYS.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
      console.debug(`Tentative de stockage de donnée sensible ignorée: ${key}`);
      return false;
    }
    
    // Vérifier si la clé est dans la whitelist ou commence par un préfixe autorisé
    const isAllowed = Object.values(ALLOWED_SESSION_KEYS).some(allowedKey => 
      key === allowedKey || key.startsWith(ALLOWED_SESSION_KEYS.FORM_DRAFTS) || key.startsWith(ALLOWED_SESSION_KEYS.FILTERS_STATE)
    );
    
    if (!isAllowed) {
      console.debug(`Clé sessionStorage non autorisée ignorée: ${key}`);
      return false;
    }
    
    return true;
  };


  const validateSessionData = (data: any): boolean => {
    if (!data || typeof data !== 'object') return true;

    // Vérifier des clés sensibles exactes uniquement (évite les faux positifs: sessionId, userAgent, etc.)
    const SENSITIVE_EXACT = new Set([
      'email',
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'authorization',
      'bearer',
      'id',
      'role',
      'credentials',
    ].map(k => k.toLowerCase()));

    const hasSensitiveData = Object.keys(data).some(key => SENSITIVE_EXACT.has(key.toLowerCase()));

    if (hasSensitiveData) {
      // Refus silencieux pour éviter le bruit console
      return false;
    }

    return true;
  };

  const saveToSession = (key: string, data: any): void => {
    try {
      if (!validateSessionKey(key)) {
        return;
      }
      // Ne pas valider le contenu pour les clés whitelisted connues et sûres
      const skipContentValidation = (
        key === ALLOWED_SESSION_KEYS.UI_PREFERENCES ||
        key === ALLOWED_SESSION_KEYS.SESSION_METADATA ||
        key === ALLOWED_SESSION_KEYS.LOGIN_TIMESTAMP ||
        key === ALLOWED_SESSION_KEYS.REDIRECT_PATH ||
        key.startsWith(ALLOWED_SESSION_KEYS.FORM_DRAFTS) ||
        key.startsWith(ALLOWED_SESSION_KEYS.FILTERS_STATE)
      );
      if (!skipContentValidation && !validateSessionData(data)) {
        return;
      }
      
      // Limiter la taille des données (50KB max)
      const dataSize = new Blob([JSON.stringify(data)]).size;
      if (dataSize > 50 * 1024) {
        console.debug(`Données trop volumineuses pour sessionStorage: ${dataSize} bytes`);
        return;
      }
      
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('❌ Erreur sessionStorage (sauvegarde):', error);
    }
  };

  const getFromSession = (key: string): any => {
    try {
      if (!validateSessionKey(key)) {
        return null;
      }
      
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn('❌ Erreur sessionStorage (récupération):', error);
      return null;
    }
  };

  const removeFromSession = (key: string): void => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('❌ Erreur sessionStorage (suppression):', error);
    }
  };

  const clearSession = (): void => {
    try {
      // Sauvegarder les préférences UI avant de tout effacer
      const uiPreferences = getFromSession(ALLOWED_SESSION_KEYS.UI_PREFERENCES);
      sessionStorage.clear();
      
      // Restaurer les préférences UI si elles existaient
      if (uiPreferences) {
        saveToSession(ALLOWED_SESSION_KEYS.UI_PREFERENCES, uiPreferences);
      }
    } catch (error) {
      console.warn('❌ Erreur sessionStorage (nettoyage):', error);
    }
  };

  const cleanupSensitiveData = (): void => {
    SENSITIVE_KEYS.forEach(key => {
      if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key);
        console.debug(`Donnée sensible supprimée: ${key}`);
      }
    });
  };


  // === GESTIONNAIRES D'ÉTAT SÉCURISÉS ===

  const saveNavigationState = (): void => {
    saveToSession(ALLOWED_SESSION_KEYS.REDIRECT_PATH, location.pathname);
    saveToSession(ALLOWED_SESSION_KEYS.LOGIN_TIMESTAMP, Date.now());
  };

  const saveUIPreferences = (preferences: any): void => {
    saveToSession(ALLOWED_SESSION_KEYS.UI_PREFERENCES, {
      ...preferences,
      savedAt: Date.now()
    });
  };


  const saveSessionMetadata = (): void => {
    saveToSession(ALLOWED_SESSION_KEYS.SESSION_METADATA, {
      sessionStart: Date.now(),
      sessionId: Math.random().toString(36).substring(2, 15),
      userAgent: navigator.userAgent.substring(0, 50),
      hasActiveSession: !!(user || localStorage.getItem('token'))
    });
  };

 // Configuration du rafraîchissement automatique
  const setupTokenRefresh = (exp: number): void => {
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }

    const refreshTime = exp * 1000 - Date.now() - 5 * 60 * 1000; // 5 min avant expiration
    
    if (refreshTime > 0) {
      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTokenFunction();
      }, refreshTime);
    }
  };
  const refreshTokenFunction = async (): Promise<boolean> => {
    // Éviter les refresh multiples simultanés
    if (isRefreshing && refreshInFlightRef.current) {
      console.log('🔄 Refresh déjà en cours, attente...');
      return refreshInFlightRef.current;
    }
    
    // Vérifier si un refresh est déjà en cours (protection contre les boucles)
    const existingRefresh = sessionStorage.getItem('refresh_in_progress');
    if (existingRefresh) {
      console.log('⏳ Refresh déjà en cours selon sessionStorage, attente...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      const newToken = localStorage.getItem('token');
      if (newToken) {
        console.log('✅ Récupération du token depuis le cache');
        setToken(newToken);
        return true;
      }
      return false;
    }
  
    setIsRefreshing(true);
    sessionStorage.setItem('refresh_in_progress', 'true');
    const doRefresh = (async () => {
      let refreshSuccessful = false;
      
      try {
        console.log('🔄 Début du rafraîchissement du token...');
        
        const response = await fetch(`${VITE_API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
  
        console.log('📡 Statut réponse refresh:', response.status, response.statusText);
  
        // Gestion des erreurs HTTP
        if (!response.ok) {
          if (response.status === 401) {
            console.log('❌ Refresh token expiré ou invalide (401)');
            throw new Error('REFRESH_TOKEN_EXPIRED');
          }
          
          if (response.status >= 500) {
            console.error('❌ Erreur serveur lors du refresh:', response.status);
            throw new Error('SERVER_ERROR');
          }
          
          console.error('❌ Erreur lors du refresh:', response.status);
          throw new Error('REFRESH_FAILED');
        }
  
        const data: RefreshResponse = await response.json();
        
        // Vérifier si l'utilisateur est déconnecté côté serveur
        if (data.loggedOut) {
          console.log('🔒 Utilisateur déconnecté côté serveur');
          throw new Error('USER_LOGGED_OUT');
        }
        
        // Vérifier la présence du token
        if (!data.accessToken) {
          console.error('❌ Aucun token reçu dans la réponse');
          throw new Error('NO_TOKEN_RECEIVED');
        }
  
        console.log('✅ Nouveau token reçu avec succès');
        
        // SAUVEGARDE CRITIQUE DU TOKEN
        localStorage.setItem('token', data.accessToken);
        setToken(data.accessToken);
        
        // Vérification de la sauvegarde
        const savedToken = localStorage.getItem('token');
        if (savedToken !== data.accessToken) {
          console.error('❌ Échec de la sauvegarde du token, nouvelle tentative...');
          localStorage.setItem('token', data.accessToken);
          setToken(data.accessToken);
          
          // Vérification finale
          const finalToken = localStorage.getItem('token');
          if (finalToken !== data.accessToken) {
            throw new Error('TOKEN_SAVE_FAILED');
          }
        }
  
        // Décoder et configurer le nouveau token
        try {
          const decoded = jwtDecode<JwtPayload>(data.accessToken);
          console.log('⏰ Nouveau token expire dans', 
            Math.floor((decoded.exp * 1000 - Date.now()) / 1000 / 60), 
            'minutes'
          );
          
          // Configurer le prochain rafraîchissement automatique
          setupTokenRefresh(decoded.exp);
          
          // Recharger les données utilisateur
          await fetchUserData(data.accessToken);
          
          // Mettre à jour les métadonnées de session
          saveSessionMetadata();
          
          console.log('✅ Refresh token complété avec succès');
          refreshSuccessful = true;
          return true;
          
        } catch (decodeError) {
          console.error('❌ Erreur décodage token:', decodeError);
          throw new Error('TOKEN_DECODE_FAILED');
        }
        
      } catch (error: any) {
        console.error('💥 Erreur lors du rafraîchissement:', error.message);
        
        // Nettoyer les données d'authentification en cas d'échec
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        
        // Déclencher une déconnexion propre seulement pour certaines erreurs
        if (['REFRESH_TOKEN_EXPIRED', 'USER_LOGGED_OUT', 'NO_TOKEN_RECEIVED'].includes(error.message)) {
          console.log('🔒 Déconnexion forcée après échec du refresh');
          // Ne pas rediriger immédiatement, laisser le composant gérer
          setTimeout(() => {
            logout('/', true);
          }, 3000);
        }
        
        return false;
        
      } finally {
        setIsRefreshing(false);
        sessionStorage.removeItem('refresh_in_progress');
        refreshInFlightRef.current = null;
        
        if (!refreshSuccessful) {
          console.log('❌ Refresh token échoué');
        }
      }
    })();
    
    refreshInFlightRef.current = doRefresh;
    return doRefresh;
  };
 
  // === INITIALISATION ET NETTOYAGE ===

  useEffect(() => {
    cleanupSensitiveData();
    saveUIPreferences({
      theme: 'light',
      language: 'fr',
      notifications: true,
      sidebarCollapsed: false
    });
    saveSessionMetadata();
  }, []);

  // Chargement des données utilisateur
  const fetchUserData = async (token: string): Promise<void> => {
    try {
      const response = await fetch(`${VITE_API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erreur de récupération du profil');
      }

      const userData = await response.json();
      const mappedUser: User = {
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        isActive: userData.isActive,
        telephone: userData.telephone || userData.phone || ''
      };
      setUser(mappedUser);
      
    } catch (err) {
      console.error('Erreur fetchUserData:', err);
      logout();
    }
  };

  // Connexion
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${VITE_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur de connexion');
      }

      localStorage.setItem('token', data.accessToken);
      setToken(data.accessToken);
      setUser(data.user);

      // Configurer le rafraîchissement automatique
      const decoded = jwtDecode<JwtPayload>(data.accessToken);
      setupTokenRefresh(decoded.exp);
      saveSessionMetadata();

      // Redirection basée sur le rôle
      const redirectPath = data.user.role === 'admin' 
        ? '/gestionnaire/statistiques' 
        : '/';
      
      navigate(redirectPath);
      
    } catch (err: any) {
      toast.error(err.message || 'Erreur de connexion');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (formData: RegisterFormData): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      saveNavigationState();

      const response = await fetch(`${VITE_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          telephone: formData.phone,
          password: formData.password,
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.errors 
          ? Object.values(data.errors).join(', ') 
          : data.message || "Erreur lors de l'inscription";
        throw new Error(errorMsg);
      }

      await login(formData.email, formData.password);
    } catch (err) {
      removeFromSession(ALLOWED_SESSION_KEYS.REDIRECT_PATH);
      removeFromSession(ALLOWED_SESSION_KEYS.LOGIN_TIMESTAMP);
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Stocker un hash de l'email pour pré-remplissage (pas l'email en clair)
      const emailHash = btoa(email).slice(0, 16);
      saveToSession('password_reset_hash', { hash: emailHash, timestamp: Date.now() });

      const response = await fetch(`${VITE_API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Erreur lors de l'envoi de l'email");
      }

      toast.success(`Un email de réinitialisation a été envoyé à ${email}`);
      navigate('/connexion');
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${VITE_API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors de la réinitialisation');
      }

      removeFromSession('password_reset_hash');
      toast.success('Mot de passe réinitialisé avec succès');
      navigate('/connexion');
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

   // Déconnexion
  const logout = (redirectPath?: string, silent?: boolean): void => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);

    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }

    if (!silent && token) {
      fetch(`${VITE_API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      }).catch(() => {});
    }

    // Mettre à jour explicitement les métadonnées de session avec hasActiveSession: false
    saveToSession(ALLOWED_SESSION_KEYS.SESSION_METADATA, {
      sessionStart: Date.now(),
      sessionId: Math.random().toString(36).substring(2, 15),
      userAgent: navigator.userAgent.substring(0, 50),
      hasActiveSession: false // Explicitement false lors de la déconnexion
    });
    
    navigate(redirectPath ?? '/');
  };

  const handleAuthError = (error: any): void => {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Une erreur est survenue';
    
    setError(errorMessage);
    toast.error(errorMessage);
  };

  // === VÉRIFICATION D'AUTHENTIFICATION AU CHARGEMENT ===
  const checkAuth = async (): Promise<void> => {
    const savedToken = localStorage.getItem('token');
    
    if (!savedToken) {
      // S'assurer que les métadonnées de session reflètent l'absence de session active
      saveToSession(ALLOWED_SESSION_KEYS.SESSION_METADATA, {
        sessionStart: Date.now(),
        sessionId: Math.random().toString(36).substring(2, 15),
        userAgent: navigator.userAgent.substring(0, 50),
        hasActiveSession: false
      });
      setIsLoading(false);
      return;
    }

    try {
      // Vérifier si le token est expiré
      const decoded = jwtDecode<JwtPayload>(savedToken);
      const isTokenExpired = decoded.exp * 1000 < Date.now();

      if (isTokenExpired) {
        const refreshed = await refreshTokenFunction();
        if (!refreshed) {
          logout('/', true);
          return;
        }
      } else {
        // Token valide, charger les données utilisateur
        await fetchUserData(savedToken);
        setupTokenRefresh(decoded.exp);
      }
    } catch (error) {
      console.error('Erreur vérification auth:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  

  useEffect(() => {
    let isMounted = true;
    let interval: number | undefined;

    const initializeAuth = async () => {
      if (!isMounted) return;
      await checkAuth();
      if (isMounted) {
        interval = window.setInterval(() => {
          if (token) {
            checkAuth().catch(() => {});
          }
        }, 5 * 60 * 1000);
        checkIntervalRef.current = interval;
      }
    };

    initializeAuth();
    return () => {
      isMounted = false;
      if (interval) window.clearInterval(interval);
      if (checkIntervalRef.current) {
        window.clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    error,
    login,
    logout,
    register,
    forgotPassword,
    resetPassword,
    refreshToken: refreshTokenFunction,
    saveToSession,
    getFromSession,
    removeFromSession,
    clearSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useSecureSession = <T,>(key: string, defaultValue: T) => {
  const { saveToSession, getFromSession, removeFromSession } = useAuth();
  
  const [state, setState] = useState<T>(() => {
    return getFromSession(key) || defaultValue;
  });

  const setSessionState = (value: T): void => {
    setState(value);
    saveToSession(key, value);
  };

  const clearSessionState = (): void => {
    setState(defaultValue);
    removeFromSession(key);
  };

  return [state, setSessionState, clearSessionState] as const;
};