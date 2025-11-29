import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  isAdmin: boolean;
  isActive: boolean;
  telephone?: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  message: string;
  sessionMaxDuration: number;
}

interface RefreshResponse {
  access_token: string;
  refresh_token?: string;
  message: string;
  expiresIn: number;
  sessionMaxDuration: number;
  sessionExpired?: boolean;
  loggedOut?: boolean;
  requiresReauth?: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  telephone: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  logoutAll: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  clearAuth: () => void;
  error: string | null;
  getCookie: (name: string) => string | null;
  clearError: () => void;
}

// 🔥 CONSTANTES STRICTEMENT CONFORMES AU BACKEND
const AUTH_CONSTANTS = {
  JWT_EXPIRATION: 15 * 60 * 1000, // 15 minutes en ms
  REFRESH_TOKEN_EXPIRATION: 25 * 60 * 1000, // 25 minutes en ms - CONFORME BACKEND
  MAX_SESSION_DURATION_MS: 25 * 60 * 1000, // 25 minutes - CONFORME BACKEND
  REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes avant expiration
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const REQUEST_TIMEOUT = 10000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const clearError = useCallback(() => setError(null), []);

  // 🔥 MÉTHODE CONFORME : Extraction iat depuis token JWT
  const getTokenIssuedTime = useCallback((token: string): number => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.iat * 1000; // Convertir en ms
    } catch {
      return Date.now();
    }
  }, []);

  // 🔥 MÉTHODE CONFORME : Vérification durée session basée sur iat
  const isSessionExpired = useCallback(
    (token: string): boolean => {
      const issuedTime = getTokenIssuedTime(token);
      return Date.now() - issuedTime > AUTH_CONSTANTS.MAX_SESSION_DURATION_MS;
    },
    [getTokenIssuedTime]
  );

  const maskEmail = (email: string): string => {
    if (!email) return '********';
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return '********';
    const maskedLocal =
      localPart.length > 2
        ? `${localPart.substring(0, 2)}${'*'.repeat(Math.max(1, localPart.length - 2))}`
        : '***';
    return `${maskedLocal}@${domain}`;
  };

  const handleApiError = useCallback((error: any, context: string) => {
    if (error?.response?.status === 401) {
      console.warn(`🔒 Erreur d'authentification lors de ${context}`);
      clearAuth();
    } else if (error?.response?.status === 429) {
      console.warn(`🚫 Trop de requêtes lors de ${context}`);
      setError('Trop de tentatives. Veuillez réessayer plus tard.');
    } else {
      console.error(`❌ Erreur ${context}:`, error);
      const safeMessage = error?.response?.data?.message
        ? error.response.data.message
        : `Une erreur est survenue lors de ${context}`;
      setError(safeMessage);
    }
  }, []);

  const getCookieDomainConfig = (): string => {
    if (import.meta.env.PROD) {
      const hostname = window.location.hostname;
      if (hostname === 'panameconsulting.vercel.app') {
        return 'domain=panameconsulting.vercel.app; path=/; secure; sameSite=none';
      }
      if (hostname.includes('panameconsulting.com')) {
        return 'domain=.panameconsulting.com; path=/; secure; sameSite=none';
      }
      return 'path=/; secure; sameSite=none';
    }
    return 'path=/; sameSite=lax';
  };

  const getCookie = useCallback((name: string): string | null => {
    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    } catch (error) {
      console.error('❌ Erreur lecture cookie:', error);
      return null;
    }
  }, []);

  const setCookie = useCallback(
    (name: string, value: string, maxAge: number) => {
      try {
        const domainConfig = getCookieDomainConfig();
        document.cookie = `${name}=${value}; max-age=${maxAge / 1000}; ${domainConfig}`;
      } catch (error) {
        console.error('❌ Erreur écriture cookie:', error);
      }
    },
    []
  );

  const deleteCookie = useCallback((name: string) => {
    try {
      const domainConfig = getCookieDomainConfig()
        .replace('secure; ', '')
        .replace('sameSite=none', 'sameSite=lax');
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${domainConfig}`;
    } catch (error) {
      console.error('❌ Erreur suppression cookie:', error);
    }
  }, []);

  // 🔥 MÉTHODE CONFORME : Nettoyage basé uniquement sur cookies
  const clearAuth = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    deleteCookie('access_token');
    deleteCookie('refresh_token');
    // 🔥 SUPPRESSION STOCKAGE LOCAL - CONFORME BACKEND
  }, [deleteCookie]);

  // 🔥 MÉTHODE CONFORME : Pas de persistance dans localStorage
  const setAuth = useCallback((userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  const fetchWithTimeout = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          credentials: 'include',
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    []
  );

  const fetchUserData = useCallback(async (): Promise<User | null> => {
    const accessToken = getCookie('access_token');

    if (!accessToken) {
      console.warn('❌ Aucun token trouvé pour fetchUserData');
      return null;
    }

    // 🔥 VÉRIFICATION SESSION BASÉE SUR IAT - CONFORME BACKEND
    if (isSessionExpired(accessToken)) {
      console.warn('🔒 Session expirée (25min) lors de fetchUserData');
      clearAuth();
      return null;
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('🚨 Token invalide lors de fetchUserData');
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const userData = await response.json();
      console.log('✅ Données utilisateur récupérées');
      return userData;
    } catch (error) {
      console.error('❌ Erreur fetchUserData:', error);
      return null;
    }
  }, [fetchWithTimeout, getCookie, isSessionExpired, clearAuth]);

  // 🔥 MÉTHODE CONFORME : Logique de rafraîchissement alignée backend
  const refreshAuth = useCallback(async (): Promise<boolean> => {
    const refreshToken = getCookie('refresh_token');

    if (!refreshToken) {
      console.warn('❌ Aucun refresh token disponible');
      clearAuth();
      return false;
    }

    try {
      console.log('🔄 Tentative de rafraîchissement du token...');

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/auth/refresh`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      const data: RefreshResponse = await response.json();

      if (!response.ok || data.sessionExpired || data.loggedOut) {
        console.warn('❌ Session expirée ou déconnectée');
        clearAuth();
        if (data.requiresReauth) {
          navigate('/connexion', {
            state: {
              from: location.pathname,
              message: 'Session expirée - Veuillez vous reconnecter',
            },
            replace: true,
          });
        }
        return false;
      }

      if (!data.access_token) {
        console.warn('❌ Aucun access token dans la réponse');
        return false;
      }

      // 🔥 CONFIGURATION COOKIES CONFORME BACKEND
      setCookie(
        'access_token',
        data.access_token,
        AUTH_CONSTANTS.JWT_EXPIRATION
      );

      if (data.refresh_token) {
        setCookie(
          'refresh_token',
          data.refresh_token,
          AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRATION
        );
      }

      const userData = await fetchUserData();
      if (userData) {
        setAuth(userData);
        console.log('✅ Token rafraîchi avec succès');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Erreur refreshAuth:', error);
      clearAuth();
      return false;
    }
  }, [
    clearAuth,
    fetchUserData,
    fetchWithTimeout,
    getCookie,
    navigate,
    location.pathname,
    setAuth,
    setCookie,
  ]);

  // 🔥 MÉTHODE CONFORME : Vérification basée uniquement sur cookies/tokens
  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      clearError();

      const accessToken = getCookie('access_token');
      const refreshToken = getCookie('refresh_token');

      console.log('🔍 CheckAuth - Tokens présents:', {
        access: !!accessToken,
        refresh: !!refreshToken,
      });

      if (!accessToken && !refreshToken) {
        console.log('🔍 Aucun token disponible');
        clearAuth();
        return false;
      }

      // 🔥 VÉRIFICATION SESSION BASÉE SUR IAT - CONFORME BACKEND
      if (accessToken && isSessionExpired(accessToken)) {
        console.warn('🔒 Session expirée (25min) au checkAuth');
        clearAuth();
        return false;
      }

      if (accessToken) {
        console.log('🔍 Validation avec access token');
        const userData = await fetchUserData();

        if (userData) {
          setAuth(userData);
          return true;
        }
      }

      // 🔥 TENTATIVE RAFRAÎCHISSEMENT SI ACCESS TOKEN MANQUANT OU INVALIDE
      if (refreshToken) {
        console.log(
          '🔄 Refresh token disponible, tentative de rafraîchissement...'
        );
        return await refreshAuth();
      }

      return false;
    } catch (error) {
      console.error('❌ Erreur checkAuth:', error);
      clearAuth();
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [
    clearAuth,
    clearError,
    fetchUserData,
    getCookie,
    isSessionExpired,
    refreshAuth,
    setAuth,
  ]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      try {
        setIsLoading(true);
        clearError();

        console.log(
          `🔐 Tentative de connexion pour: ${maskEmail(credentials.email)}`
        );

        const response = await fetchWithTimeout(
          `${API_BASE_URL}/api/auth/login`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
          }
        );

        const data: AuthResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Erreur lors de la connexion');
        }

        if (!data.access_token || !data.refresh_token || !data.user) {
          throw new Error('Réponse de connexion invalide');
        }

        // 🔥 CONFIGURATION COOKIES CONFORME BACKEND
        setCookie(
          'access_token',
          data.access_token,
          AUTH_CONSTANTS.JWT_EXPIRATION
        );
        setCookie(
          'refresh_token',
          data.refresh_token,
          AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRATION
        );

        setAuth(data.user);

        console.log(
          `✅ Connexion réussie pour: ${maskEmail(credentials.email)}`
        );

        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } catch (error) {
        handleApiError(error, 'la connexion');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [
      clearError,
      fetchWithTimeout,
      handleApiError,
      location.state,
      navigate,
      setAuth,
      setCookie,
    ]
  );

  const register = useCallback(
    async (registerData: RegisterData): Promise<void> => {
      try {
        setIsLoading(true);
        clearError();

        console.log(
          `📝 Tentative d'inscription pour: ${maskEmail(registerData.email)}`
        );

        const response = await fetchWithTimeout(
          `${API_BASE_URL}/api/auth/register`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(registerData),
          }
        );

        const data: AuthResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Erreur lors de l'inscription");
        }

        if (!data.access_token || !data.refresh_token || !data.user) {
          throw new Error("Réponse d'inscription invalide");
        }

        // 🔥 CONFIGURATION COOKIES CONFORME BACKEND
        setCookie(
          'access_token',
          data.access_token,
          AUTH_CONSTANTS.JWT_EXPIRATION
        );
        setCookie(
          'refresh_token',
          data.refresh_token,
          AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRATION
        );

        setAuth(data.user);

        console.log(
          `✅ Inscription réussie pour: ${maskEmail(registerData.email)}`
        );

        navigate('/', { replace: true });
      } catch (error) {
        handleApiError(error, "l'inscription");
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, fetchWithTimeout, handleApiError, navigate, setAuth, setCookie]
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      clearError();

      const accessToken = getCookie('access_token');

      if (accessToken) {
        try {
          await fetchWithTimeout(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (error: unknown) {
          console.warn(
            '⚠️ Erreur lors de la déconnexion côté serveur, nettoyage côté client maintenu'
          );
        }
      }

      clearAuth();

      console.log('✅ Déconnexion réussie');

      navigate('/connexion', {
        replace: true,
        state: {
          message: 'Déconnexion réussie',
        },
      });
    } catch (error: unknown) {
      console.error('❌ Erreur lors de la déconnexion:', error);
      clearAuth();
      navigate('/connexion', { replace: true });
    } finally {
      setIsLoading(false);
    }
  }, [clearAuth, clearError, fetchWithTimeout, getCookie, navigate]);

  const logoutAll = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      clearError();

      const accessToken = getCookie('access_token');

      console.log(`🛡️ Déconnexion globale initiée`);

      if (!accessToken) {
        throw new Error('Token manquant pour la déconnexion globale');
      }

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/auth/logout-all`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json() as { message: string };
        throw new Error(
          errorData.message || 'Erreur lors de la déconnexion globale'
        );
      }

      const result = await response.json();

      console.log('✅ Déconnexion globale réussie:', result.message);
    } catch (error: unknown) {
      handleApiError(error as Error, 'la déconnexion globale');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [clearError, fetchWithTimeout, getCookie, handleApiError]);

  // 🔥 INITIALISATION CONFORME : Basée uniquement sur cookies
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('❌ Erreur initialisation auth:', error);
        if (isMounted) clearAuth();
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [checkAuth, clearAuth]);

  // 🔥 INTERVALLE DE RAFRAÎCHISSEMENT CONFORME
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      const accessToken = getCookie('access_token');

      if (accessToken) {
        const issuedTime = getTokenIssuedTime(accessToken);
        const tokenAge = Date.now() - issuedTime;

        // 🔥 RAFRAÎCHISSEMENT 5min AVANT EXPIRATION - CONFORME BACKEND
        if (
          tokenAge >
          AUTH_CONSTANTS.JWT_EXPIRATION - AUTH_CONSTANTS.REFRESH_THRESHOLD
        ) {
          console.log('🔄 Rafraîchissement automatique du token...');
          await refreshAuth();
        }

        // 🔥 DÉCONNEXION SI SESSION > 25min - CONFORME BACKEND
        if (tokenAge > AUTH_CONSTANTS.MAX_SESSION_DURATION_MS) {
          console.warn('🔒 Déconnexion automatique (session > 25min)');
          await logout();
        }
      }
    }, 30000); // Vérifier toutes les 30 secondes

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshAuth, logout, getCookie, getTokenIssuedTime]);

  const contextValue: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    error,
    login,
    register,
    logout,
    logoutAll,
    refreshAuth,
    checkAuth,
    clearAuth,
    clearError,
    getCookie,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth doit être utilisé within un AuthProvider');
  }

  return context;
};

export default AuthContext;
