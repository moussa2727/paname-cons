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
  };
}

interface RefreshResponse {
  message?: string;
  expiresIn?: number;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<LogoutAllResponse>;
  register: (data: RegisterFormData) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  refreshToken: () => Promise<boolean>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updateProfile: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ==================== CONSTANTS ====================
const AUTH_CONSTANTS = {
  ACCESS_TOKEN_EXPIRATION_MS: 15 * 60 * 1000,
  PREVENTIVE_REFRESH_MS: 2 * 60 * 1000,
  MAX_SESSION_DURATION_MS: 25 * 60 * 1000,
  MAX_REFRESH_ATTEMPTS: 3,
  SESSION_CHECK_INTERVAL: 60 * 1000,

  ERROR_CODES: {
    PASSWORD_RESET_REQUIRED: 'PASSWORD_RESET_REQUIRED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    COMPTE_DESACTIVE: 'COMPTE_DESACTIVE',
    COMPTE_TEMPORAIREMENT_DECONNECTE: 'COMPTE_TEMPORAIREMENT_DECONNECTE',
    MAINTENANCE_MODE: 'MAINTENANCE_MODE',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
  } as const,
} as const;

const STORAGE_KEYS = {
  USER_DATA: 'user_data',
  SESSION_START: 'session_start',
  LAST_AUTH_CHECK: 'last_auth_check',
} as const;

const REDIRECT_PATHS = {
  LOGIN: '/connexion',
  HOME: '/',
  ADMIN_DASHBOARD: '/gestionnaire/statistiques',
} as const;

const TOAST_MESSAGES = {
  LOGIN_SUCCESS: 'Connexion réussie !',
  LOGOUT_SUCCESS: 'Déconnexion réussie',
  REGISTER_SUCCESS: 'Inscription réussie !',
  PASSWORD_RESET_SUCCESS: 'Mot de passe réinitialisé avec succès !',
  SESSION_EXPIRED: 'Session expirée après 25 minutes. Veuillez vous reconnecter.',
  LOGOUT_ALL_SUCCESS: 'Déconnexion globale réussie',
  FORGOT_PASSWORD_SUCCESS: 'Email de réinitialisation envoyé',
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect',
  ACCOUNT_DISABLED: "Votre compte est désactivé. Contactez l'administrateur.",
  ACCOUNT_TEMP_DISCONNECTED: (hours: number) => `Votre compte est temporairement déconnecté pour ${hours} heures`,
  MAINTENANCE_MODE: 'Le système est en maintenance. Réessayez plus tard.',
  PASSWORD_RESET_REQUIRED: 'Réinitialisation de mot de passe requise',
  TOKEN_REFRESHED: 'Session rafraîchie',
  NETWORK_ERROR: 'Erreur réseau. Vérifiez votre connexion.',
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
    VALIDATE_SESSION: '/api/auth/validate-session',
  } as const,
} as const;

// ==================== CONTEXT ====================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastAuthCheck, setLastAuthCheck] = useState<number>(0);

  const refreshTimeoutRef = useRef<number | null>(null);
  const sessionCheckIntervalRef = useRef<number | null>(null);
  const refreshAttemptsRef = useRef(0);

  // ==================== FONCTIONS DE BASE ====================

  const cleanupAuthData = useCallback((): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      localStorage.removeItem(STORAGE_KEYS.SESSION_START);
      localStorage.removeItem(STORAGE_KEYS.LAST_AUTH_CHECK);
    }

    setUser(null);
    setError(null);
    refreshAttemptsRef.current = 0;

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current);
      sessionCheckIntervalRef.current = null;
    }
  }, []);

  const fetchWithAuth = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // IMPORTANT: envoie les cookies
    });

    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      
      if (errorData.sessionExpired || errorData.loggedOut || errorData.requiresReauth) {
        cleanupAuthData();
        toast.info(TOAST_MESSAGES.SESSION_EXPIRED);
        navigate(REDIRECT_PATHS.LOGIN);
        throw new Error(AUTH_CONSTANTS.ERROR_CODES.SESSION_EXPIRED);
      }
    }

    return response;
  }, [cleanupAuthData, navigate]);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      const now = Date.now();
      
      // Éviter de vérifier trop souvent (cache de 10 secondes)
      if (now - lastAuthCheck < 10000 && user) {
        return true;
      }

      setLastAuthCheck(now);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VALIDATE_SESSION || API_CONFIG.ENDPOINTS.ME}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
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
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(mappedUser));
          localStorage.setItem(STORAGE_KEYS.LAST_AUTH_CHECK, now.toString());
        }

        return true;
      }
      
      return false;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erreur checkAuth:', error);
      }
      return false;
    }
  }, [lastAuthCheck, user]);

  const updateProfile = useCallback(async (): Promise<void> => {
    await checkAuth();
  }, [checkAuth]);

  const setupAutoRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Rafraîchir automatiquement la session toutes les 10 minutes
    refreshTimeoutRef.current = window.setTimeout(async () => {
      if (refreshAttemptsRef.current < AUTH_CONSTANTS.MAX_REFRESH_ATTEMPTS) {
        const refreshed = await refreshToken();
        if (refreshed) {
          refreshAttemptsRef.current = 0;
        } else {
          refreshAttemptsRef.current++;
        }
      } else {
        cleanupAuthData();
        toast.info(TOAST_MESSAGES.SESSION_EXPIRED);
      }
    }, 10 * 60 * 1000); // 10 minutes
  }, [cleanupAuthData]);

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
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        });

        const data: LoginResponse = await response.json();

        if (!response.ok) {
          if (data.code === AUTH_CONSTANTS.ERROR_CODES.INVALID_CREDENTIALS) {
            throw new Error(AUTH_CONSTANTS.ERROR_CODES.INVALID_CREDENTIALS);
          }
          throw new Error(data.message || 'Erreur de connexion');
        }

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
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
          localStorage.setItem(STORAGE_KEYS.SESSION_START, Date.now().toString());
          localStorage.setItem(STORAGE_KEYS.LAST_AUTH_CHECK, Date.now().toString());
        }

        setupAutoRefresh();

        const redirectPath =
          data.user.role === UserRole.ADMIN
            ? REDIRECT_PATHS.ADMIN_DASHBOARD
            : REDIRECT_PATHS.HOME;

        navigate(redirectPath);
        toast.success(TOAST_MESSAGES.LOGIN_SUCCESS);
      } catch (err: any) {
        handleAuthError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setupAutoRefresh, navigate, handleAuthError]
  );

  const register = useCallback(
    async (formData: RegisterFormData): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`, {
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
        });

        const data: RegisterResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Erreur lors de l'inscription");
        }

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
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
          localStorage.setItem(STORAGE_KEYS.SESSION_START, Date.now().toString());
          localStorage.setItem(STORAGE_KEYS.LAST_AUTH_CHECK, Date.now().toString());
        }

        setupAutoRefresh();

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
    [setupAutoRefresh, navigate, handleAuthError]
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGOUT}`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erreur logout backend:', error);
      }
    } finally {
      cleanupAuthData();
      navigate(REDIRECT_PATHS.LOGIN);
      toast.info(TOAST_MESSAGES.LOGOUT_SUCCESS);
    }
  }, [cleanupAuthData, navigate]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      if (import.meta.env.DEV) {
        console.log('🔄 Tentative de rafraîchissement du token...');
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REFRESH}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        return false;
      }

      if (!response.ok) {
        return false;
      }

      const data: RefreshResponse = await response.json();

      // Vérifier à nouveau l'authentification après le refresh
      await checkAuth();
      
      if (import.meta.env.DEV) {
        console.log('✅ Token rafraîchi avec succès');
      }
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ Erreur lors du refresh:', error);
      }
      return false;
    }
  }, [checkAuth]);

  const logoutAll = useCallback(async (): Promise<LogoutAllResponse> => {
    if (user?.role !== UserRole.ADMIN) {
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
  }, [user, fetchWithAuth, handleAuthError]);

  const forgotPassword = useCallback(
    async (email: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FORGOT_PASSWORD}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

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

        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.RESET_PASSWORD}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            newPassword,
          }),
        });

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

      try {
        // Récupérer les données utilisateur depuis localStorage si elles existent
        if (typeof window !== 'undefined') {
          const storedUser = localStorage.getItem(STORAGE_KEYS.USER_DATA);
          const lastCheck = localStorage.getItem(STORAGE_KEYS.LAST_AUTH_CHECK);
          
          if (storedUser) {
            setUser(JSON.parse(storedUser));
            setLastAuthCheck(lastCheck ? parseInt(lastCheck) : 0);
          }
        }

        // Vérifier l'authentification auprès du backend
        await checkAuth();
        
        if (isMounted) {
          setupAutoRefresh();
          
          // Vérifier la session toutes les minutes
          sessionCheckIntervalRef.current = window.setInterval(async () => {
            const sessionStart = localStorage.getItem(STORAGE_KEYS.SESSION_START);
            if (sessionStart) {
              const sessionAge = Date.now() - parseInt(sessionStart);
              if (sessionAge > AUTH_CONSTANTS.MAX_SESSION_DURATION_MS) {
                logout();
                toast.info(TOAST_MESSAGES.SESSION_EXPIRED);
              }
            }
          }, AUTH_CONSTANTS.SESSION_CHECK_INTERVAL);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Erreur initialisation auth:', error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
    };
  }, [checkAuth, logout, setupAutoRefresh]);

  // ==================== VALEUR DU CONTEXT ====================

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
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
    checkAuth,
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