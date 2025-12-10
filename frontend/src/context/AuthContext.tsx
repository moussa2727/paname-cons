import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';

// ==================== INTERFACES TYPESCRIPT ====================
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  telephone: string;
  isAdmin?: boolean;
}

enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  password: string;
  confirmPassword: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  exp: number;
  iat: number;
  jti?: string;
  tokenType?: string;
}

interface LoginResponse {
  code: string;
  access_token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isAdmin: boolean;
    telephone: string;
  };
  message?: string;
}

interface RegisterResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    telephone: string;
  };
  message?: string;
}

interface LogoutAllResponse {
  success: boolean;
  message: string;
  stats: {
    usersLoggedOut: number;
    adminPreserved: boolean;
    duration: string;
    timestamp: string;
    userEmails: string[];
  };
}

interface RefreshResponse {
  access_token: string;
  refresh_token?: string;
  message?: string;
  expiresIn?: number;
  loggedOut?: boolean;
  sessionExpired?: boolean;
  requiresReauth?: boolean;
}

interface AuthContextType {
  user: User | null;
  access_token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  logoutAll: () => Promise<LogoutAllResponse>;
  register: (data: RegisterFormData) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  refreshToken: () => Promise<boolean>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updateProfile: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>;
}

// ==================== CONSTANTS SYNCHRONISÉES AVEC BACKEND ====================
const AUTH_CONSTANTS = {
  ACCESS_TOKEN_EXPIRATION_MS: 15 * 60 * 1000,
  REFRESH_TOKEN_EXPIRATION_MS: 10 * 60 * 1000,
  MAX_SESSION_DURATION_MS: 30 * 60 * 1000,
  PREVENTIVE_REFRESH_MS: 1 * 60 * 1000,
  MAX_REFRESH_ATTEMPTS: 3,
  SESSION_CHECK_INTERVAL: 30 * 1000,
  REQUEST_COOLDOWN_MS: 12000,
  MIN_REFRESH_INTERVAL_MS: 2 * 60 * 1000,
  ERROR_CODES: {
    PASSWORD_RESET_REQUIRED: 'PASSWORD RESET REQUIRED',
    INVALID_CREDENTIALS: 'INVALID CREDENTIALS',
    COMPTE_DESACTIVE: 'COMPTE DESACTIVE',
    COMPTE_TEMPORAIREMENT_DECONNECTE: 'COMPTE TEMPORAIREMENT DECONNECTE',
    MAINTENANCE_MODE: 'MAINTENANCE_MODE',
    SESSION_EXPIRED: 'SESSION EXPIRED',
    NO_PASSWORD_IN_DB: 'NO PASSWORD IN DB',
    AUTH_ERROR: 'AUTH ERROR',
    TOO_MANY_REQUESTS: 'TOO MANY REQUESTS',
  } as const,

  REVOCATION_REASONS: {
    USER_LOGOUT: 'user logout',
    ADMIN_GLOBAL_LOGOUT: 'admin global logout 24h',
    SESSION_EXPIRED: 'session expired',
  } as const,
} as const;

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  USER_DATA: 'user_data',
  SESSION_START: 'session_start',
  REFRESH_ATTEMPTS: 'refresh_attempts',
  LAST_REFRESH_TIME: 'last_refresh_time',
  LAST_REQUEST_TIME: 'last_request_time',
} as const;

const REDIRECT_PATHS = {
  LOGIN: '/connexion',
  HOME: '/',
  ADMIN_DASHBOARD: '/gestionnaire/statistiques',
  RESET_PASSWORD_REQUIRED: '/reset-password-required',
} as const;

const TOAST_MESSAGES = {
  LOGIN_SUCCESS: 'Connexion réussie !',
  LOGOUT_SUCCESS: 'Déconnexion réussie',
  REGISTER_SUCCESS: 'Inscription réussie !',
  PASSWORD_RESET_SUCCESS: 'Mot de passe réinitialisé avec succès !',
  SESSION_EXPIRED: 'Session expirée après 30 minutes. Veuillez vous reconnecter.',
  LOGOUT_ALL_SUCCESS: 'Déconnexion globale réussie',
  FORGOT_PASSWORD_SUCCESS: 'Si votre email est enregistré, vous recevrez un lien de réinitialisation',
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect',
  ACCOUNT_DISABLED: 'Votre compte a été désactivé',
  ACCOUNT_TEMP_DISCONNECTED: (hours: number) => `Votre compte est temporairement déconnecté. Réessayez dans ${hours} heures.`,
  MAINTENANCE_MODE: 'Système en maintenance',
  PASSWORD_RESET_REQUIRED: 'Un mot de passe doit être défini pour ce compte',
  TOKEN_REFRESHED: 'Session rafraîchie',
  NETWORK_ERROR: 'Erreur réseau. Vérifiez votre connexion.',
  TOKEN_INVALID: 'Session invalide. Veuillez vous reconnecter.',
  TOO_MANY_REQUESTS: 'Trop de requêtes. Veuillez patienter.',
} as const;

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'https://panameconsulting.up.railway.app',
  ENDPOINTS: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    LOGOUT_ALL: '/api/auth/logout-all',
    REFRESH: '/api/auth/refresh',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    ME: '/api/auth/me',
  } as const,
} as const;

// ==================== UTILITAIRES ====================
const shouldMakeRequest = (): boolean => {
  const lastRequestTime = window.localStorage?.getItem(STORAGE_KEYS.LAST_REQUEST_TIME);
  if (!lastRequestTime) return true;
  
  const timeSinceLastRequest = Date.now() - parseInt(lastRequestTime);
  
  // Augmenter le délai minimum entre requêtes
  const minDelay = AUTH_CONSTANTS.REQUEST_COOLDOWN_MS; // 6000ms = 6 secondes
  
  if (timeSinceLastRequest < minDelay) {
    if (import.meta.env.DEV) {
      console.log(`⏰ Trop tôt pour requête (${Math.round(timeSinceLastRequest/1000)}s, besoin de ${Math.round(minDelay/1000)}s)`);
    }
    return false;
  }
  
  return true;
};
const updateLastRequestTime = (): void => {
  window.localStorage?.setItem(STORAGE_KEYS.LAST_REQUEST_TIME, Date.now().toString());
};

const isTokenExpiringSoon = (exp: number): boolean => {
  const tokenExpirationMs = exp * 1000;
  const currentTimeMs = Date.now();
  const timeUntilExpiration = tokenExpirationMs - currentTimeMs;
  return timeUntilExpiration < AUTH_CONSTANTS.PREVENTIVE_REFRESH_MS;
};

// ==================== CONTEXT ====================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(() => {
    const stored = window.localStorage?.getItem(STORAGE_KEYS.USER_DATA);
    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [access_token, setAccessToken] = useState<string | null>(() => {
    return window.localStorage?.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  });

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTimeoutRef = useRef<number | null>(null);
  const sessionCheckIntervalRef = useRef<number | null>(null);
  const refreshAttemptsRef = useRef(0);
  const isRefreshingRef = useRef(false);

  // ==================== FONCTIONS ESSENTIELLES ====================
  const cleanupAuthData = useCallback((): void => {
    if (import.meta.env.DEV) {
      console.log('🧹 Nettoyage des données d\'authentification');
    }

    Object.values(STORAGE_KEYS).forEach(key => {
      window.localStorage?.removeItem(key);
    });

    setAccessToken(null);
    setUser(null);
    setError(null);
    refreshAttemptsRef.current = 0;
    isRefreshingRef.current = false;

    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    if (sessionCheckIntervalRef.current) {
      window.clearInterval(sessionCheckIntervalRef.current);
      sessionCheckIntervalRef.current = null;
    }
  }, []);

  const fetchWithAuth = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    if (!shouldMakeRequest()) {
      throw new Error(AUTH_CONSTANTS.ERROR_CODES.TOO_MANY_REQUESTS);
    }

    updateLastRequestTime();

    const token = access_token || window.localStorage?.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await window.fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.status === 429) {
      toast.warn(TOAST_MESSAGES.TOO_MANY_REQUESTS);
      throw new Error(AUTH_CONSTANTS.ERROR_CODES.TOO_MANY_REQUESTS);
    }

    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      
      if (errorData.sessionExpired || errorData.loggedOut || errorData.requiresReauth) {
        if (import.meta.env.DEV) {
          console.log('🔒 Session expirée détectée par fetchWithAuth');
        }
        
        cleanupAuthData();
        
        if (!window.location.pathname.includes('/connexion')) {
          toast.info(TOAST_MESSAGES.SESSION_EXPIRED);
        }
        
        navigate(REDIRECT_PATHS.LOGIN, { replace: true });
        throw new Error('SESSION_EXPIRED');
      }
      
      if (errorData.code) {
        throw new Error(errorData.code);
      }
    }

    return response;
  }, [access_token, cleanupAuthData, navigate]);

 
const fetchUserData = useCallback(async (): Promise<void> => {
  // Vérifier si un refresh est déjà en cours
  if (isRefreshingRef.current) {
    console.log('⚠️ Refresh en cours, fetchUserData ignoré');
    return;
  }

  // Attendre un peu si une requête vient d'être faite
  const lastFetchTime = window.localStorage?.getItem('last_fetch_user_time');
  if (lastFetchTime) {
    const timeSinceLastFetch = Date.now() - parseInt(lastFetchTime);
    if (timeSinceLastFetch < 10000) { // Attendre 10 secondes entre les fetch
      console.log(`⏰ Trop tôt pour fetch user (${Math.round(timeSinceLastFetch/1000)}s)`);
      return;
    }
  }

  try {
    const response = await fetchWithAuth(API_CONFIG.ENDPOINTS.ME);
    
    if (!response.ok) {
      // NE PAS jeter d'erreur pour ne pas déclencher de boucle
      console.warn('⚠️ Erreur de récupération du profil, ignoré');
      return;
    }

    const userData = await response.json();

    const mappedUser: User = {
      id: userData.id || userData._id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      isActive: userData.isActive !== false,
      telephone: userData.telephone,
      isAdmin: userData.role === UserRole.ADMIN,
    };

    setUser(mappedUser);
    window.localStorage?.setItem(
      STORAGE_KEYS.USER_DATA,
      JSON.stringify(mappedUser)
    );
    
    // Enregistrer le moment du fetch réussi
    window.localStorage?.setItem('last_fetch_user_time', Date.now().toString());
    
    console.log('✅ Profil utilisateur récupéré:', mappedUser.email);
  } catch (error) {
    // Attraper l'erreur sans la relancer
    console.warn('⚠️ Erreur récupération utilisateur, ignoré:', error);
    
    // En cas d'erreur 429, attendre plus longtemps
    if (error instanceof Error && error.message.includes('TOO MANY REQUESTS')) {
      window.localStorage?.setItem('last_fetch_user_time', (Date.now() + 30000).toString());
    }
  }
}, [fetchWithAuth]);

  const updateProfile = useCallback(async (): Promise<void> => {
    await fetchUserData();
  }, [fetchUserData]);

  const handleAuthError = useCallback((error: any, context: string = ''): void => {
    const errorMessage = error.message || 'Erreur inconnue';
    
    if (import.meta.env.DEV) {
      console.error(`❌ Erreur auth [${context}]:`, errorMessage);
    }
    
    if (errorMessage.includes(AUTH_CONSTANTS.ERROR_CODES.TOO_MANY_REQUESTS)) {
      toast.warn(TOAST_MESSAGES.TOO_MANY_REQUESTS, { autoClose: 5000 });
    } else if (errorMessage.includes(AUTH_CONSTANTS.ERROR_CODES.PASSWORD_RESET_REQUIRED)) {
      toast.error(TOAST_MESSAGES.PASSWORD_RESET_REQUIRED, { autoClose: 8000 });
      navigate(REDIRECT_PATHS.RESET_PASSWORD_REQUIRED, { 
        state: { email: error.email || '', reason: 'password_reset_required' } 
      });
    } else if (errorMessage.includes(AUTH_CONSTANTS.ERROR_CODES.COMPTE_DESACTIVE)) {
      toast.error(TOAST_MESSAGES.ACCOUNT_DISABLED, { autoClose: 8000 });
    } else if (errorMessage.includes(AUTH_CONSTANTS.ERROR_CODES.COMPTE_TEMPORAIREMENT_DECONNECTE)) {
      const hoursMatch = errorMessage.match(/:(\d+)/);
      const hours = hoursMatch ? parseInt(hoursMatch[1]) : 24;
      toast.error(TOAST_MESSAGES.ACCOUNT_TEMP_DISCONNECTED(hours), { autoClose: 10000 });
    } else if (errorMessage.includes(AUTH_CONSTANTS.ERROR_CODES.MAINTENANCE_MODE)) {
      toast.error(TOAST_MESSAGES.MAINTENANCE_MODE, { autoClose: 8000 });
    } else if (errorMessage.includes(AUTH_CONSTANTS.ERROR_CODES.INVALID_CREDENTIALS)) {
      toast.error(TOAST_MESSAGES.INVALID_CREDENTIALS, { autoClose: 4000 });
    } else if (errorMessage === 'SESSION_EXPIRED') {
      // Ne pas montrer de toast supplémentaire
    } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      toast.error(TOAST_MESSAGES.NETWORK_ERROR, { autoClose: 5000 });
    } else {
      toast.error(errorMessage, { autoClose: 5000 });
    }
    
    setError(errorMessage);
  }, [navigate]);

  // ==================== MÉTHODES D'AUTHENTIFICATION ====================
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      if (!shouldMakeRequest()) {
        setIsLoading(false);
        toast.warn(TOAST_MESSAGES.TOO_MANY_REQUESTS);
        return;
      }

      updateLastRequestTime();

      try {
        const response = await window.fetch(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
            credentials: 'include',
          }
        );

        const data: LoginResponse = await response.json();

        if (!response.ok) {
          if (data.code === AUTH_CONSTANTS.ERROR_CODES.INVALID_CREDENTIALS) {
            throw new Error(AUTH_CONSTANTS.ERROR_CODES.INVALID_CREDENTIALS);
          }
          
          if (data.code === AUTH_CONSTANTS.ERROR_CODES.PASSWORD_RESET_REQUIRED) {
            throw new Error(AUTH_CONSTANTS.ERROR_CODES.PASSWORD_RESET_REQUIRED);
          }
          
          if (data.code === AUTH_CONSTANTS.ERROR_CODES.COMPTE_DESACTIVE) {
            throw new Error(AUTH_CONSTANTS.ERROR_CODES.COMPTE_DESACTIVE);
          }
          
          if (data.code === AUTH_CONSTANTS.ERROR_CODES.COMPTE_TEMPORAIREMENT_DECONNECTE) {
            throw new Error(`${AUTH_CONSTANTS.ERROR_CODES.COMPTE_TEMPORAIREMENT_DECONNECTE}:${data || 24}`);
          }
          
          if (data.code === AUTH_CONSTANTS.ERROR_CODES.MAINTENANCE_MODE) {
            throw new Error(AUTH_CONSTANTS.ERROR_CODES.MAINTENANCE_MODE);
          }
          
          throw new Error(data.message || 'Erreur de connexion');
        }

        if (!data.access_token || !data.user) {
          throw new Error('Réponse invalide du serveur');
        }

        window.localStorage?.setItem(
          STORAGE_KEYS.ACCESS_TOKEN,
          data.access_token
        );
        setAccessToken(data.access_token);

        const userData: User = {
          id: data.user.id,
          email: data.user.email.trim().toLowerCase(), // ✅ Normaliser ici
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          role: data.user.role,
          telephone: data.user.telephone,
          isActive: true,
          isAdmin: data.user.role === UserRole.ADMIN,
        };

        setUser(userData);
        window.localStorage?.setItem(
          STORAGE_KEYS.USER_DATA,
          JSON.stringify(userData)
        );
        window.localStorage?.setItem(
          STORAGE_KEYS.SESSION_START,
          Date.now().toString()
        );

        const decoded = jwtDecode<JwtPayload>(data.access_token);
        
        // Planifier le rafraîchissement du token
        if (refreshTimeoutRef.current) {
          window.clearTimeout(refreshTimeoutRef.current);
        }
        
        const tokenExpirationMs = decoded.exp * 1000;
        const currentTimeMs = Date.now();
        const timeUntilExpiration = tokenExpirationMs - currentTimeMs;
        
        const refreshTime = Math.max(
          30000,
          timeUntilExpiration - AUTH_CONSTANTS.PREVENTIVE_REFRESH_MS
        );

        if (refreshTime > 0) {
          refreshTimeoutRef.current = window.setTimeout(async () => {
            if (import.meta.env.DEV) {
              console.log('🔄 Rafraîchissement préventif du token...');
            }
            
            if (refreshAttemptsRef.current < AUTH_CONSTANTS.MAX_REFRESH_ATTEMPTS) {
              const refreshed = await refreshToken();
              if (refreshed) {
                refreshAttemptsRef.current = 0;
                if (import.meta.env.DEV) {
                  console.log('✅ Token rafraîchi avec succès');
                }
              } else {
                refreshAttemptsRef.current++;
                if (import.meta.env.DEV) {
                  console.warn(`❌ Échec rafraîchissement (tentative ${refreshAttemptsRef.current}/${AUTH_CONSTANTS.MAX_REFRESH_ATTEMPTS})`);
                }
              }
            } else {
              if (import.meta.env.DEV) {
                console.error('❌ Trop de tentatives de rafraîchissement, déconnexion');
              }
              logout();
              toast.info(TOAST_MESSAGES.SESSION_EXPIRED);
            }
          }, refreshTime);
          
          if (import.meta.env.DEV) {
            console.log(`⏰ Prochain rafraîchissement dans ${Math.round(refreshTime/1000)}s`);
          }
        }

        const redirectPath =
          data.user.role === UserRole.ADMIN
            ? REDIRECT_PATHS.ADMIN_DASHBOARD
            : REDIRECT_PATHS.HOME;

        navigate(redirectPath, { replace: true });
        toast.success(TOAST_MESSAGES.LOGIN_SUCCESS);
        
        if (import.meta.env.DEV) {
          console.log('✅ Connexion réussie pour:', data.user.email);
        }
      } catch (err: any) {
        if (import.meta.env.DEV) {
          console.error('❌ Erreur de connexion:', {
            message: err.message,
            stack: err.stack,
          });
        }
        
        handleAuthError(err, 'login');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, handleAuthError]
  );

  const register = useCallback(
    async (formData: RegisterFormData): Promise<void> => {
      setIsLoading(true);
      setError(null);

      if (!shouldMakeRequest()) {
        setIsLoading(false);
        toast.warn(TOAST_MESSAGES.TOO_MANY_REQUESTS);
        return;
      }

      updateLastRequestTime();

      try {
        const response = await window.fetch(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              telephone: formData.telephone,
              password: formData.password,
            }),
            credentials: 'include',
          }
        );

        const data: RegisterResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Erreur lors de l'inscription");
        }

        window.localStorage?.setItem(
          STORAGE_KEYS.ACCESS_TOKEN,
          data.access_token
        );
        setAccessToken(data.access_token);

        const userData: User = {
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          role: data.user.role,
          telephone: data.user.telephone,
          isActive: data.user.isActive,
          isAdmin: data.user.role === UserRole.ADMIN,
        };

        setUser(userData);
        window.localStorage?.setItem(
          STORAGE_KEYS.USER_DATA,
          JSON.stringify(userData)
        );
        window.localStorage?.setItem(
          STORAGE_KEYS.SESSION_START,
          Date.now().toString()
        );

        const decoded = jwtDecode<JwtPayload>(data.access_token);
        
        // Planifier le rafraîchissement du token
        if (refreshTimeoutRef.current) {
          window.clearTimeout(refreshTimeoutRef.current);
        }
        
        const tokenExpirationMs = decoded.exp * 1000;
        const currentTimeMs = Date.now();
        const timeUntilExpiration = tokenExpirationMs - currentTimeMs;
        
        const refreshTime = Math.max(
          30000,
          timeUntilExpiration - AUTH_CONSTANTS.PREVENTIVE_REFRESH_MS
        );

        if (refreshTime > 0) {
          refreshTimeoutRef.current = window.setTimeout(async () => {
            if (import.meta.env.DEV) {
              console.log('🔄 Rafraîchissement préventif du token...');
            }
            
            if (refreshAttemptsRef.current < AUTH_CONSTANTS.MAX_REFRESH_ATTEMPTS) {
              const refreshed = await refreshToken();
              if (refreshed) {
                refreshAttemptsRef.current = 0;
                if (import.meta.env.DEV) {
                  console.log('✅ Token rafraîchi avec succès');
                }
              } else {
                refreshAttemptsRef.current++;
                if (import.meta.env.DEV) {
                  console.warn(`❌ Échec rafraîchissement (tentative ${refreshAttemptsRef.current}/${AUTH_CONSTANTS.MAX_REFRESH_ATTEMPTS})`);
                }
              }
            } else {
              if (import.meta.env.DEV) {
                console.error('❌ Trop de tentatives de rafraîchissement, déconnexion');
              }
              logout();
              toast.info(TOAST_MESSAGES.SESSION_EXPIRED);
            }
          }, refreshTime);
        }

        const redirectPath =
          data.user.role === UserRole.ADMIN
            ? REDIRECT_PATHS.ADMIN_DASHBOARD
            : REDIRECT_PATHS.HOME;

        navigate(redirectPath, { replace: true });
        toast.success(TOAST_MESSAGES.REGISTER_SUCCESS);
        
        if (import.meta.env.DEV) {
          console.log('✅ Inscription réussie pour:', data.user.email);
        }
      } catch (err: any) {
        handleAuthError(err, 'register');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, handleAuthError]
  );

  const refreshToken = useCallback(async (): Promise<boolean> => {
  // Vérifier si un refresh est déjà en cours
  if (isRefreshingRef.current) {
    if (import.meta.env.DEV) {
      console.log('⚠️ Refresh déjà en cours, ignoré');
    }
    return false;
  }

  // Vérifier le temps depuis le dernier refresh
  const lastRefreshTime = window.localStorage?.getItem('last_refresh_time');
  if (lastRefreshTime) {
    const timeSinceLastRefresh = Date.now() - parseInt(lastRefreshTime);
    if (timeSinceLastRefresh < AUTH_CONSTANTS.MIN_REFRESH_INTERVAL_MS) {
      console.log(`⏰ Trop tôt pour rafraîchir (${Math.round(timeSinceLastRefresh/1000)}s après le dernier)`);
      return false;
    }
  }

  // Vérifier le nombre de tentatives
  if (refreshAttemptsRef.current >= AUTH_CONSTANTS.MAX_REFRESH_ATTEMPTS) {
    console.log(`❌ Trop de tentatives de rafraîchissement (${refreshAttemptsRef.current}/${AUTH_CONSTANTS.MAX_REFRESH_ATTEMPTS})`);
    cleanupAuthData();
    toast.info(TOAST_MESSAGES.SESSION_EXPIRED);
    return false;
  }

  // Vérifier la fréquence des requêtes
  if (!shouldMakeRequest()) {
    if (import.meta.env.DEV) {
      console.log('⚠️ Cooldown activé, refresh ignoré');
    }
    return false;
  }

  updateLastRequestTime();

  const currentToken = window.localStorage?.getItem(STORAGE_KEYS.ACCESS_TOKEN);

  if (!currentToken) {
    if (import.meta.env.DEV) {
      console.log('❌ Pas de token à rafraîchir');
    }
    return false;
  }

  // Vérifier si le token est déjà expiré
  try {
    const decoded = jwtDecode<JwtPayload>(currentToken);
    const isTokenExpired = decoded.exp * 1000 < Date.now();
    
    // Si le token n'est pas encore expiré, attendre plus longtemps
    if (!isTokenExpired) {
      const timeUntilExpiration = decoded.exp * 1000 - Date.now();
      if (timeUntilExpiration > AUTH_CONSTANTS.PREVENTIVE_REFRESH_MS * 2) {
        console.log(`⏰ Token encore valable pendant ${Math.round(timeUntilExpiration/1000)}s, pas besoin de refresh`);
        return false;
      }
    }
  } catch (error) {
    console.warn('⚠️ Erreur décodage token:', error);
  }

  isRefreshingRef.current = true;
  refreshAttemptsRef.current++;

  try {
    if (import.meta.env.DEV) {
      console.log(`🔄 Tentative de rafraîchissement du token (tentative ${refreshAttemptsRef.current}/${AUTH_CONSTANTS.MAX_REFRESH_ATTEMPTS})...`);
    }

    const response = await window.fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REFRESH}`,
      {
        method: 'POST',
        headers: {},
        credentials: 'include',
      }
    );

    if (response.status === 429) {
      toast.warn(TOAST_MESSAGES.TOO_MANY_REQUESTS);
      // Augmenter le délai avant le prochain essai
      window.localStorage?.setItem('last_refresh_time', (Date.now() + 60000).toString());
      return false;
    }

    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      
      if (import.meta.env.DEV) {
        console.log('❌ Refresh token invalide:', errorData);
      }
      
      if (errorData.sessionExpired || errorData.loggedOut || errorData.requiresReauth) {
        cleanupAuthData();
        return false;
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (errorData.requiresReauth) {
        toast.info(TOAST_MESSAGES.SESSION_EXPIRED);
        cleanupAuthData();
        return false;
      }
      
      if (import.meta.env.DEV) {
        console.warn(`❌ Refresh échoué: ${response.status}`);
      }
      return false;
    }

    const data: RefreshResponse = await response.json();

    if (!data.access_token) {
      if (import.meta.env.DEV) {
        console.error('❌ Pas de nouveau token reçu');
      }
      return false;
    }

    window.localStorage?.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
    setAccessToken(data.access_token);
    
    // Enregistrer le moment du refresh réussi
    window.localStorage?.setItem(
      STORAGE_KEYS.LAST_REFRESH_TIME,
      Date.now().toString()
    );

    // Réinitialiser le compteur d'essais en cas de succès
    refreshAttemptsRef.current = 0;

    // Mettre à jour les données utilisateur
    await fetchUserData();

    // Planifier le prochain rafraîchissement avec des délais plus longs
    try {
      const decoded = jwtDecode<JwtPayload>(data.access_token);
      
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
      
      const tokenExpirationMs = decoded.exp * 1000;
      const currentTimeMs = Date.now();
      const timeUntilExpiration = tokenExpirationMs - currentTimeMs;
      
      // Calculer le moment du prochain rafraîchissement
      // Attendre au moins 1 minute avant de rafraîchir à nouveau
      const minRefreshDelay = Math.max(60000, AUTH_CONSTANTS.MIN_REFRESH_INTERVAL_MS);
      const refreshTime = Math.max(
        minRefreshDelay,
        timeUntilExpiration - AUTH_CONSTANTS.PREVENTIVE_REFRESH_MS
      );

      if (refreshTime > 0) {
        refreshTimeoutRef.current = window.setTimeout(async () => {
          if (refreshAttemptsRef.current < AUTH_CONSTANTS.MAX_REFRESH_ATTEMPTS) {
            const refreshed = await refreshToken();
            if (refreshed) {
              refreshAttemptsRef.current = 0;
            } else {
              refreshAttemptsRef.current++;
            }
          } else {
            logout();
            toast.info(TOAST_MESSAGES.SESSION_EXPIRED);
          }
        }, refreshTime);
        
        if (import.meta.env.DEV) {
          console.log(`⏰ Prochain rafraîchissement dans ${Math.round(refreshTime/1000)}s`);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('⚠️ Erreur mise à jour timer:', error);
      }
    }

    if (import.meta.env.DEV) {
      console.log('✅ Token rafraîchi avec succès');
    }
    
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('❌ Erreur lors du refresh:', error);
    }

    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      if (import.meta.env.DEV) {
        console.warn('🌐 Erreur réseau - le token actuel reste valable');
      }
      // En cas d'erreur réseau, attendre plus longtemps avant de réessayer
      window.localStorage?.setItem('last_refresh_time', (Date.now() + 30000).toString());
      return false;
    }

    cleanupAuthData();
    return false;
  } finally {
    isRefreshingRef.current = false;
  }
}, [fetchUserData, cleanupAuthData]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      if (access_token && shouldMakeRequest()) {
        updateLastRequestTime();
        await fetchWithAuth(API_CONFIG.ENDPOINTS.LOGOUT, {
          method: 'POST',
        });
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('⚠️ Erreur logout backend (peut être normal):', error);
      }
    } finally {
      cleanupAuthData();
      navigate(REDIRECT_PATHS.LOGIN, { replace: true });
      toast.info(TOAST_MESSAGES.LOGOUT_SUCCESS);
    }
  }, [access_token, cleanupAuthData, navigate, fetchWithAuth]);

  const logoutAll = useCallback(async (): Promise<LogoutAllResponse> => {
    if (!access_token || user?.role !== UserRole.ADMIN) {
      throw new Error('Accès non autorisé - Admin seulement');
    }

    if (!shouldMakeRequest()) {
      toast.warn(TOAST_MESSAGES.TOO_MANY_REQUESTS);
      throw new Error(AUTH_CONSTANTS.ERROR_CODES.TOO_MANY_REQUESTS);
    }

    updateLastRequestTime();

    try {
      const response = await fetchWithAuth(API_CONFIG.ENDPOINTS.LOGOUT_ALL, {
        method: 'POST',
      });

      const data: LogoutAllResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la déconnexion globale');
      }

      toast.success(data.message || TOAST_MESSAGES.LOGOUT_ALL_SUCCESS);
      return data;
    } catch (err: any) {
      handleAuthError(err, 'logoutAll');
      throw err;
    }
  }, [access_token, user, fetchWithAuth, handleAuthError]);

  const forgotPassword = useCallback(
    async (email: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      if (!shouldMakeRequest()) {
        setIsLoading(false);
        toast.warn(TOAST_MESSAGES.TOO_MANY_REQUESTS);
        return;
      }

      updateLastRequestTime();

      try {
        const response = await window.fetch(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FORGOT_PASSWORD}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Erreur lors de l'envoi de l'email");
        }

        toast.success(TOAST_MESSAGES.FORGOT_PASSWORD_SUCCESS);
        navigate(REDIRECT_PATHS.LOGIN);
      } catch (err: any) {
        handleAuthError(err, 'forgotPassword');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, handleAuthError]
  );

  const checkAuth = useCallback(async (): Promise<void> => {
    const savedToken = window.localStorage?.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(savedToken);
      const isTokenExpired = decoded.exp * 1000 < Date.now();

      if (!isTokenExpired) {
        if (shouldMakeRequest()) {
          updateLastRequestTime();
          await fetchUserData();
        }
        
        // Planifier le rafraîchissement
        if (refreshTimeoutRef.current) {
          window.clearTimeout(refreshTimeoutRef.current);
        }
        
        const tokenExpirationMs = decoded.exp * 1000;
        const currentTimeMs = Date.now();
        const timeUntilExpiration = tokenExpirationMs - currentTimeMs;
        
        const refreshTime = Math.max(
          30000,
          timeUntilExpiration - AUTH_CONSTANTS.PREVENTIVE_REFRESH_MS
        );

        if (refreshTime > 0) {
          refreshTimeoutRef.current = window.setTimeout(async () => {
            if (refreshAttemptsRef.current < AUTH_CONSTANTS.MAX_REFRESH_ATTEMPTS) {
              const refreshed = await refreshToken();
              if (!refreshed) {
                refreshAttemptsRef.current++;
              } else {
                refreshAttemptsRef.current = 0;
              }
            } else {
              cleanupAuthData();
              toast.info(TOAST_MESSAGES.SESSION_EXPIRED);
            }
          }, refreshTime);
        }
      } else {
        if (import.meta.env.DEV) {
          console.log('⏰ Token expiré, tentative de rafraîchissement...');
        }
        
        if (!isRefreshingRef.current && shouldMakeRequest()) {
          const refreshed = await refreshToken();
          if (!refreshed) {
            cleanupAuthData();
          }
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('❌ Erreur vérification auth:', error);
      }
      cleanupAuthData();
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserData, refreshToken, cleanupAuthData]);

  const resetPassword = useCallback(
    async (token: string, newPassword: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      if (!shouldMakeRequest()) {
        setIsLoading(false);
        toast.warn(TOAST_MESSAGES.TOO_MANY_REQUESTS);
        return;
      }

      updateLastRequestTime();

      try {
        if (newPassword.length < 8) {
          throw new Error('Le mot de passe doit contenir au moins 8 caractères');
        }

        const hasLowerCase = /[a-z]/.test(newPassword);
        const hasUpperCase = /[A-Z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);

        if (!hasLowerCase || !hasUpperCase || !hasNumber) {
          throw new Error('Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre');
        }

        const response = await window.fetch(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.RESET_PASSWORD}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              newPassword,
              confirmPassword: newPassword,
            }),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Erreur lors de la réinitialisation');
        }

        toast.success(TOAST_MESSAGES.PASSWORD_RESET_SUCCESS);
        navigate(REDIRECT_PATHS.LOGIN, { replace: true });
      } catch (err: any) {
        handleAuthError(err, 'resetPassword');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, handleAuthError]
  );

  // ==================== EFFETS ====================
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async (): Promise<void> => {
      if (!isMounted) return;

      await checkAuth();

      if (isMounted) {
        sessionCheckIntervalRef.current = window.setInterval(() => {
          const sessionStart = window.localStorage?.getItem(
            STORAGE_KEYS.SESSION_START
          );
          if (sessionStart) {
            const sessionAge = Date.now() - parseInt(sessionStart);
            if (sessionAge > AUTH_CONSTANTS.MAX_SESSION_DURATION_MS) {
              if (import.meta.env.DEV) {
                console.log('⏰ Session expirée (30 minutes max)');
              }
              logout();
              toast.info(TOAST_MESSAGES.SESSION_EXPIRED);
            }
          }
        }, 60 * 1000);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
      if (sessionCheckIntervalRef.current) {
        window.clearInterval(sessionCheckIntervalRef.current);
      }
    };
  }, [checkAuth, logout]);

  // ==================== VALEUR DU CONTEXT ====================
  const value: AuthContextType = {
    user,
    access_token,
    isAuthenticated: !!user && !!access_token,
    isLoading,
    error,
    login,
    logout,
    logoutAll,
    register,
    forgotPassword,
    resetPassword,
    refreshToken,
    updateProfile,
    fetchWithAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ==================== HOOKS ====================
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};