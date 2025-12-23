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
  errors: any;
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
    adminEmail: string;
    duration: string;
    timestamp: string;
    userEmails: string[];
  };
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

// ==================== CONSTANTS SIMPLIFIÉES ====================
const AUTH_CONSTANTS = {
  ACCESS_TOKEN_EXPIRATION_MS: 15 * 60 * 1000,
  MAX_SESSION_DURATION_MS: 30 * 60 * 1000,
  PREVENTIVE_REFRESH_MS: 5 * 60 * 1000,
  SESSION_CHECK_INTERVAL: 5 * 60 * 1000,
  ERROR_CODES: {
    PASSWORD_RESET_REQUIRED: 'PASSWORD RESET REQUIRED',
    INVALID_CREDENTIALS: 'INVALID CREDENTIALS',
    COMPTE_DESACTIVE: 'COMPTE DESACTIVE',
    COMPTE_TEMPORAIREMENT_DECONNECTE: 'COMPTE TEMPORAIREMENT DECONNECTE',
    MAINTENANCE_MODE: 'MAINTENANCE MODE',
    SESSION_EXPIRED: 'SESSION EXPIRED',
  } as const,
} as const;

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  USER_DATA: 'user_data',
  SESSION_START: 'session_start',
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
  SESSION_EXPIRED: 'Session expirée après 30 minutes.',
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect',
} as const;

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL,
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
    const stored = localStorage?.getItem(STORAGE_KEYS.USER_DATA);
    return stored ? JSON.parse(stored) : null;
  });

  const [access_token, setAccessToken] = useState<string | null>(() => {
    return localStorage?.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  });

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshTimeoutRef = useRef<number | null>(null);
  const isRefreshingRef = useRef(false);

  // ==================== FONCTIONS EXISTANTES OPTIMISÉES ====================
  const cleanupAuthData = useCallback((): void => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage?.removeItem(key);
    });

    setAccessToken(null);
    setUser(null);
    setError(null);
    isRefreshingRef.current = false;

    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }
  }, []);

  const fetchWithAuth = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const token = access_token || localStorage?.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
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

    if (response.status === 401) {
      cleanupAuthData();
      navigate(REDIRECT_PATHS.LOGIN, { replace: true });
    }

    return response;
  }, [access_token, cleanupAuthData, navigate]);

  const fetchUserData = useCallback(async (): Promise<void> => {
    const token = access_token || localStorage?.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) return;

    try {
      const response = await window.fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ME}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          }
        }
      );
      
      if (response.ok) {
        const userData = await response.json();
        
        const mappedUser: User = {
          id: userData.id || userData._id || '',
          email: userData.email || '',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          role: userData.role || UserRole.USER,
          isActive: userData.isActive !== false,
          telephone: userData.telephone || '',
          isAdmin: userData.role === UserRole.ADMIN,
        };

        setUser(mappedUser);
        localStorage?.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(mappedUser));
      }
    } catch (error) {
      console.warn('Erreur récupération utilisateur:', error);
    }
  }, [access_token]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await window.fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        }
      );

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.code || data.message || 'Erreur de connexion');
      }

      localStorage?.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
      setAccessToken(data.access_token);

      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        role: data.user.role,
        telephone: data.user.telephone,
        isActive: true,
        isAdmin: data.user.role === UserRole.ADMIN,
      };

      setUser(userData);
      localStorage?.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      localStorage?.setItem(STORAGE_KEYS.SESSION_START, Date.now().toString());

      toast.success(TOAST_MESSAGES.LOGIN_SUCCESS);
      
      const redirectPath = data.user.role === UserRole.ADMIN
        ? REDIRECT_PATHS.ADMIN_DASHBOARD
        : REDIRECT_PATHS.HOME;

      navigate(redirectPath, { replace: true });
      
    } catch (err: any) {
      toast.error(err.message || TOAST_MESSAGES.INVALID_CREDENTIALS);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) return false;
    isRefreshingRef.current = true;

    try {
      const response = await window.fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REFRESH}`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (!response.ok) return false;

      const data = await response.json();

      if (!data.access_token) return false;

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
      setAccessToken(data.access_token);
      
      await fetchUserData();
      
      return true;

    } catch (error) {
      console.error('Erreur refresh:', error);
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [fetchUserData]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      if (access_token) {
        await fetchWithAuth(API_CONFIG.ENDPOINTS.LOGOUT, { method: 'POST' });
      }
    } catch (error) {
      console.error('Erreur logout:', error);
    } finally {
      cleanupAuthData();
      navigate(REDIRECT_PATHS.LOGIN, { replace: true });
      toast.info(TOAST_MESSAGES.LOGOUT_SUCCESS);
    }
  }, [access_token, cleanupAuthData, navigate, fetchWithAuth]);

  const register = useCallback(async (formData: RegisterFormData): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await window.fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            email: formData.email.toLowerCase().trim(),
            telephone: formData.telephone.trim(),
            password: formData.password,
          }),
          credentials: 'include',
        }
      );

      const data: RegisterResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de l'inscription");
      }

      if (data.access_token) {
        localStorage?.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
        setAccessToken(data.access_token);
      }

      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        role: data.user.role,
        telephone: data.user.telephone,
        isActive: data.user.isActive !== false,
        isAdmin: data.user.role === UserRole.ADMIN,
      };

      setUser(userData);
      localStorage?.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      localStorage?.setItem(STORAGE_KEYS.SESSION_START, Date.now().toString());

      const redirectPath = userData.role === UserRole.ADMIN
        ? REDIRECT_PATHS.ADMIN_DASHBOARD
        : REDIRECT_PATHS.HOME;

      navigate(redirectPath, { replace: true });
      toast.success(TOAST_MESSAGES.REGISTER_SUCCESS);
      
    } catch (err: any) {
      toast.error(err.message);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    setIsLoading(true);
    
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

      toast.success("Si votre email est enregistré, vous recevrez un lien de réinitialisation");
      navigate(REDIRECT_PATHS.LOGIN);
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const resetPassword = useCallback(async (token: string, newPassword: string): Promise<void> => {
    setIsLoading(true);
    
    try {
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

      toast.success('Mot de passe réinitialisé avec succès !');
      navigate(REDIRECT_PATHS.LOGIN, { replace: true });
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const logoutAll = useCallback(async (): Promise<LogoutAllResponse> => {
    if (!access_token || user?.role !== UserRole.ADMIN) {
      throw new Error('Accès non autorisé - Admin seulement');
    }

    const response = await fetchWithAuth(API_CONFIG.ENDPOINTS.LOGOUT_ALL, {
      method: 'POST',
    });

    const data: LogoutAllResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erreur lors de la déconnexion globale');
    }

    toast.success(data.message || 'Déconnexion globale réussie');
    return data;
  }, [access_token, user, fetchWithAuth]);

  // ==================== EFFET SIMPLIFIÉ ====================
  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage?.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) return;

      try {
        const decoded = jwtDecode<JwtPayload>(token);
        const isExpired = decoded.exp * 1000 < Date.now();
        
        if (isExpired) {
          await refreshToken();
        }
      } catch (error) {
        console.warn('Token invalide:', error);
      }
    };

    checkToken();
  }, []);

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
    updateProfile: fetchUserData,
    fetchWithAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};