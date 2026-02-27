import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// ==================== INTERFACES ====================
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
}

interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  user: User;
  message?: string;
}


interface RefreshResponse {
  access_token: string;
  refresh_token?: string;
  message: string;
  expiresIn: number;
  sessionExpired?: boolean;
}

interface LogoutAllResponse {
  message: string;
  success: boolean;
  stats?: {
    usersLoggedOut: number;
    adminPreserved: boolean;
    adminEmail: string;
    duration: string;
    timestamp: string;
    userEmails: string[];
  };
}


interface MaintenanceStatus {
  isActive: boolean;
  enabledAt: string | null;
  message: string;
}

interface AuthContextType {
  user: User | null;
  access_token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<LogoutAllResponse>;
  register: (data: RegisterFormData) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  refreshToken: () => Promise<boolean>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updateProfile: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  fetchWithAuth: <T = any>(endpoint: string, options?: RequestInit) => Promise<T>;
  maintenanceStatus: MaintenanceStatus | null;
  isMaintenanceMode: boolean;
  checkMaintenanceStatus: () => Promise<void>;
  toggleMaintenanceMode: (enabled: boolean) => Promise<boolean>;
  clearAuthToasts: () => void;
}

// ==================== CONTEXT ====================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  // ==================== ÉTATS ====================
  const [user, setUser] = useState<User | null>(null);
  const [access_token, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus | null>(null);

  // Refs pour éviter les boucles
  const refreshTimeoutRef = useRef<number | null>(null);
  const isRefreshingRef = useRef(false);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);
  const authCheckDoneRef = useRef(false);
  const refreshAttemptsRef = useRef(0);
  const accessTokenRef = useRef<string | null>(null);

  // ==================== CONSTANTS ====================
  const AUTH_CONSTANTS = {
    ACCESS_TOKEN_EXPIRATION_MS: 15 * 60 * 1000,
    REFRESH_TOKEN_EXPIRATION_MS: 30 * 60 * 1000,
    PREVENTIVE_REFRESH_MS: 5 * 60 * 1000,
    MAX_REFRESH_ATTEMPTS: 3,
    REFRESH_COOLDOWN_MS: 5000,

    ERROR_CODES: {
      PASSWORD_RESET_REQUIRED: 'PASSWORD RESET REQUIRED',
      INVALID_CREDENTIALS: 'INVALID CREDENTIALS',
      COMPTE_DESACTIVE: 'COMPTE DESACTIVE',
      COMPTE_TEMPORAIREMENT_DECONNECTE: 'COMPTE TEMPORAIREMENT DECONNECTE',
      MAINTENANCE_MODE: 'MAINTENANCE MODE',
      SESSION_EXPIRED: 'SESSION EXPIREE',
      INVALID_TOKEN_TYPE: 'INVALID_TOKEN_TYPE',
    } as const,
  } as const;

  const API_CONFIG = {
    BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000',
    ENDPOINTS: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      REFRESH: '/api/auth/refresh',
      LOGOUT: '/api/auth/logout',
      LOGOUT_ALL: '/api/auth/logout-all',
      ME: '/api/auth/me',
      FORGOT_PASSWORD: '/api/auth/forgot-password',
      RESET_PASSWORD: '/api/auth/reset-password',
      MAINTENANCE_STATUS: '/api/users/maintenance-status',
      MAINTENANCE_MODE: '/api/users/maintenance-mode',
    },
  } as const;

  const REDIRECT_PATHS = {
    LOGIN: '/connexion',
    DASHBOARD: '/tableau-de-bord',
    ADMIN_DASHBOARD: '/admin/tableau-de-bord',
  } as const;

  const TOAST_MESSAGES = {
    LOGIN_SUCCESS: 'Connexion réussie !',
    LOGOUT_SUCCESS: 'Déconnexion réussie',
    REGISTER_SUCCESS: 'Inscription réussie !',
    PASSWORD_RESET_SENT: 'Email de réinitialisation envoyé',
    PASSWORD_RESET_SUCCESS: 'Mot de passe réinitialisé avec succès',
    SESSION_EXPIRED: 'Votre session a expiré, veuillez vous reconnecter',
    ACCOUNT_DISABLED: 'Compte désactivé. Contactez l\'administrateur.',
    ADMIN_DISCONNECT: 'Déconnexion administrative',
    MAINTENANCE_MODE: 'Système en maintenance',
    VALIDATION_ERROR: 'Veuillez vérifier les informations saisies.',
  } as const;

  // Système de toasts uniques
  const toastRegistry = useRef<Set<string>>(new Set());
  const TOAST_IDS = {
    LOGIN_SUCCESS: 'auth-login-success',
    LOGOUT_SUCCESS: 'auth-logout-success', 
    REGISTER_SUCCESS: 'auth-register-success',
    PASSWORD_RESET_SENT: 'auth-password-reset-sent',
    PASSWORD_RESET_SUCCESS: 'auth-password-reset-success',
    SESSION_EXPIRED: 'auth-session-expired',
    ACCOUNT_DISABLED: 'auth-account-disabled',
    ADMIN_DISCONNECT: 'auth-admin-disconnect',
    MAINTENANCE_MODE: 'auth-maintenance-mode',
    VALIDATION_ERROR: 'auth-validation-error',
  } as const;

  // Fonction pour afficher un toast unique
  const showUniqueToast = useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    toastId: string,
    options?: any
  ) => {
    if (toastRegistry.current.has(toastId)) return;
    
    toast[type](message, {
      toastId,
      ...options,
      onClose: () => {
        toastRegistry.current.delete(toastId);
        options?.onClose?.();
      }
    });
    
    toastRegistry.current.add(toastId);
  }, []);

  const clearAuthToasts = useCallback(() => {
    toastRegistry.current.clear();
  }, []);

  // ==================== FONCTIONS UTILITAIRES ====================
  const handleAuthError = useCallback(
    (error: unknown, context: string): void => {
      // Log minimal sans détails
      console.error(`[AuthContext] Erreur ${context}`);

      if (error instanceof Error) {
        const errorMessage = error.message;

        if (errorMessage === AUTH_CONSTANTS.ERROR_CODES.PASSWORD_RESET_REQUIRED) {
          setError('Vous devez réinitialiser votre mot de passe');
          navigate('/mot-de-passe-oublie', { replace: true });
          return;
        }

        if (errorMessage === AUTH_CONSTANTS.ERROR_CODES.COMPTE_DESACTIVE) {
          setError('Votre compte a été désactivé');
          showUniqueToast('error', TOAST_MESSAGES.ACCOUNT_DISABLED, TOAST_IDS.ACCOUNT_DISABLED);
          navigate(REDIRECT_PATHS.LOGIN, { replace: true });
          return;
        }

        if (errorMessage.includes(AUTH_CONSTANTS.ERROR_CODES.COMPTE_TEMPORAIREMENT_DECONNECTE)) {
          setError('Compte temporairement déconnecté');
          showUniqueToast('warning', TOAST_MESSAGES.ADMIN_DISCONNECT, TOAST_IDS.ADMIN_DISCONNECT);
          navigate(REDIRECT_PATHS.LOGIN, { replace: true });
          return;
        }

        if (errorMessage === AUTH_CONSTANTS.ERROR_CODES.MAINTENANCE_MODE) {
          setError('Mode maintenance activé');
          showUniqueToast('warning', TOAST_MESSAGES.MAINTENANCE_MODE, TOAST_IDS.MAINTENANCE_MODE);
          return;
        }

        if (errorMessage === AUTH_CONSTANTS.ERROR_CODES.SESSION_EXPIRED) {
          cleanupAuthData();
          if (!window.location.pathname.includes(REDIRECT_PATHS.LOGIN)) {
            showUniqueToast('info', TOAST_MESSAGES.SESSION_EXPIRED, TOAST_IDS.SESSION_EXPIRED);
            navigate(REDIRECT_PATHS.LOGIN, { replace: true });
          }
          return;
        }
      }

      setError('Une erreur est survenue');
    },
    [navigate]
  );

  const cleanupAuthData = useCallback((): void => {
    console.log('[AuthContext] Nettoyage session');
    
    setAccessToken(null);
    setUser(null);
    setError(null);
    setMaintenanceStatus(null);
    accessTokenRef.current = null;
    
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c.replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  }, []);

  // ==================== REFRESH TOKEN ====================
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) {
      if (refreshPromiseRef.current) return refreshPromiseRef.current;
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!isRefreshingRef.current) {
            clearInterval(checkInterval);
            resolve(!!access_token);
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(false);
        }, 5000);
      });
    }

    if (refreshAttemptsRef.current >= AUTH_CONSTANTS.MAX_REFRESH_ATTEMPTS) {
      cleanupAuthData();
      return false;
    }

    isRefreshingRef.current = true;
    refreshAttemptsRef.current++;

    const refreshPromise = (async (): Promise<boolean> => {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REFRESH}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.status === 401) return false;
        if (!response.ok) return false;

        const data: RefreshResponse = await response.json();
        if (data.sessionExpired || !data.access_token) return false;

        setAccessToken(data.access_token);
        accessTokenRef.current = data.access_token;
        refreshAttemptsRef.current = 0;
        return true;

      } catch {
        return false;
      } finally {
        isRefreshingRef.current = false;
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, [cleanupAuthData]);

  // ==================== FETCH AVEC AUTH ====================
  const fetchWithAuth = useCallback(
    async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      const url = `${API_CONFIG.BASE_URL}${endpoint}`;
      let attempts = 0;
      const maxAttempts = 2;
      
      while (attempts < maxAttempts) {
        attempts++;
        
        try {
          const token = accessTokenRef.current;
          const headers: Record<string, string> = {};
          
          if (token) headers['Authorization'] = `Bearer ${token}`;
          
          if (options.headers) {
            Object.entries(options.headers).forEach(([key, value]) => {
              if (key !== 'Content-Type') headers[key] = value as string;
            });
          }

          if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
          }

          const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
          });

          if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed && attempts < maxAttempts) continue;
            throw new Error(AUTH_CONSTANTS.ERROR_CODES.SESSION_EXPIRED);
          }

          if (!response.ok) {
            let errorData: any = {};
            try {
              errorData = await response.json();
            } catch {}
            throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
          }

          return await response.json() as T;
          
        } catch (error) {
          if (attempts >= maxAttempts) throw error;
          if (error instanceof Error && error.message === AUTH_CONSTANTS.ERROR_CODES.SESSION_EXPIRED) throw error;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      throw new Error(`Échec après ${maxAttempts} tentatives`);
    },
    [refreshToken]
  );

  // ==================== RÉCUPÉRATION UTILISATEUR ====================
  const fetchUserData = useCallback(async (): Promise<User | null> => {
    try {
      const userData = await fetchWithAuth<User>(API_CONFIG.ENDPOINTS.ME);
      const userWithAdmin = {
        ...userData,
        isAdmin: userData.role === UserRole.ADMIN,
      };
      setUser(userWithAdmin);
      return userWithAdmin;
    } catch {
      return null;
    }
  }, [fetchWithAuth]);

  // ==================== VÉRIFICATION AUTH ====================
  const checkAuth = useCallback(async (): Promise<void> => {
    if (authCheckDoneRef.current) return;

    setIsLoading(true);
    try {
      const refreshed = await refreshToken();
      if (refreshed) await fetchUserData();
    } finally {
      setIsLoading(false);
      authCheckDoneRef.current = true;
    }
  }, [refreshToken, fetchUserData]);

  // ==================== GESTION MAINTENANCE ====================
  const checkMaintenanceStatus = useCallback(async (): Promise<void> => {
    if (!user || user.role !== UserRole.ADMIN) return;
    try {
      const status = await fetchWithAuth<MaintenanceStatus>(API_CONFIG.ENDPOINTS.MAINTENANCE_STATUS);
      setMaintenanceStatus(status);
    } catch {}
  }, [user, fetchWithAuth]);

  const toggleMaintenanceMode = useCallback(async (enabled: boolean): Promise<boolean> => {
    if (!user || user.role !== UserRole.ADMIN) return false;
    try {
      await fetchWithAuth(API_CONFIG.ENDPOINTS.MAINTENANCE_MODE, {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      });
      await checkMaintenanceStatus();
      return true;
    } catch {
      return false;
    }
  }, [user, fetchWithAuth, checkMaintenanceStatus]);

  // ==================== LOGIN ====================
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        const data: LoginResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Erreur de connexion');
        }

        setAccessToken(data.access_token);
        accessTokenRef.current = data.access_token;
        
        const userData: User = {
          ...data.user,
          isAdmin: data.user.role === UserRole.ADMIN,
        };
        setUser(userData);

        const redirectPath = userData.isAdmin
          ? REDIRECT_PATHS.ADMIN_DASHBOARD
          : REDIRECT_PATHS.DASHBOARD;

        navigate(redirectPath, { replace: true });
        showUniqueToast('success', TOAST_MESSAGES.LOGIN_SUCCESS, TOAST_IDS.LOGIN_SUCCESS);

        if (userData.isAdmin) await checkMaintenanceStatus();

      } catch (error) {
        handleAuthError(error, 'login');
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, handleAuthError, checkMaintenanceStatus]
  );

  // ==================== LOGOUT ====================
  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGOUT}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(accessTokenRef.current && { Authorization: `Bearer ${accessTokenRef.current}` }),
        },
      });
    } catch {
      // Ignorer
    } finally {
      cleanupAuthData();
      clearAuthToasts();
      navigate(REDIRECT_PATHS.LOGIN, { replace: true });
      showUniqueToast('success', TOAST_MESSAGES.LOGOUT_SUCCESS, TOAST_IDS.LOGOUT_SUCCESS);
    }
  }, [navigate, cleanupAuthData, clearAuthToasts]);

  // ==================== LOGOUT ALL ====================
  const logoutAll = useCallback(async (): Promise<LogoutAllResponse> => {
    try {
      const data = await fetchWithAuth<LogoutAllResponse>(API_CONFIG.ENDPOINTS.LOGOUT_ALL, {
        method: 'POST',
      });
      cleanupAuthData();
      clearAuthToasts();
      navigate(REDIRECT_PATHS.LOGIN, { replace: true });
      showUniqueToast('success', TOAST_MESSAGES.LOGOUT_SUCCESS, TOAST_IDS.LOGOUT_SUCCESS);
      return data;
    } catch (error) {
      handleAuthError(error, 'logoutAll');
      return { message: 'Erreur', success: false };
    }
  }, [fetchWithAuth, cleanupAuthData, navigate, handleAuthError, clearAuthToasts]);


  // ==================== REGISTER ====================
const register = useCallback(
  async (formData: RegisterFormData): Promise<void> => {
    setIsLoading(true);
    setError(null);
    clearAuthToasts(); // Nettoyer les toasts existants

    try {
      console.log('[register] Tentative pour:', formData.email);

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important pour recevoir les cookies
        body: JSON.stringify(formData),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        data = { message: 'Erreur de parsing de la réponse' };
      }

      if (!response.ok) {
        // Gestion plus précise des erreurs
        if (response.status === 400) {
          if (data.message?.includes('email') || data.message?.includes('Email')) {
            throw new Error('Cet email est déjà utilisé');
          } else if (data.message?.includes('téléphone') || data.message?.includes('Téléphone')) {
            throw new Error('Ce numéro de téléphone est déjà utilisé');
          } else {
            throw new Error(data.message || 'Données invalides');
          }
        }
        throw new Error(data.message || 'Erreur lors de l\'inscription');
      }

      console.log('[register] Inscription réussie');

      // Mise à jour du token d'accès
      if (data.access_token) {
        setAccessToken(data.access_token);
        accessTokenRef.current = data.access_token;
      }

      // Mise à jour des informations utilisateur
      if (data.user) {
        const userData: User = {
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          telephone: data.user.telephone,
          role: data.user.role,
          isActive: data.user.isActive ?? true,
          isAdmin: data.user.role === UserRole.ADMIN || data.user.isAdmin === true,
        };
        setUser(userData);
      }

      // Redirection basée sur le rôle
      const redirectPath = data.user?.role === UserRole.ADMIN
        ? REDIRECT_PATHS.ADMIN_DASHBOARD
        : REDIRECT_PATHS.DASHBOARD;

      // Afficher le toast de succès
      showUniqueToast('success', TOAST_MESSAGES.REGISTER_SUCCESS, TOAST_IDS.REGISTER_SUCCESS);

      // Navigation
      navigate(redirectPath, { replace: true });

      // Vérifier le statut de maintenance pour les admins
      if (data.user?.role === UserRole.ADMIN) {
        await checkMaintenanceStatus();
      }

    } catch (error) {
      console.error('[register] Erreur:', error);
      
      // Gestion des erreurs avec messages appropriés
      if (error instanceof Error) {
        setError(error.message);
        showUniqueToast('error', error.message, 'register-error');
      } else {
        setError('Erreur lors de la création du compte');
        showUniqueToast('error', 'Erreur lors de la création du compte', 'register-error');
      }
      
      // Ne pas rediriger en cas d'erreur
    } finally {
      setIsLoading(false);
    }
  },
  [navigate, handleAuthError, checkMaintenanceStatus, clearAuthToasts, showUniqueToast]
);

  // ==================== FORGOT PASSWORD ====================
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
          throw new Error('Erreur lors de l\'envoi de l\'email');
        }

        showUniqueToast('success', TOAST_MESSAGES.PASSWORD_RESET_SENT, TOAST_IDS.PASSWORD_RESET_SENT);
        navigate('/connexion', { replace: true });
      } catch (error) {
        handleAuthError(error, 'forgotPassword');
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, handleAuthError]
  );

  // ==================== RESET PASSWORD ====================
  const resetPassword = useCallback(
    async (token: string, newPassword: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.RESET_PASSWORD}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword }),
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la réinitialisation');
        }

        showUniqueToast('success', TOAST_MESSAGES.PASSWORD_RESET_SUCCESS, TOAST_IDS.PASSWORD_RESET_SUCCESS);
        navigate('/connexion', { replace: true });
      } catch (error) {
        handleAuthError(error, 'resetPassword');
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, handleAuthError]
  );

  // ==================== UPDATE PROFILE ====================
  const updateProfile = useCallback(async (): Promise<void> => {
    await fetchUserData();
  }, [fetchUserData]);

  // ==================== EFFETS ====================
  useEffect(() => {
    checkAuth();
    
    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
      clearAuthToasts();
    };
  }, []);

  // ==================== VALEUR DU CONTEXT ====================
  const value: AuthContextType = {
    user,
    access_token,
    login,
    logout,
    logoutAll,
    register,
    forgotPassword,
    resetPassword,
    refreshToken,
    updateProfile,
    fetchWithAuth,
    checkMaintenanceStatus,
    toggleMaintenanceMode,
    clearAuthToasts,
    isAuthenticated: !!user && !!access_token,
    isLoading,
    error,
    maintenanceStatus,
    isMaintenanceMode: maintenanceStatus?.isActive === true,
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

export type { User, AuthContextType, LogoutAllResponse };
export { UserRole };