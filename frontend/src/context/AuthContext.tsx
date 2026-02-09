import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { UserRole } from '../api/user/Profile/userProfileApi';

// Types pour l'authentification
interface User {
  _id: string;
  id: string; // Alias pour _id pour compatibilité
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  telephone: string;
  isAdmin: boolean;
}

interface MaintenanceStatus {
  isActive: boolean;
  message?: string;
  startTime?: string;
}

interface AuthContextType {
  user: User | null;
  access_token: string | null;
  refresh_token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    telephone: string;
  }) => Promise<void>;
  logout: () => void;
  logoutAll: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  fetchUserData: () => Promise<void>;
  fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>;
  maintenanceStatus: MaintenanceStatus | null;
  isMaintenanceMode: boolean;
  toggleMaintenanceMode: () => Promise<void>;
  checkMaintenanceStatus: () => Promise<void>;
}

// Messages d'erreur API
const API_ERRORS = {
  INVALID_CREDENTIALS: 'INVALID CREDENTIALS',
  COMPTE_DESACTIVE: 'COMPTE DESACTIVE',
  COMPTE_TEMPORAIREMENT_DECONNECTE: 'COMPTE TEMPORAIREMENT DECONNECTE',
  MAINTENANCE_MODE: 'MAINTENANCE MODE',
  SESSION_EXPIRED: 'SESSION EXPIRED',
} as const;

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  SESSION_START: 'session_start',
  LAST_REFRESH_TIME: 'last_refresh_time',
  MAINTENANCE_STATUS: 'maintenance_status',
} as const;

// ==================== UTILITAIRES COOKIES ====================
const COOKIE_OPTIONS = {
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 24 * 60 * 60, // 24 heures
};

const setCookie = (name: string, value: string): void => {
  const optionsString = Object.entries(COOKIE_OPTIONS)
    .map(([key, value]) => {
      if (key === 'maxAge') return `${key}=${value}`;
      if (key === 'secure') return value ? key : '';
      if (key === 'sameSite') return `${key}=${value}`;
      if (key === 'path') return `${key}=${value}`;
      return '';
    })
    .filter(Boolean)
    .join('; ');
  
  document.cookie = `${name}=${value}; ${optionsString}`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const deleteCookie = (name: string): void => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

const REDIRECT_PATHS = {
  LOGIN: '/connexion',
  HOME: '/',
  ADMIN_DASHBOARD: '/gestionnaire/statistiques',
  RESET_PASSWORD_REQUIRED: '/reset-password',
} as const;

const TOAST_MESSAGES = {
  LOGIN_SUCCESS: 'Connexion réussie !',
  LOGOUT_SUCCESS: 'Déconnexion réussie',
  REGISTER_SUCCESS: 'Inscription réussie !',
  PASSWORD_RESET_SUCCESS: 'Mot de passe réinitialisé avec succès !',
  SESSION_EXPIRED:
    'Session expirée après 30 minutes. Veuillez vous reconnecter.',
  LOGOUT_ALL_SUCCESS: 'Déconnexion globale réussie',
  FORGOT_PASSWORD_SUCCESS:
    'Si votre email est enregistré, vous recevrez un lien de réinitialisation',
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect',
  ACCOUNT_DISABLED: 'COMPTE DESACTIVE',
  ACCOUNT_TEMPORARILY_DISABLED: 'COMPTE TEMPORAIREMENT DESACTIVE',
  GENERIC_ERROR: 'Une erreur est survenue. Veuillez réessayer.',
} as const;

// ==================== CONTEXT ====================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<User | null>(null);
  const [access_token, setAccessToken] = useState<string | null>(() => {
    return getCookie(STORAGE_KEYS.ACCESS_TOKEN);
  });
  const [refresh_token, setRefreshToken] = useState<string | null>(() => {
    return getCookie(STORAGE_KEYS.REFRESH_TOKEN);
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus | null>(() => {
    const stored = window.localStorage?.getItem(STORAGE_KEYS.MAINTENANCE_STATUS);
    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const refreshTimeoutRef = useRef<number | null>(null);
  const sessionCheckIntervalRef = useRef<number | null>(null);
  const isRefreshingRef = useRef(false);
  const maintenanceCheckRef = useRef<number | null>(null);

  // ==================== FONCTIONS ESSENTIELLES ====================
  const cleanupAuthData = useCallback((): void => {
    // Supprimer les cookies
    deleteCookie(STORAGE_KEYS.ACCESS_TOKEN);
    deleteCookie(STORAGE_KEYS.REFRESH_TOKEN);
    
    // Supprimer le localStorage restant
    Object.values(STORAGE_KEYS).forEach(key => {
      if (key !== STORAGE_KEYS.ACCESS_TOKEN && key !== STORAGE_KEYS.REFRESH_TOKEN) {
        window.localStorage?.removeItem(key);
      }
    });

    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setError(null);
    setIsLoading(false);

    if (sessionCheckIntervalRef.current) {
      window.clearInterval(sessionCheckIntervalRef.current);
      sessionCheckIntervalRef.current = null;
    }

    if (maintenanceCheckRef.current) {
      window.clearInterval(maintenanceCheckRef.current);
      maintenanceCheckRef.current = null;
    }
  }, []);

  // ==================== FONCTIONS API ====================
  const fetchWithAuth = useCallback(
    async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
      const token = access_token || getCookie(STORAGE_KEYS.ACCESS_TOKEN);

      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      };

      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        // Token expiré, tentative de refresh
        const refreshSuccess = await attemptTokenRefresh();
        if (refreshSuccess) {
          // Réessayer avec le nouveau token
          const newToken = getCookie(STORAGE_KEYS.ACCESS_TOKEN);
          return fetch(`${baseUrl}${endpoint}`, {
            ...options,
            headers: {
              ...headers,
              Authorization: `Bearer ${newToken}`,
            },
          });
        } else {
          // Refresh échoué, déconnexion
          cleanupAuthData();
          navigate(REDIRECT_PATHS.LOGIN);
          throw new Error('Session expirée');
        }
      }

      return response;
    },
    [access_token]
  );

  const attemptTokenRefresh = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) return false;

    isRefreshingRef.current = true;
    const refreshToken = getCookie(STORAGE_KEYS.REFRESH_TOKEN);

    if (!refreshToken) {
      isRefreshingRef.current = false;
      return false;
    }

    try {
      const response = await fetchWithAuth('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        
        setCookie(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
        setCookie(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
        setAccessToken(data.access_token);
        setRefreshToken(data.refresh_token);

        window.localStorage.setItem(
          STORAGE_KEYS.LAST_REFRESH_TIME,
          Date.now().toString()
        );

        isRefreshingRef.current = false;
        return true;
      }
    } catch (error) {
      console.warn('Refresh token failed:', error);
    }

    isRefreshingRef.current = false;
    return false;
  }, [fetchWithAuth]);

  const checkMaintenanceStatus = useCallback(async (): Promise<void> => {
    try {
      const response = await fetchWithAuth('/users/maintenance-status');
      if (response.ok) {
        const status = await response.json();
        
        setMaintenanceStatus(status);
        window.localStorage?.setItem(
          STORAGE_KEYS.MAINTENANCE_STATUS,
          JSON.stringify(status)
        );
      }
    } catch (error) {
      console.warn('Erreur vérification statut maintenance:', error);
    }
  }, [fetchWithAuth]);

  const fetchUserData = useCallback(async (): Promise<void> => {
    const token = access_token || getCookie(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) return;

    try {
      const response = await fetchWithAuth('/auth/me');
      if (response.ok) {
        const userData = await response.json();
        
        const mappedUser: User = {
          _id: userData._id,
          id: userData._id, // Alias pour compatibilité
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role || UserRole.USER,
          isActive: userData.isActive !== false,
          telephone: userData.telephone,
          isAdmin: userData.role === UserRole.ADMIN,
        };

        setUser(mappedUser);

        // Vérifier le statut maintenance après connexion admin
        if (mappedUser.role === UserRole.ADMIN) {
          await checkMaintenanceStatus();
        }
      } else if (response.status === 401) {
        cleanupAuthData();
      }
    } catch (error) {
      console.warn('Erreur récupération utilisateur:', error);
    }
  }, [fetchWithAuth, access_token]);

  // ==================== FONCTIONS PRINCIPALES ====================
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuth('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
          const data = await response.json();

          setCookie(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
          setCookie(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
          setAccessToken(data.access_token);
          setRefreshToken(data.refresh_token);

          await fetchUserData();

          window.localStorage.setItem(
            STORAGE_KEYS.SESSION_START,
            Date.now().toString()
          );

          // Configurer le refresh automatique
          setupTokenRefresh();

          const redirectPath =
            data.user.role === UserRole.ADMIN
              ? REDIRECT_PATHS.ADMIN_DASHBOARD
              : REDIRECT_PATHS.HOME;

          navigate(redirectPath, { replace: true });
          toast.success(TOAST_MESSAGES.LOGIN_SUCCESS);
        } else if (response.status === 401) {
          const errorData = await response.json();
          const errorMessage =
            API_ERRORS[errorData.message as keyof typeof API_ERRORS] ||
            TOAST_MESSAGES.INVALID_CREDENTIALS;
          setError(errorMessage);
          toast.error(errorMessage);
        } else {
          throw new Error('Réponse invalide du serveur');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : TOAST_MESSAGES.GENERIC_ERROR;
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchWithAuth, fetchUserData, navigate]
  );

  const register = useCallback(
    async (userData: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      telephone: string;
    }): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuth('/auth/register', {
          method: 'POST',
          body: JSON.stringify(userData),
        });

        if (response.ok) {
          const data = await response.json();

          setCookie(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
          setCookie(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
          setAccessToken(data.access_token);
          setRefreshToken(data.refresh_token);

          const mappedUser: User = {
            _id: data.user._id,
            id: data.user._id,
            email: data.user.email,
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            role: data.user.role,
            telephone: data.user.telephone,
            isActive: data.user.isActive !== false,
            isAdmin: data.user.role === UserRole.ADMIN,
          };

          setUser(mappedUser);
          window.localStorage.setItem(
            STORAGE_KEYS.SESSION_START,
            Date.now().toString()
          );

          const redirectPath =
            mappedUser.role === UserRole.ADMIN
              ? REDIRECT_PATHS.ADMIN_DASHBOARD
              : REDIRECT_PATHS.HOME;

          navigate(redirectPath, { replace: true });
          toast.success(TOAST_MESSAGES.REGISTER_SUCCESS);
        } else if (response.status === 401) {
          const errorData = await response.json();
          const errorMessage =
            API_ERRORS[errorData.message as keyof typeof API_ERRORS] ||
            TOAST_MESSAGES.GENERIC_ERROR;
          setError(errorMessage);
          toast.error(errorMessage);
        } else {
          throw new Error('Réponse invalide du serveur');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : TOAST_MESSAGES.GENERIC_ERROR;
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchWithAuth, navigate]
  );

  const logout = useCallback((): void => {
    cleanupAuthData();
    navigate(REDIRECT_PATHS.LOGIN);
    toast.success(TOAST_MESSAGES.LOGOUT_SUCCESS);
  }, [cleanupAuthData, navigate]);

  const logoutAll = useCallback(async (): Promise<void> => {
    try {
      await fetchWithAuth('/auth/logout-all', { method: 'POST' });
      toast.success(TOAST_MESSAGES.LOGOUT_ALL_SUCCESS);
    } catch (error) {
      console.warn('Erreur logout all:', error);
    } finally {
      cleanupAuthData();
      navigate(REDIRECT_PATHS.LOGIN);
    }
  }, [fetchWithAuth, cleanupAuthData, navigate]);

  const updateProfile = useCallback(async (userData: Partial<User>): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        toast.success('Profil mis à jour avec succès');
      } else {
        throw new Error('Erreur lors de la mise à jour du profil');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : TOAST_MESSAGES.GENERIC_ERROR;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth]);

  const toggleMaintenanceMode = useCallback(async (): Promise<void> => {
    try {
      const response = await fetchWithAuth('/users/maintenance-mode', {
        method: 'POST',
      });

      if (response.ok) {
        const newStatus = await response.json();
        setMaintenanceStatus(newStatus);
        window.localStorage.setItem(
          STORAGE_KEYS.MAINTENANCE_STATUS,
          JSON.stringify(newStatus)
        );
        toast.success(`Mode maintenance ${newStatus.isActive ? 'activé' : 'désactivé'}`);
      }
    } catch (error) {
      console.warn('Erreur toggle maintenance:', error);
      toast.error('Erreur lors du changement de mode maintenance');
    }
  }, [fetchWithAuth]);

  const forgotPassword = useCallback(
    async (email: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuth('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });

        if (response.ok) {
          toast.success(TOAST_MESSAGES.FORGOT_PASSWORD_SUCCESS);
          navigate(REDIRECT_PATHS.LOGIN);
        } else {
          throw new Error('Réponse invalide du serveur');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : TOAST_MESSAGES.GENERIC_ERROR;
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchWithAuth, navigate]
  );

  const resetPassword = useCallback(
    async (token: string, newPassword: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuth('/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ token, newPassword }),
        });

        if (response.ok) {
          toast.success(TOAST_MESSAGES.PASSWORD_RESET_SUCCESS);
          navigate(REDIRECT_PATHS.LOGIN);
        } else {
          throw new Error('Réponse invalide du serveur');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : TOAST_MESSAGES.GENERIC_ERROR;
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchWithAuth, navigate]
  );

  const setupTokenRefresh = useCallback((): void => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = window.setTimeout(async () => {
      const success = await attemptTokenRefresh();
      if (!success) {
        cleanupAuthData();
        navigate(REDIRECT_PATHS.LOGIN);
        toast.error(TOAST_MESSAGES.SESSION_EXPIRED);
      }
    }, 50 * 60 * 1000); // 50 minutes
  }, [attemptTokenRefresh, cleanupAuthData, navigate]);

  const checkAuth = useCallback(async (): Promise<void> => {
    const savedToken = getCookie(STORAGE_KEYS.ACCESS_TOKEN);

    if (!savedToken) {
      return;
    }

    try {
      await fetchUserData();
    } catch (error) {
      console.warn('Erreur vérification auth:', error);
      cleanupAuthData();
      navigate(REDIRECT_PATHS.LOGIN);
    }
  }, [fetchUserData, cleanupAuthData, navigate]);

  // ==================== EFFETS ====================
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getCookie(STORAGE_KEYS.ACCESS_TOKEN);
      
      if (token) {
        setAccessToken(token);
        await checkAuth();
        setupTokenRefresh();

        // Vérifier le statut maintenance si admin
        await fetchUserData();
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    // Vérifier la session toutes les minutes (max 30 minutes)
    sessionCheckIntervalRef.current = window.setInterval(() => {
      const sessionStart = window.localStorage?.getItem(
        STORAGE_KEYS.SESSION_START
      );
      if (sessionStart) {
        const sessionDuration = Date.now() - parseInt(sessionStart);
        const maxSessionDuration = 30 * 60 * 1000; // 30 minutes

        if (sessionDuration > maxSessionDuration) {
          cleanupAuthData();
          navigate(REDIRECT_PATHS.LOGIN);
          toast.error(TOAST_MESSAGES.SESSION_EXPIRED);
        }
      }
    }, 60 * 1000); // Chaque minute

    return () => {
      if (sessionCheckIntervalRef.current) {
        window.clearInterval(sessionCheckIntervalRef.current);
      }
    };
  }, [cleanupAuthData, navigate]);

  useEffect(() => {
    // Nettoyer les timeout au démontage
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (sessionCheckIntervalRef.current) {
        window.clearInterval(sessionCheckIntervalRef.current);
      }
      if (maintenanceCheckRef.current) {
        window.clearInterval(maintenanceCheckRef.current);
      }
    };
  }, []);

  // Vérifier le mode maintenance pour les admins
  useEffect(() => {
    if (user?.isAdmin) {
      const checkMaintenance = async () => {
        await checkMaintenanceStatus();
      };

      checkMaintenance();
      maintenanceCheckRef.current = window.setInterval(checkMaintenance, 5 * 60 * 1000); // Toutes les 5 minutes

      return () => {
        if (maintenanceCheckRef.current) {
          window.clearInterval(maintenanceCheckRef.current);
        }
      };
    }
  }, [user?.isAdmin, checkMaintenanceStatus]);

  // Rediriger si non authentifié sur routes protégées
  useEffect(() => {
    const protectedRoutes = ['/gestionnaire', '/profile', '/mes-rendezvous'];
    const isProtectedRoute = protectedRoutes.some(route => 
      location.pathname.startsWith(route)
    );

    if (isProtectedRoute && !access_token && !getCookie(STORAGE_KEYS.ACCESS_TOKEN)) {
      navigate(REDIRECT_PATHS.LOGIN);
    }
  }, [location.pathname, access_token, navigate]);

  const contextValue: AuthContextType = {
    user,
    access_token,
    refresh_token,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    logoutAll,
    forgotPassword,
    resetPassword,
    updateProfile,
    isLoading,
    error,
    checkAuth,
    fetchUserData,
    fetchWithAuth,
    maintenanceStatus,
    isMaintenanceMode: maintenanceStatus?.isActive || false,
    toggleMaintenanceMode,
    checkMaintenanceStatus,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
