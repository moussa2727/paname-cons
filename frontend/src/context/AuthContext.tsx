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
    duration: string;
    timestamp: string;
    userEmails: string[];
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
  refreshToken: () => Promise<boolean>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updateProfile: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>;
}

// ==================== CONSTANTS ALIGNÉES AVEC BACKEND ====================
const AUTH_CONSTANTS = {
  // Durées strictes : 15, 20, 30 minutes (alignées avec auth.constants.ts)
  ACCESS_TOKEN_EXPIRATION_MS: 15 * 60 * 1000,       // ✅ 15 minutes (aligné avec backend)
  ACCESS_TOKEN_EXPIRATION_SECONDS: 15 * 60,         // ✅ 15 minutes en secondes
  REFRESH_TOKEN_EXPIRATION_MS: 30 * 60 * 1000,      // ✅ 30 minutes (corrigé: 30 au lieu de 20)
  REFRESH_TOKEN_EXPIRATION_SECONDS: 30 * 60,        // ✅ 30 minutes en secondes
  MAX_SESSION_DURATION_MS: 30 * 60 * 1000,          // ✅ 30 minutes (aligné avec backend)
  SESSION_EXPIRATION_SECONDS: 30 * 60,              // ✅ 30 minutes en secondes
  SESSION_EXPIRATION_MS: 30 * 60 * 1000,            // ✅ 30 minutes en ms
  
  // Token de réinitialisation
  RESET_TOKEN_EXPIRATION_MS: 20 * 60 * 1000,        // ✅ 20 minutes (aligné avec backend)
  
  // Configuration rafraîchissement
  PREVENTIVE_REFRESH_MS: 1 * 60 * 1000,             // ✅ 1 minute (préventif)
  MAX_REFRESH_ATTEMPTS: 3,
  MIN_REFRESH_INTERVAL_MS: 30000,                   // 30 secondes
  
  // Configuration sessions
  MAX_ACTIVE_SESSIONS_PER_USER: 5,
  SESSION_CHECK_INTERVAL: 20 * 1000,                // 20 secondes
  
  // Codes d'erreur (alignés avec backend)
  ERROR_CODES: {
    PASSWORD_RESET_REQUIRED: 'PASSWORD RESET REQUIRED',
    INVALID_CREDENTIALS: 'INVALID CREDENTIALS',
    COMPTE_DESACTIVE: 'COMPTE DESACTIVE',
    COMPTE_TEMPORAIREMENT_DECONNECTE: 'COMPTE TEMPORAIREMENT DECONNECTE',
    MAINTENANCE_MODE: 'MAINTENANCE MODE',
    SESSION_EXPIRED: 'SESSION EXPIRED',
    NO_PASSWORD_IN_DB: 'NO PASSWORD IN DB',
    AUTH_ERROR: 'AUTH ERROR',
  } as const,

  // Raisons de révocation (alignées avec backend)
  REVOCATION_REASONS: {
    USER_LOGOUT: 'user logout',
    ADMIN_GLOBAL_LOGOUT: 'admin global logout 24h',
    SESSION_EXPIRED: 'session expired',
    MANUAL_REVOKE: 'MANUAL REVOKE',
    ADMIN_CLEANUP: 'ADMIN CLEANUP',
    REVOKE_ALL: 'REVOKE ALL',
  } as const,
} as const;

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  USER_DATA: 'user_data',
  SESSION_START: 'session_start',
  REFRESH_ATTEMPTS: 'refresh_attempts',
  LAST_REFRESH_TIME: 'last_refresh_time',
  LAST_AUTH_CHECK: 'last_auth_check',
} as const;

const REDIRECT_PATHS = {
  LOGIN: '/connexion',
  HOME: '/', // Page d'accueil principale
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
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const isInitialCheckDoneRef = useRef(false);

  // ==================== FONCTIONS ESSENTIELLES ====================
  const cleanupAuthData = useCallback((): void => {
    Object.values(STORAGE_KEYS).forEach(key => {
      window.localStorage?.removeItem(key);
    });

    setAccessToken(null);
    setUser(null);
    setError(null);
    
    refreshAttemptsRef.current = 0;
    isRefreshingRef.current = false;
    isInitialCheckDoneRef.current = false;

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

    try {
      const response = await window.fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      });

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
          
          navigate(REDIRECT_PATHS.HOME, { replace: true }); // Rediriger vers l'accueil
          throw new Error('SESSION EXPIRED');
        }
        
        if (errorData.code) {
          throw new Error(errorData.code);
        }
      }

      return response;
    } catch (error) {
      throw error;
    }
  }, [access_token, cleanupAuthData, navigate]);

  const fetchUserData = useCallback(async (): Promise<void> => {
    try {
      const token = access_token || window.localStorage?.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      
      if (!token) {
        if (import.meta.env.DEV) {
          console.log('Aucun token pour récupérer les données utilisateur');
        }
        return;
      }
      
      const response = await window.fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ME}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
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
        window.localStorage?.setItem(
          STORAGE_KEYS.USER_DATA,
          JSON.stringify(mappedUser)
        );
      } else {
        if (response.status === 401) {
          cleanupAuthData();
        } else {
          console.warn('Erreur récupération utilisateur (non 401):', response.status);
        }
      }
    } catch (error) {
      console.warn('Erreur récupération utilisateur:', error);
    }
   }, [access_token, cleanupAuthData]);

  const handleAuthError = useCallback((error: any, context: string = ''): void => {
      const errorMessage = error.message || 'Erreur inconnue';
      
      if (import.meta.env.DEV) {
        console.error(`❌ Erreur auth [${context}]:`, errorMessage);
      }
      
      if (errorMessage.includes(AUTH_CONSTANTS.ERROR_CODES.PASSWORD_RESET_REQUIRED)) {
        toast.error(TOAST_MESSAGES.PASSWORD_RESET_REQUIRED, { autoClose: 8000 });
        navigate(REDIRECT_PATHS.RESET_PASSWORD_REQUIRED, { 
          state: { email: error.email || '', reason: 'password reset required' } 
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
      } else if (errorMessage === 'SESSION EXPIRED') {
        // Ne pas montrer de toast supplémentaire
      } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        toast.error(TOAST_MESSAGES.NETWORK_ERROR, { autoClose: 5000 });
      } else {
        toast.error(errorMessage, { autoClose: 5000 });
      }
      
      setError(errorMessage);
    }, [navigate]);

  // ==================== MÉTHODES D'AUTHENTIFICATION ====================

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) {
      console.log('⚠️ Refresh déjà en cours');
      return false;
    }

    const lastRefreshTime = window.localStorage?.getItem(STORAGE_KEYS.LAST_REFRESH_TIME);
    if (lastRefreshTime) {
      const timeSinceLastRefresh = Date.now() - parseInt(lastRefreshTime);
      if (timeSinceLastRefresh < AUTH_CONSTANTS.MIN_REFRESH_INTERVAL_MS) {
        console.log(`⏰ Trop tôt pour rafraîchir (${Math.round(timeSinceLastRefresh/1000)}s)`);
        return false;
      }
    }

    isRefreshingRef.current = true;

    try {
      const response = await window.fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REFRESH}`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (response.status === 401) {
        console.log('❌ Refresh token invalide ou expiré');
        cleanupAuthData();
        return false;
      }

      if (!response.ok) {
        console.warn(`❌ Refresh échoué: ${response.status}`);
        return false;
      }

      const data = await response.json();

      if (!data.access_token) {
        console.error('❌ Pas de nouveau token reçu');
        return false;
      }

      window.localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
      setAccessToken(data.access_token);
      window.localStorage.setItem(STORAGE_KEYS.LAST_REFRESH_TIME, Date.now().toString());
      
      console.log('✅ Token rafraîchi avec succès');
      return true;

    } catch (error) {
      console.error('❌ Erreur lors du refresh:', error);
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('🌐 Erreur réseau - le token actuel reste valable');
        return false;
      }
      
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [cleanupAuthData]);

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
      navigate(REDIRECT_PATHS.HOME, { replace: true }); // TOUJOURS REDIRIGER VERS L'ACCUEIL
      toast.info(TOAST_MESSAGES.LOGOUT_SUCCESS);
    }
  }, [access_token, cleanupAuthData, navigate, fetchWithAuth]);

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
          email: data.user.email,
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
              await logout();
              toast.info(TOAST_MESSAGES.SESSION_EXPIRED);
            }
          }, refreshTime);
          
          if (import.meta.env.DEV) {
            console.log(`⏰ Prochain rafraîchissement dans ${Math.round(refreshTime / 1000)}s`);
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
    [navigate, handleAuthError, refreshToken, logout]
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
            headers: { 
              'Content-Type': 'application/json',
            },
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
          if (response.status === 400) {
            const errorMessage = data.message || "Données invalides";
            
            if (data.errors) {
              const validationErrors = Object.values(data.errors).join(', ');
              throw new Error(`Validation échouée : ${validationErrors}`);
            }
            
            throw new Error(errorMessage);
          }
          
          throw new Error(data.message || "Erreur lors de l'inscription");
        }

        if (data.access_token) {
          window.localStorage?.setItem(
            STORAGE_KEYS.ACCESS_TOKEN,
            data.access_token
          );
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
        window.localStorage?.setItem(
          STORAGE_KEYS.USER_DATA,
          JSON.stringify(userData)
        );
        window.localStorage?.setItem(
          STORAGE_KEYS.SESSION_START,
          Date.now().toString()
        );

        if (data.access_token) {
          try {
            const decoded = jwtDecode<JwtPayload>(data.access_token);
            
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
                  if (refreshed) {
                    refreshAttemptsRef.current = 0;
                  } else {
                    refreshAttemptsRef.current++;
                  }
                } else {
                  await logout();
                  toast.info(TOAST_MESSAGES.SESSION_EXPIRED);
                }
              }, refreshTime);
            }
          } catch (error) {
            console.warn('⚠️ Erreur décodage token après inscription:', error);
          }
        }

        const redirectPath = userData.role === UserRole.ADMIN
          ? REDIRECT_PATHS.ADMIN_DASHBOARD
          : REDIRECT_PATHS.HOME;

        navigate(redirectPath, { replace: true });
        toast.success(TOAST_MESSAGES.REGISTER_SUCCESS);
        
        if (import.meta.env.DEV) {
          console.log('✅ Inscription et connexion réussies pour:', data.user.email);
        }
      } catch (err: any) {
        console.error('❌ Erreur inscription:', {
          message: err.message,
          stack: err.stack,
          formData: {
            ...formData,
            password: '[HIDDEN]',
            confirmPassword: '[HIDDEN]'
          }
        });
        
        handleAuthError(err, 'register');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, handleAuthError, refreshToken, logout]
  );

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

      // Déconnecter aussi l'admin localement
      await logout();
      toast.success(data.message || TOAST_MESSAGES.LOGOUT_ALL_SUCCESS);
      return data;
    } catch (err: any) {
      handleAuthError(err, 'logoutAll');
      throw err;
    }
  }, [access_token, user, fetchWithAuth, handleAuthError, logout]);

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
        navigate(REDIRECT_PATHS.HOME); // Rediriger vers l'accueil
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
    const lastCheckTime = window.localStorage?.getItem(STORAGE_KEYS.LAST_AUTH_CHECK);
    if (lastCheckTime) {
      const timeSinceLastCheck = Date.now() - parseInt(lastCheckTime);
      if (timeSinceLastCheck < 10000) {
        return;
      }
    }

    const savedToken = window.localStorage?.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(savedToken);
      const currentTime = Date.now();
      const tokenExpirationTime = decoded.exp * 1000;
      const timeUntilExpiration = tokenExpirationTime - currentTime;

      if (timeUntilExpiration < -60000) {
        console.log('⏰ Token expiré depuis plus d\'1 minute');
        
        if (!isRefreshingRef.current) {
          const refreshed = await refreshToken();
          if (!refreshed) {
            console.warn('⚠️ Refresh échoué pour token expiré');
          }
        }
      } else if (timeUntilExpiration < AUTH_CONSTANTS.PREVENTIVE_REFRESH_MS) {
        console.log(`🔄 Token expire dans ${Math.round(timeUntilExpiration/1000)}s, refresh préventif...`);
        
        if (!isRefreshingRef.current) {
          await refreshToken();
        }
      } else if (!user && timeUntilExpiration > 60000) {
        console.log('🔄 Récupération des données utilisateur...');
        await fetchUserData();
      }
      
      window.localStorage.setItem(STORAGE_KEYS.LAST_AUTH_CHECK, Date.now().toString());
      
    } catch (error) {
      console.warn('⚠️ Erreur vérification auth:', error);
      if (error instanceof Error && error.message.includes('Invalid token')) {
        cleanupAuthData();
      }
    } finally {
      if (!isInitialCheckDoneRef.current) {
        setIsLoading(false);
        isInitialCheckDoneRef.current = true;
      }
    }
  }, [fetchUserData, refreshToken, user, cleanupAuthData]);

  const resetPassword = useCallback(
    async (token: string, newPassword: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

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
        navigate(REDIRECT_PATHS.HOME, { replace: true }); // Rediriger vers l'accueil
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

      if (!isInitialCheckDoneRef.current) {
        await checkAuth();
      }

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
            } else {
              checkAuth();
            }
          }
        }, 30000);
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
    updateProfile: fetchUserData,
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