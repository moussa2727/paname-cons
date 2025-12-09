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
  telephone?: string;
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
  phone: string;
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
}

// ==================== CONSTANTS SYNCHRONISÉES AVEC BACKEND ====================
const AUTH_CONSTANTS = {
  // Durées synchronisées avec backend (auth.constants.ts)
  ACCESS_TOKEN_EXPIRATION_MS: 15 * 60 * 1000, // 15 minutes = 900 secondes
  REFRESH_TOKEN_EXPIRATION_MS: 10 * 60 * 1000, // 10 minutes = 600 secondes (BACKEND: REFRESH_TOKEN_EXPIRATION_SECONDS)
  MAX_SESSION_DURATION_MS: 30 * 60 * 1000, // 30 minutes (synchronisé avec backend)
  PREVENTIVE_REFRESH_MS: 1 * 60 * 1000, // 1 minute avant expiration
  MAX_REFRESH_ATTEMPTS: 3,
  SESSION_CHECK_INTERVAL: 30 * 1000, // Vérif toutes les 30 secondes

  // ✅ CODES D'ERREUR SYNCHRONISÉS AVEC BACKEND (auth.constants.ts)
  ERROR_CODES: {
    PASSWORD_RESET_REQUIRED: 'PASSWORD_RESET_REQUIRED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    COMPTE_DESACTIVE: 'COMPTE_DESACTIVE',
    COMPTE_TEMPORAIREMENT_DECONNECTE: 'COMPTE_TEMPORAIREMENT_DECONNECTE',
    MAINTENANCE_MODE: 'MAINTENANCE_MODE',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    NO_PASSWORD_IN_DB: 'NO_PASSWORD_IN_DB',
    AUTH_ERROR: 'AUTH_ERROR',
  } as const,

  // ✅ RAISONS DE RÉVOCATION SYNCHRONISÉES (auth.constants.ts)
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
} as const;

// Chemins de redirection
const REDIRECT_PATHS = {
  LOGIN: '/connexion',
  HOME: '/',
  ADMIN_DASHBOARD: '/gestionnaire/statistiques',
  RESET_PASSWORD_REQUIRED: '/reset-password-required',
} as const;

// Messages toast synchronisés avec backend
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
} as const;

// URL du backend
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
    const token = access_token || window.localStorage?.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await window.fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // ✅ IMPORTANT: Pour envoyer les cookies
    });

    // ✅ GESTION UNIFIÉE DES ERREURS 401 (synchronisée avec backend)
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      
      if (errorData.sessionExpired || errorData.loggedOut || errorData.requiresReauth) {
        if (import.meta.env.DEV) {
          console.log('🔒 Session expirée détectée par fetchWithAuth');
        }
        
        cleanupAuthData();
        
        // ✅ Ne pas montrer de toast si on est déjà sur la page login
        if (!window.location.pathname.includes('/connexion')) {
          toast.info(TOAST_MESSAGES.SESSION_EXPIRED);
        }
        
        navigate(REDIRECT_PATHS.LOGIN, { replace: true });
        throw new Error('SESSION_EXPIRED');
      }
      
      // ✅ Erreur d'authentification spécifique
      if (errorData.code) {
        throw new Error(errorData.code);
      }
    }

    return response;
  }, [access_token, cleanupAuthData, navigate]);

  const fetchUserData = useCallback(async (): Promise<void> => {
    try {
      const response = await fetchWithAuth(API_CONFIG.ENDPOINTS.ME);
      
      if (!response.ok) {
        throw new Error('Erreur de récupération du profil');
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
      
      if (import.meta.env.DEV) {
        console.log('✅ Profil utilisateur récupéré:', mappedUser.email);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ Erreur récupération utilisateur:', error);
      }
      
      if (error instanceof Error && error.message === 'SESSION_EXPIRED') {
        throw error;
      }
    }
  }, [fetchWithAuth]);

  const updateProfile = useCallback(async (): Promise<void> => {
    await fetchUserData();
  }, [fetchUserData]);



  const setupTokenRefresh = useCallback((exp: number): void => {
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }

    // ✅ SYNCHRONISÉ AVEC BACKEND: Rafraîchir 1 minute avant expiration
    const tokenExpirationMs = exp * 1000;
    const currentTimeMs = Date.now();
    const timeUntilExpiration = tokenExpirationMs - currentTimeMs;
    
    const refreshTime = Math.max(
      10000, // Minimum 10 secondes
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
  }, []);

  const handleAuthError = useCallback((error: any, context: string = ''): void => {
    const errorMessage = error.message || 'Erreur inconnue';
    
    if (import.meta.env.DEV) {
      console.error(`❌ Erreur auth [${context}]:`, errorMessage);
    }
    
    // ✅ GESTION DES ERREURS SYNCHRONISÉE AVEC BACKEND
    if (errorMessage.includes(AUTH_CONSTANTS.ERROR_CODES.PASSWORD_RESET_REQUIRED)) {
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
      // Ne pas montrer de toast supplémentaire, déjà géré
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

      try {
        const response = await window.fetch(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
            credentials: 'include', // ✅ IMPORTANT: Pour recevoir les cookies
          }
        );

        const data: LoginResponse = await response.json();

        if (!response.ok) {
          // ✅ GESTION UNIFIÉE DES ERREURS (synchronisée avec backend)
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
          
          // Fallback sur le message si pas de code
          throw new Error(data.message || 'Erreur de connexion');
        }

        // ✅ VALIDATION DES DONNÉES REÇUES
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
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          role: data.user.role,
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
        setupTokenRefresh(decoded.exp);

        // ✅ REDIRECTION CENTRALISÉE
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
    [setupTokenRefresh, navigate, handleAuthError]
  );

  const register = useCallback(
    async (formData: RegisterFormData): Promise<void> => {
      setIsLoading(true);
      setError(null);

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
              telephone: formData.phone,
              password: formData.password,
            }),
            credentials: 'include', // ✅ IMPORTANT: Pour recevoir les cookies
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
        setupTokenRefresh(decoded.exp);

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
    [setupTokenRefresh, navigate, handleAuthError]
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      if (access_token) {
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

  const refreshToken = useCallback(async (): Promise<boolean> => {
    const currentToken = window.localStorage?.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    if (!currentToken) {
      if (import.meta.env.DEV) {
        console.log('❌ Pas de token à rafraîchir');
      }
      return false;
    }

    try {
      if (import.meta.env.DEV) {
        console.log('🔄 Tentative de rafraîchissement du token...');
      }

      // ✅ IMPORTANT: Ne pas mettre Content-Type pour les requêtes avec cookies
      const response = await window.fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REFRESH}`,
        {
          method: 'POST',
          headers: {}, // ✅ Laisser vide pour que les cookies soient envoyés
          credentials: 'include', // ✅ IMPORTANT: Pour envoyer les cookies
        }
      );

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
      
      // Mettre à jour le timestamp du dernier rafraîchissement
      window.localStorage?.setItem(
        STORAGE_KEYS.LAST_REFRESH_TIME,
        Date.now().toString()
      );

      await fetchUserData();

      try {
        const decoded = jwtDecode<JwtPayload>(data.access_token);
        setupTokenRefresh(decoded.exp);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('⚠️ Erreur mise à jour timer:', error);
        }
      }

      if (import.meta.env.DEV) {
        console.log('✅ Token rafraîchi avec succès');
      }
      
      refreshAttemptsRef.current = 0;
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ Erreur lors du refresh:', error);
      }

      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        if (import.meta.env.DEV) {
          console.warn('🌐 Erreur réseau - le token actuel reste valable');
        }
        return false;
      }

      cleanupAuthData();
      return false;
    }
  }, [fetchUserData, setupTokenRefresh, cleanupAuthData]);

  const forgotPassword = useCallback(
    async (email: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

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
        await fetchUserData();
        setupTokenRefresh(decoded.exp);
      } else {
        if (import.meta.env.DEV) {
          console.log('⏰ Token expiré, tentative de rafraîchissement...');
        }
        
        // Tentative de rafraîchissement avant de nettoyer
        const refreshed = await refreshToken();
        if (!refreshed) {
          cleanupAuthData();
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
  }, [fetchUserData, refreshToken]);

  const resetPassword = useCallback(
    async (token: string, newPassword: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // ✅ VALIDATION SYNCHRONISÉE AVEC BACKEND
        if (newPassword.length < 8) {
          throw new Error('Le mot de passe doit contenir au moins 8 caractères');
        }

        // Vérifier les critères backend: minuscule, majuscule, chiffre
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
              confirmPassword: newPassword, // ✅ Confirmé automatiquement dans le frontend
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
        // Vérifier régulièrement la durée de session
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
        }, AUTH_CONSTANTS.SESSION_CHECK_INTERVAL);
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