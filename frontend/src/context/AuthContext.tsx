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
  // Durées synchronisées avec backend
  ACCESS_TOKEN_EXPIRATION_MS: 15 * 60 * 1000, // 15 minutes
  PREVENTIVE_REFRESH_MS: 2 * 60 * 1000, // 2 minutes avant expiration
  MAX_SESSION_DURATION_MS: 30 * 60 * 1000, // 30 minutes (synchronisé avec backend)
  MAX_REFRESH_ATTEMPTS: 3,
  SESSION_CHECK_INTERVAL: 60 * 1000, // Vérif toutes les minutes

  ERROR_CODES: {
    PASSWORD_RESET_REQUIRED: 'PASSWORD_RESET_REQUIRED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    COMPTE_DESACTIVE: 'COMPTE DESACTIVE',
    COMPTE_TEMPORAIREMENT_DECONNECTE: 'COMPTE TEMPORAIREMENT DECONNECTE',
    MAINTENANCE_MODE: 'MAINTENANCE MODE',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    NO_PASSWORD_IN_DB: 'NO_PASSWORD_IN_DB',
  } as const,
} as const;

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  USER_DATA: 'user_data',
  SESSION_START: 'session_start',
  REFRESH_ATTEMPTS: 'refresh_attempts',
} as const;

// Chemins de redirection
const REDIRECT_PATHS = {
  LOGIN: '/connexion',
  HOME: '/',
  ADMIN_DASHBOARD: '/gestionnaire/statistiques',
} as const;

// Messages toast synchronisés avec backend
const TOAST_MESSAGES = {
  LOGIN_SUCCESS: 'Connexion réussie !',
  LOGOUT_SUCCESS: 'Déconnexion réussie',
  REGISTER_SUCCESS: 'Inscription réussie !',
  PASSWORD_RESET_SUCCESS: 'Mot de passe réinitialisé avec succès !',
  SESSION_EXPIRED: 'Session expirée après 30 minutes. Veuillez vous reconnecter.',
  LOGOUT_ALL_SUCCESS: 'Déconnexion globale réussie',
  FORGOT_PASSWORD_SUCCESS: 'Email de réinitialisation envoyé',
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect',
  ACCOUNT_DISABLED: 'COMPTE DESACTIVE',
  ACCOUNT_TEMP_DISCONNECTED: (hours: number) => `COMPTE TEMPORAIREMENT DECONNECTE:${hours}`,
  MAINTENANCE_MODE: 'MAINTENANCE MODE',
  PASSWORD_RESET_REQUIRED: 'PASSWORD RESET REQUIRED',
  TOKEN_REFRESHED: 'Session rafraîchie',
  NETWORK_ERROR: 'Erreur réseau. Vérifiez votre connexion.',
  SESSION_TIMEOUT: 'Session expirée après 30 minutes',
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
    return stored ? JSON.parse(stored) : null;
  });

  const [access_token, setAccessToken] = useState<string | null>(
    window.localStorage?.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  );

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTimeoutRef = useRef<number | null>(null);
  const sessionCheckIntervalRef = useRef<number | null>(null);
  const refreshAttemptsRef = useRef(0);

  // ==================== FONCTIONS ESSENTIELLES ====================

  const cleanupAuthData = useCallback((): void => {
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
      credentials: 'include',
    });

    // Gestion des erreurs d'authentification
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      
      if (errorData.sessionExpired || errorData.loggedOut || errorData.requiresReauth) {
        cleanupAuthData();
        toast.info(TOAST_MESSAGES.SESSION_TIMEOUT);
        navigate(REDIRECT_PATHS.LOGIN);
        throw new Error(AUTH_CONSTANTS.ERROR_CODES.SESSION_EXPIRED);
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
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erreur récupération utilisateur:', error);
      }
      
      if (error instanceof Error && error.message === AUTH_CONSTANTS.ERROR_CODES.SESSION_EXPIRED) {
        throw error;
      }
    }
  }, [fetchWithAuth]);

  const updateProfile = useCallback(async (): Promise<void> => {
    await fetchUserData();
  }, [fetchUserData]);

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
        cleanupAuthData();
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Erreur vérification auth:', error);
      }
      cleanupAuthData();
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserData, cleanupAuthData]);

  const setupTokenRefresh = useCallback((exp: number): void => {
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }

    const refreshTime = Math.max(
      5000, // Minimum 5 secondes
      exp * 1000 - Date.now() - AUTH_CONSTANTS.PREVENTIVE_REFRESH_MS
    );

    if (refreshTime > 0) {
      refreshTimeoutRef.current = window.setTimeout(async () => {
        if (refreshAttemptsRef.current < AUTH_CONSTANTS.MAX_REFRESH_ATTEMPTS) {
          const refreshed = await refreshToken();
          if (refreshed) {
            refreshAttemptsRef.current = 0;
            toast.success(TOAST_MESSAGES.TOKEN_REFRESHED);
          } else {
            refreshAttemptsRef.current++;
          }
        } else {
          logout();
          toast.info(TOAST_MESSAGES.SESSION_EXPIRED);
        }
      }, refreshTime);
    }
  }, []);

  const handleAuthError = useCallback((error: any): void => {
    const errorMessage = error.message || 'Erreur inconnue';
    
    if (errorMessage.includes(AUTH_CONSTANTS.ERROR_CODES.PASSWORD_RESET_REQUIRED)) {
      toast.error(TOAST_MESSAGES.PASSWORD_RESET_REQUIRED);
      navigate('/reset-password-required');
    } else if (errorMessage.includes(AUTH_CONSTANTS.ERROR_CODES.COMPTE_DESACTIVE)) {
      toast.error(TOAST_MESSAGES.ACCOUNT_DISABLED);
    } else if (errorMessage.includes(AUTH_CONSTANTS.ERROR_CODES.COMPTE_TEMPORAIREMENT_DECONNECTE)) {
      const hoursMatch = errorMessage.match(/:(\d+)/);
      const hours = hoursMatch ? parseInt(hoursMatch[1]) : 24;
      toast.error(TOAST_MESSAGES.ACCOUNT_TEMP_DISCONNECTED(hours));
    } else if (errorMessage.includes(AUTH_CONSTANTS.ERROR_CODES.MAINTENANCE_MODE)) {
      toast.error(TOAST_MESSAGES.MAINTENANCE_MODE);
    } else if (errorMessage.includes(AUTH_CONSTANTS.ERROR_CODES.INVALID_CREDENTIALS)) {
      toast.error(TOAST_MESSAGES.INVALID_CREDENTIALS);
    } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      toast.error(TOAST_MESSAGES.NETWORK_ERROR);
    } else {
      toast.error(errorMessage);
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
              'X-Client-Version': '1.0.0',
            },
            body: JSON.stringify({ email, password }),
            credentials: 'include',
          }
        );

        const data: LoginResponse = await response.json();

        if (!response.ok) {
          // Gestion unifiée des codes d'erreur backend
          if (data.code === AUTH_CONSTANTS.ERROR_CODES.INVALID_CREDENTIALS) {
            throw new Error(AUTH_CONSTANTS.ERROR_CODES.INVALID_CREDENTIALS);
          }
          
          // Propager les messages spécifiques du backend
          if (data.message && data.message.includes('COMPTE DESACTIVE')) {
            throw new Error(AUTH_CONSTANTS.ERROR_CODES.COMPTE_DESACTIVE);
          }
          
          if (data.message && data.message.includes('COMPTE TEMPORAIREMENT DECONNECTE')) {
            const hoursMatch = data.message.match(/:(\d+)/);
            const hours = hoursMatch ? hoursMatch[1] : '24';
            throw new Error(`${AUTH_CONSTANTS.ERROR_CODES.COMPTE_TEMPORAIREMENT_DECONNECTE}:${hours}`);
          }
          
          if (data.message && data.message.includes('MAINTENANCE MODE')) {
            throw new Error(AUTH_CONSTANTS.ERROR_CODES.MAINTENANCE_MODE);
          }
          
          if (data.message && data.message.includes('NO_PASSWORD_IN_DB')) {
            throw new Error('NO_PASSWORD_IN_DB');
          }
          
          throw new Error(data.message || 'Erreur de connexion');
        }

        // Validation des données reçues
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

        // Redirection centralisée
        const redirectPath =
          data.user.role === UserRole.ADMIN
            ? REDIRECT_PATHS.ADMIN_DASHBOARD
            : REDIRECT_PATHS.HOME;

        navigate(redirectPath);
        toast.success(TOAST_MESSAGES.LOGIN_SUCCESS);
      } catch (err: any) {
        if (import.meta.env.DEV) {
          console.error('Login error details:', {
            message: err.message,
            stack: err.stack,
          });
        }
        
        handleAuthError(err);
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

        navigate(redirectPath);
        toast.success(TOAST_MESSAGES.REGISTER_SUCCESS);
      } catch (err: any) {
        handleAuthError(err);
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
        console.error('Erreur logout backend:', error);
      }
    } finally {
      cleanupAuthData();
      navigate(REDIRECT_PATHS.LOGIN);
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
      handleAuthError(err);
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

      const response = await window.fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REFRESH}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        
        if (errorData.sessionExpired || errorData.loggedOut) {
          if (import.meta.env.DEV) {
            console.log('❌ Session expirée');
          }
          cleanupAuthData();
          return false;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (errorData.requiresReauth) {
          toast.info(TOAST_MESSAGES.SESSION_TIMEOUT);
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

      await fetchUserData();

      try {
        const decoded = jwtDecode<JwtPayload>(data.access_token);
        setupTokenRefresh(decoded.exp);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Erreur mise à jour timer:', error);
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
        handleAuthError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, handleAuthError]
  );

  const resetPassword = useCallback(
    async (token: string, newPassword: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        if (newPassword.length < 8) {
          throw new Error('Le mot de passe doit contenir au moins 8 caractères');
        }

        const response = await window.fetch(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.RESET_PASSWORD}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              newPassword,
            }),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Erreur lors de la réinitialisation');
        }

        toast.success(TOAST_MESSAGES.PASSWORD_RESET_SUCCESS);
        navigate(REDIRECT_PATHS.LOGIN);
      } catch (err: any) {
        handleAuthError(err);
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
              logout();
              toast.info(TOAST_MESSAGES.SESSION_TIMEOUT);
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
  }, [checkAuth]);

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