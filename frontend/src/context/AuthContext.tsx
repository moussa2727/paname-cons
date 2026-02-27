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
}

interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  user: User;
  message?: string;
}

interface RegisterResponse {
  message: string;
  user?: User;
  access_token?: string;
  refresh_token?: string;
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

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
  jti?: string;
  tokenType?: string;
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
  clearAuthToasts: () => void; // Fonction pour nettoyer les toasts d'authentification
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
    ACCESS_TOKEN_EXPIRATION_MS: 15 * 60 * 1000, // 15 minutes
    REFRESH_TOKEN_EXPIRATION_MS: 30 * 60 * 1000, // 30 minutes
    PREVENTIVE_REFRESH_MS: 5 * 60 * 1000, // 5 minutes avant expiration
    MAX_REFRESH_ATTEMPTS: 3,
    REFRESH_COOLDOWN_MS: 5000, // 5 secondes entre les tentatives

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
      MAINTENANCE_STATUS: '/api/users/maintenance-status',  // GET
      MAINTENANCE_MODE: '/api/users/maintenance-mode',      // POST
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
    ADMIN_DISCONNECT: 'Déconnexion administrative pour {hours} heures',
    MAINTENANCE_MODE: 'Système en maintenance',
    TOKEN_REFRESH_ERROR: 'Erreur de rafraîchissement du token',
    NETWORK_ERROR: 'Erreur réseau. Veuillez vérifier votre connexion.',
    VALIDATION_ERROR: 'Veuillez vérifier les informations saisies.',
  } as const;

  // Système de toasts uniques pour éviter les doublons
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
    TOKEN_REFRESH_ERROR: 'auth-token-refresh-error',
    NETWORK_ERROR: 'auth-network-error',
    VALIDATION_ERROR: 'auth-validation-error',
  } as const;

  // Fonction pour afficher un toast unique avec anti-doublon
  const showUniqueToast = useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    toastId: string,
    options?: any
  ) => {
    // Vérifier si un toast avec le même ID est déjà affiché
    if (toastRegistry.current.has(toastId)) {
      // Ne pas afficher de doublon
      return;
    }

    // Créer un nouveau toast
    toast[type](message, {
      toastId: toastId,
      ...options,
      onClose: () => {
        // Nettoyer le registre quand le toast est fermé
        toastRegistry.current.delete(toastId);
        options?.onClose?.();
      }
    });

    // Enregistrer le toast dans le registre
    toastRegistry.current.add(toastId);
  }, []);

  // Fonction pour nettoyer tous les toasts d'authentification
  const clearAuthToasts = useCallback(() => {
    // Vider le registre
    toastRegistry.current.clear();
    // Les toasts seront automatiquement nettoyés lorsqu'ils se fermeront
  }, []);

  // ==================== FONCTIONS UTILITAIRES ====================
  const handleAuthError = useCallback(
    (error: unknown, context: string): void => {
      console.error(`[AuthContext] Erreur dans ${context}:`, error);

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
          const hours = errorMessage.split(':')[1] || '24';
          setError(`Compte temporairement déconnecté (${hours}h restantes)`);
          showUniqueToast('warning', TOAST_MESSAGES.ADMIN_DISCONNECT.replace('{hours}', hours), TOAST_IDS.ADMIN_DISCONNECT);
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
    console.log('[AuthContext] Nettoyage des données d\'authentification');
    
    setAccessToken(null);
    setUser(null);
    setError(null);
    setMaintenanceStatus(null);

    // Nettoyer les refs
    accessTokenRef.current = null;
    isRefreshingRef.current = false;
    refreshPromiseRef.current = null;
    refreshAttemptsRef.current = 0;
    authCheckDoneRef.current = false;

    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  // ==================== REFRESH TOKEN (SANS BOUCLE) ====================
  const refreshToken = useCallback(async (): Promise<boolean> => {
    // Éviter les refresh concurrents
    if (isRefreshingRef.current) {
      console.log('[refreshToken] Refresh déjà en cours, attente du résultat...');
      
      // Si une promesse de refresh existe, l'attendre
      if (refreshPromiseRef.current) {
        return refreshPromiseRef.current;
      }
      
      // Sinon, attendre que le refresh en cours se termine
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!isRefreshingRef.current) {
            clearInterval(checkInterval);
            resolve(!!access_token);
          }
        }, 100);
        
        // Timeout après 5 secondes
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(false);
        }, 5000);
      });
    }

    // Vérifier le nombre de tentatives
    if (refreshAttemptsRef.current >= AUTH_CONSTANTS.MAX_REFRESH_ATTEMPTS) {
      console.error('[refreshToken] Trop de tentatives de refresh, arrêt');
      cleanupAuthData();
      navigate(REDIRECT_PATHS.LOGIN, { replace: true });
      return false;
    }

    isRefreshingRef.current = true;
    refreshAttemptsRef.current++;
    
    console.log(`[refreshToken] Tentative ${refreshAttemptsRef.current}/${AUTH_CONSTANTS.MAX_REFRESH_ATTEMPTS}`);

    // Créer la promesse de refresh
    const refreshPromise = (async (): Promise<boolean> => {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REFRESH}`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('[refreshToken] Réponse reçue:', {
          status: response.status,
          statusText: response.statusText
        });

        if (!response.ok) {
          if (response.status === 401) {
            console.log('[refreshToken] Refresh token invalide ou expiré');
            cleanupAuthData();
            navigate(REDIRECT_PATHS.LOGIN, { replace: true });
            return false;
          }
          
          // Autre erreur, réessayer après un délai
          if (refreshAttemptsRef.current < AUTH_CONSTANTS.MAX_REFRESH_ATTEMPTS) {
            await new Promise(resolve => 
              setTimeout(resolve, AUTH_CONSTANTS.REFRESH_COOLDOWN_MS)
            );
          }
          return false;
        }

        const data: RefreshResponse = await response.json();
        
        // Vérifier si la session a expiré
        if (data.sessionExpired) {
          console.log('[refreshToken] Session expirée détectée dans la réponse');
          cleanupAuthData();
          navigate(REDIRECT_PATHS.LOGIN, { replace: true });
          return false;
        }
        
        if (!data.access_token) {
          throw new Error('Pas de token dans la réponse');
        }

        console.log('[refreshToken] Succès du refresh');
        
        // Mettre à jour le token dans l'état et la ref
        setAccessToken(data.access_token);
        accessTokenRef.current = data.access_token;
        
        // Réinitialiser le compteur de tentatives
        refreshAttemptsRef.current = 0;
        
        return true;

      } catch (error) {
        console.error('[refreshToken] Erreur:', error);
        
        // Réessayer si possible
        if (refreshAttemptsRef.current < AUTH_CONSTANTS.MAX_REFRESH_ATTEMPTS) {
          await new Promise(resolve => 
            setTimeout(resolve, AUTH_CONSTANTS.REFRESH_COOLDOWN_MS)
          );
        }
        return false;
      } finally {
        isRefreshingRef.current = false;
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, [navigate, cleanupAuthData]);

  // ==================== FETCH AVEC AUTH (SANS BOUCLE) ====================
  const fetchWithAuth = useCallback(
    async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      const url = `${API_CONFIG.BASE_URL}${endpoint}`;
      
      let attempts = 0;
      const maxAttempts = 2; // Maximum 2 tentatives (original + 1 refresh)
      
      while (attempts < maxAttempts) {
        attempts++;
        
        try {
          // Récupérer le token actuel à chaque tentative
          const token = accessTokenRef.current;
          
          // Gestion des headers - ne pas définir Content-Type pour FormData
          const headers: Record<string, string> = {};
          
          // Ajouter le token d'authentification
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          // Ajouter les autres headers (sauf Content-Type qui sera géré séparément)
          if (options.headers) {
            Object.entries(options.headers).forEach(([key, value]) => {
              if (key !== 'Content-Type') {
                headers[key] = value as string;
              }
            });
          }

          // Ne pas définir Content-Type si c'est du FormData (le navigateur le fait automatiquement avec boundary)
          if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
          }

          console.log(`[fetchWithAuth] Appel à ${endpoint} (tentative ${attempts})`, {
            hasToken: !!token
          });

          const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
          });

          // Gestion du 401 - Token expiré
          if (response.status === 401) {
            console.log('[fetchWithAuth] Token expiré, tentative de refresh...');
            
            // Tenter un refresh
            const refreshed = await refreshToken();
            
            if (refreshed && attempts < maxAttempts) {
              // Le token a été mis à jour dans l'état, réessayer avec le nouveau token
              console.log('[fetchWithAuth] Token rafraîchi, nouvelle tentative...');
              continue;
            } else {
              // Refresh échoué
              throw new Error(AUTH_CONSTANTS.ERROR_CODES.SESSION_EXPIRED);
            }
          }

          // Autres erreurs HTTP
          if (!response.ok) {
            let errorData: any = {};
            try {
              errorData = await response.json();
            } catch {
              // Ignorer
            }
            throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
          }

          // Succès
          const data = await response.json();
          return data as T;
          
        } catch (error) {
          console.error(`[fetchWithAuth] Erreur (tentative ${attempts}):`, error);
          
          // Si c'est la dernière tentative, propager l'erreur
          if (attempts >= maxAttempts) {
            throw error;
          }
          
          // Si l'erreur est SESSION_EXPIRED, ne pas réessayer
          if (error instanceof Error && error.message === AUTH_CONSTANTS.ERROR_CODES.SESSION_EXPIRED) {
            throw error;
          }
          
          // Attendre un peu avant de réessayer
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      throw new Error(`Échec après ${maxAttempts} tentatives`);
    },
    [refreshToken]
  );

  // ==================== RÉCUPÉRATION DONNÉES UTILISATEUR ====================
  const fetchUserData = useCallback(async (): Promise<User | null> => {
    try {
      console.log('[fetchUserData] Récupération des données utilisateur...');
      
      const userData = await fetchWithAuth<User>(API_CONFIG.ENDPOINTS.ME);
      

      // Ajouter isAdmin
      const userWithAdmin = {
        ...userData,
        isAdmin: userData.role === UserRole.ADMIN,
      };

      setUser(userWithAdmin);
      return userWithAdmin;
      
    } catch (error) {
      console.warn('[fetchUserData] Erreur:', error);
      return null;
    }
  }, [fetchWithAuth]);

  // ==================== VÉRIFICATION DE L'AUTH (SANS BOUCLE) ====================
  const checkAuth = useCallback(async (): Promise<void> => {
    // Éviter les vérifications multiples
    if (authCheckDoneRef.current) {
      console.log('[checkAuth] Déjà vérifié, skip');
      return;
    }

    console.log('[checkAuth] Début vérification authentification');
    setIsLoading(true);

    try {
      // Tenter de rafraîchir le token
      const refreshed = await refreshToken();
      
      if (refreshed) {
        console.log('[checkAuth] Token rafraîchi avec succès');
        
        // Récupérer les données utilisateur
        const userData = await fetchUserData();
        
        if (userData) {
          console.log('[checkAuth] Utilisateur authentifié');
          
          // Planifier le prochain refresh
          if (accessTokenRef.current) {
            try {
              const decoded = jwtDecode<JwtPayload>(accessTokenRef.current);
              const expiresIn = decoded.exp * 1000 - Date.now();
              
              if (expiresIn > 0) {
                const refreshTime = Math.max(
                  30000,
                  expiresIn - AUTH_CONSTANTS.PREVENTIVE_REFRESH_MS
                );
                
                if (refreshTimeoutRef.current) {
                  window.clearTimeout(refreshTimeoutRef.current);
                }
                
                refreshTimeoutRef.current = window.setTimeout(() => {
                  refreshToken();
                }, refreshTime);
              }
            } catch (error) {
              console.warn('[checkAuth] Erreur décodage token:', error);
            }
          }
          
          // Vérifier maintenance pour admin
          if (userData.role === UserRole.ADMIN) {
            checkMaintenanceStatus().catch(console.warn);
          }
        } else {
          console.log('[checkAuth] Impossible de récupérer les données utilisateur');
          cleanupAuthData();
        }
      } else {
        console.log('[checkAuth] Aucune session active');
        cleanupAuthData();
      }
      
    } catch (error) {
      console.error('[checkAuth] Erreur:', error);
      cleanupAuthData();
    } finally {
      setIsLoading(false);
      authCheckDoneRef.current = true;
    }
  }, [refreshToken, fetchUserData, cleanupAuthData]);

  // ==================== GESTION MAINTENANCE ====================
const checkMaintenanceStatus = useCallback(async (): Promise<void> => {
  if (!user || user.role !== UserRole.ADMIN) {
    return;
  }

  try {
    // Utiliser le bon endpoint
    const status = await fetchWithAuth<MaintenanceStatus>(API_CONFIG.ENDPOINTS.MAINTENANCE_STATUS);
    setMaintenanceStatus(status);
    
    // Mettre à jour le cookie si nécessaire
    const statusString = JSON.stringify(status);
    const encodedStatus = encodeURIComponent(statusString);
    document.cookie = `maintenance_status=${encodedStatus}; max-age=${24*60*60}; path=/; secure; samesite=none`;
    
  } catch (error) {
    console.warn('[checkMaintenanceStatus] Erreur:', error);
  }
}, [user, fetchWithAuth]);

const toggleMaintenanceMode = useCallback(async (enabled: boolean): Promise<boolean> => {
  if (!user || user.role !== UserRole.ADMIN) {
    return false;
  }

  try {
    // Utiliser le bon endpoint avec POST
    await fetchWithAuth(API_CONFIG.ENDPOINTS.MAINTENANCE_MODE, {
      method: 'POST',
      body: JSON.stringify({ enabled }), // Note: { enabled } pas { isActive }
    });
    
    // Re-vérifier le statut après modification
    await checkMaintenanceStatus();
    return true;
  } catch (error) {
    console.error('[toggleMaintenanceMode] Erreur:', error);
    return false;
  }
}, [user, fetchWithAuth, checkMaintenanceStatus]);

  // ==================== MÉTHODES D'AUTHENTIFICATION ====================
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('[login] Tentative de connexion pour:', email);

        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        const data: LoginResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Erreur de connexion');
        }

        // Stocker le token dans l'état et la ref
        setAccessToken(data.access_token);
        accessTokenRef.current = data.access_token;
        
        // Transformer et stocker l'utilisateur
        const userData: User = {
          ...data.user,
          isAdmin: data.user.role === UserRole.ADMIN,
        };
        setUser(userData);

        // Planifier le refresh
        try {
          const decoded = jwtDecode<JwtPayload>(data.access_token);
          const expiresIn = decoded.exp * 1000 - Date.now();
          
          if (expiresIn > 0) {
            const refreshTime = Math.max(
              30000,
              expiresIn - AUTH_CONSTANTS.PREVENTIVE_REFRESH_MS
            );
            
            if (refreshTimeoutRef.current) {
              window.clearTimeout(refreshTimeoutRef.current);
            }
            
            refreshTimeoutRef.current = window.setTimeout(() => {
              refreshToken();
            }, refreshTime);
          }
        } catch (error) {
          console.warn('[login] Erreur décodage token:', error);
        }

        // Redirection
        const redirectPath = userData.isAdmin
          ? REDIRECT_PATHS.ADMIN_DASHBOARD
          : REDIRECT_PATHS.DASHBOARD;

        navigate(redirectPath, { replace: true });
        showUniqueToast('success', TOAST_MESSAGES.LOGIN_SUCCESS, TOAST_IDS.LOGIN_SUCCESS);

        // Vérifier maintenance pour admin
        if (userData.isAdmin) {
          await checkMaintenanceStatus();
        }

      } catch (error) {
        handleAuthError(error, 'login');
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, handleAuthError, refreshToken, checkMaintenanceStatus]
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      console.log('[logout] Déconnexion...');
      
      await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGOUT}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(accessTokenRef.current && { Authorization: `Bearer ${accessTokenRef.current}` }),
        },
      });
      
    } catch (error) {
      console.warn('[logout] Erreur lors de la déconnexion:', error);
    } finally {
      cleanupAuthData();
      clearAuthToasts(); // Nettoyer les toasts d'authentification
      navigate(REDIRECT_PATHS.LOGIN, { replace: true });
      showUniqueToast('success', TOAST_MESSAGES.LOGOUT_SUCCESS, TOAST_IDS.LOGOUT_SUCCESS);
    }
  }, [navigate, cleanupAuthData, clearAuthToasts]);

  const logoutAll = useCallback(async (): Promise<LogoutAllResponse> => {
    try {
      console.log('[logoutAll] Déconnexion de tous les utilisateurs...');
      
      const data = await fetchWithAuth<LogoutAllResponse>(API_CONFIG.ENDPOINTS.LOGOUT_ALL, {
        method: 'POST',
      });

      cleanupAuthData();
      clearAuthToasts(); // Nettoyer les toasts d'authentification
      navigate(REDIRECT_PATHS.LOGIN, { replace: true });
      showUniqueToast('success', TOAST_MESSAGES.LOGOUT_SUCCESS, TOAST_IDS.LOGOUT_SUCCESS);

      return data;
    } catch (error) {
      handleAuthError(error, 'logoutAll');
      return { message: 'Erreur', success: false };
    }
  }, [fetchWithAuth, cleanupAuthData, navigate, handleAuthError, clearAuthToasts]);

  const register = useCallback(
    async (formData: RegisterFormData): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('[register] Inscription pour:', formData.email);

        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(formData),
        });

        const data: RegisterResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Erreur lors de l\'inscription');
        }

        if (data.access_token) {
          setAccessToken(data.access_token);
          accessTokenRef.current = data.access_token;
        }

        if (data.user) {
          const userData: User = {
            ...data.user,
            isAdmin: data.user.role === UserRole.ADMIN,
          };
          setUser(userData);
        }

        const redirectPath = data.user?.role === UserRole.ADMIN
          ? REDIRECT_PATHS.ADMIN_DASHBOARD
          : REDIRECT_PATHS.DASHBOARD;

        navigate(redirectPath, { replace: true });
        showUniqueToast('success', TOAST_MESSAGES.REGISTER_SUCCESS, TOAST_IDS.REGISTER_SUCCESS);
        
      } catch (error) {
        handleAuthError(error, 'register');
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, handleAuthError]
  );

  const forgotPassword = useCallback(
    async (email: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FORGOT_PASSWORD}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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

  const resetPassword = useCallback(
    async (token: string, newPassword: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.RESET_PASSWORD}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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

  const updateProfile = useCallback(async (): Promise<void> => {
    await fetchUserData();
  }, [fetchUserData]);

  // ==================== EFFET D'INITIALISATION ====================
  useEffect(() => {
    console.log('[AuthProvider] Initialisation');
    checkAuth();

    return () => {
      console.log('[AuthProvider] Nettoyage');
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []); // Une seule fois au montage

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
    clearAuthToasts, // Exposer la fonction de nettoyage des toasts
    isAuthenticated: !!user && !!access_token,
    isLoading,
    error,
    maintenanceStatus,
    isMaintenanceMode: maintenanceStatus?.isActive === true,
  };

  // Nettoyer les toasts d'authentification lors du démontage
  useEffect(() => {
    return () => {
      clearAuthToasts();
    };
  }, [clearAuthToasts]);

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

// ==================== EXPORTS DES TYPES ====================
export type { User, AuthContextType, LogoutAllResponse };
export { UserRole };