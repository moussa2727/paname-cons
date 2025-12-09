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
  access_token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isAdmin: boolean;
  };
    code?: string;
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
  };
}

interface AuthContextType {
  user: User | null;
  access_token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<LogoutAllResponse>;
  register: (data: RegisterFormData) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updateProfile: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ==================== CONSTANTS ====================
const AUTH_CONSTANTS = {
  ACCESS_TOKEN_EXPIRATION_MS: 15 * 60 * 1000, // 15 minutes (synchronisé avec backend)
  SESSION_CHECK_INTERVAL: 30 * 1000, // Vérif toutes les 30 secondes
  MAX_SESSION_DURATION_MS: 25 * 60 * 1000, // 25 minutes max
  PREVENTIVE_REFRESH_MS: 2 * 60 * 1000, // Rafraîchir 2 minutes avant expiration

  ERROR_CODES: {
    COMPTE_DESACTIVE: 'COMPTE DESACTIVE',
    COMPTE_TEMPORAIREMENT_DECONNECTE: 'COMPTE TEMPORAIREMENT DECONNECTE',
    MAINTENANCE_MODE: 'MAINTENANCE MODE',
    PASSWORD_RESET_REQUIRED: 'PASSWORD RESET REQUIRED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  } as const,
} as const;

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  USER_DATA: 'user_data',
  SESSION_START: 'session_start',
} as const;

// Chemins de redirection
const REDIRECT_PATHS = {
  LOGIN: '/connexion',
  HOME: '/',
  ADMIN_DASHBOARD: '/gestionnaire/statistiques',
} as const;

// Messages toast
const TOAST_MESSAGES = {
  LOGIN_SUCCESS: 'Connexion réussie !',
  LOGOUT_SUCCESS: 'Déconnexion réussie',
  REGISTER_SUCCESS: 'Inscription réussie !',
  PASSWORD_RESET_SUCCESS: 'Mot de passe réinitialisé avec succès !',
  SESSION_EXPIRED: 'Session expirée après 25 minutes. Veuillez vous reconnecter.',
  LOGOUT_ALL_SUCCESS: 'Déconnexion globale réussie',
  FORGOT_PASSWORD_SUCCESS: 'Si votre email est enregistré, vous recevrez un lien de réinitialisation',
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect',
  ACCOUNT_DISABLED: "Votre compte est désactivé. Contactez l'administrateur.",
  ACCOUNT_TEMP_DISCONNECTED: (hours: number) => `Votre compte est temporairement déconnecté pour ${hours} heures`,
  MAINTENANCE_MODE: 'Le système est en maintenance. Réessayez plus tard.',
  PASSWORD_RESET_REQUIRED: 'Réinitialisation de mot de passe requise',
  NETWORK_ERROR: 'Erreur réseau. Vérifiez votre connexion.',
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
    const stored = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return stored ? JSON.parse(stored) : null;
  });

  const [access_token, setAccessToken] = useState<string | null>(
    localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  );

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshTimerRef = useRef<number | null>(null);
  const sessionCheckTimerRef = useRef<number | null>(null);
  const isProcessingRefresh = useRef(false);

  // ==================== FONCTIONS ESSENTIELLES ====================

  const cleanupAuthData = useCallback((): void => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });

    setAccessToken(null);
    setUser(null);
    setError(null);

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (sessionCheckTimerRef.current) {
      clearInterval(sessionCheckTimerRef.current);
      sessionCheckTimerRef.current = null;
    }

    isProcessingRefresh.current = false;
  }, []);

  const fetchUserData = useCallback(async (): Promise<void> => {
    const token = access_token || localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    if (!token) {
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ME}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 401) {
          if (errorData.loggedOut || errorData.sessionExpired || errorData.requiresReauth) {
            cleanupAuthData();
            toast.info(TOAST_MESSAGES.SESSION_EXPIRED);
            navigate(REDIRECT_PATHS.LOGIN);
          }
        }
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
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(mappedUser));
    } catch (error) {
      console.error('Erreur récupération utilisateur:', error);
    }
  }, [access_token, cleanupAuthData, navigate]);

  const updateProfile = useCallback(async (): Promise<void> => {
    await fetchUserData();
  }, [fetchUserData]);

  const checkTokenAndSetupRefresh = useCallback((token: string): void => {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const expirationTime = decoded.exp * 1000;
      const currentTime = Date.now();
      const timeUntilExpiration = expirationTime - currentTime;

      // Si le token expire dans moins de 2 minutes, on le rafraîchit immédiatement
      if (timeUntilExpiration < AUTH_CONSTANTS.PREVENTIVE_REFRESH_MS) {
        if (!isProcessingRefresh.current) {
          isProcessingRefresh.current = true;
          attemptTokenRefresh();
        }
        return;
      }

      // Planifier le rafraîchissement préventif
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      const refreshTime = timeUntilExpiration - AUTH_CONSTANTS.PREVENTIVE_REFRESH_MS;
      
      if (refreshTime > 0) {
        refreshTimerRef.current = window.setTimeout(() => {
          if (!isProcessingRefresh.current) {
            isProcessingRefresh.current = true;
            attemptTokenRefresh();
          }
        }, refreshTime);
      }
    } catch (error) {
      console.error('Erreur décodage token:', error);
      cleanupAuthData();
    }
  }, []);

  const attemptTokenRefresh = useCallback(async (): Promise<void> => {
    if (isProcessingRefresh.current) return;
    
    isProcessingRefresh.current = true;
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REFRESH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        
        if (errorData.sessionExpired || errorData.loggedOut) {
          cleanupAuthData();
          toast.info(TOAST_MESSAGES.SESSION_EXPIRED);
          navigate(REDIRECT_PATHS.LOGIN);
          return;
        }
      }

      if (!response.ok) {
        throw new Error('Échec du rafraîchissement');
      }

      const data = await response.json();

      if (!data.access_token) {
        throw new Error('Pas de nouveau token reçu');
      }

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
      setAccessToken(data.access_token);

      await fetchUserData();
      checkTokenAndSetupRefresh(data.access_token);
      
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
      
      // En cas d'erreur réseau, on garde le token actuel et on réessayera plus tard
      const currentToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (currentToken) {
        checkTokenAndSetupRefresh(currentToken);
      }
    } finally {
      isProcessingRefresh.current = false;
    }
  }, [cleanupAuthData, navigate, fetchUserData, checkTokenAndSetupRefresh]);

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

  const login = useCallback(async (email: string, password: string): Promise<void> => {
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

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
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
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      localStorage.setItem(STORAGE_KEYS.SESSION_START, Date.now().toString());

      checkTokenAndSetupRefresh(data.access_token);

      // Redirection
      const redirectPath = data.user.role === UserRole.ADMIN
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
  }, [navigate, handleAuthError, checkTokenAndSetupRefresh]);

  const register = useCallback(async (formData: RegisterFormData): Promise<void> => {
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

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
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
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      localStorage.setItem(STORAGE_KEYS.SESSION_START, Date.now().toString());

      checkTokenAndSetupRefresh(data.access_token);

      const redirectPath = data.user.role === UserRole.ADMIN
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
  }, [navigate, handleAuthError, checkTokenAndSetupRefresh]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      const token = access_token || localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      
      if (token) {
        await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGOUT}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });
      }
    } catch (error) {
      console.error('Erreur logout backend:', error);
    } finally {
      cleanupAuthData();
      navigate(REDIRECT_PATHS.LOGIN);
      toast.info(TOAST_MESSAGES.LOGOUT_SUCCESS);
    }
  }, [access_token, cleanupAuthData, navigate]);

  const logoutAll = useCallback(async (): Promise<LogoutAllResponse> => {
    if (!user || user.role !== UserRole.ADMIN) {
      throw new Error('Accès non autorisé - Admin seulement');
    }

    const token = access_token || localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    if (!token) {
      throw new Error('Non authentifié');
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGOUT_ALL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
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
  }, [access_token, user, handleAuthError]);

  const forgotPassword = useCallback(async (email: string): Promise<void> => {
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
  }, [navigate, handleAuthError]);

  const resetPassword = useCallback(async (token: string, newPassword: string): Promise<void> => {
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
  }, [navigate, handleAuthError]);

  // ==================== EFFETS ====================

  useEffect(() => {
    // Initialisation au chargement
    const savedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    if (savedToken) {
      try {
        const decoded = jwtDecode<JwtPayload>(savedToken);
        const isTokenExpired = decoded.exp * 1000 < Date.now();

        if (!isTokenExpired) {
          fetchUserData();
          checkTokenAndSetupRefresh(savedToken);
        } else {
          cleanupAuthData();
        }
      } catch (error) {
        console.error('Erreur vérification auth:', error);
        cleanupAuthData();
      }
    }

    // Vérification périodique de la session
    sessionCheckTimerRef.current = window.setInterval(() => {
      const sessionStart = localStorage.getItem(STORAGE_KEYS.SESSION_START);
      if (sessionStart) {
        const sessionAge = Date.now() - parseInt(sessionStart);
        if (sessionAge > AUTH_CONSTANTS.MAX_SESSION_DURATION_MS) {
          logout();
          toast.info(TOAST_MESSAGES.SESSION_EXPIRED);
        }
      }
    }, AUTH_CONSTANTS.SESSION_CHECK_INTERVAL);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      if (sessionCheckTimerRef.current) {
        clearInterval(sessionCheckTimerRef.current);
      }
    };
  }, [fetchUserData, checkTokenAndSetupRefresh, cleanupAuthData, logout]);

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