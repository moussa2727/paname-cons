/* ============================================================
 * AuthContext.tsx
 * ------------------------------------------------------------
 * Séparation STRICTE :
 *   - BackendDTO_*   → forme exacte renvoyée par le backend
 *   - App*           → état exploité côté frontend
 *
 * Cookies httpOnly (access_token, refresh_token) : gérés par
 * le navigateur via credentials: "include" — jamais lisibles
 * en JS/TS car httpOnly. On ne tente JAMAIS de les lire via
 * document.cookie.
 *
 * Cookie frontend : remember_me uniquement (non-httpOnly),
 * géré via document.cookie (API JS native, pas de lib tierce).
 * C'est un signal OPTIONNEL indiquant qu'une session a déjà
 * été ouverte sur ce navigateur.
 *
 * checkAuth NE conditionne PLUS sur remember_me :
 *   → on tente toujours GET /user/profile au montage.
 *   → apiFetch gère le retry 401 → refresh → replay en interne.
 *   → si le refresh échoue, session morte → setUser(null).
 *   → remember_me est supprimé uniquement quand la session est
 *     définitivement morte côté backend (refresh échoué).
 *
 * Raison du changement : sur mobile (Safari ITP, WebView,
 * mode privé), remember_me peut être absent même si une
 * session valide existe côté backend (cookie httpOnly intact).
 * Bloquer checkAuth sur remember_me causait une déconnexion
 * silencieuse à chaque refresh de page sur mobile.
 *
 * Durées alignées sur auth.constants.ts (backend) :
 *   • access_token          : 15 min  (ACCESS_TOKEN_EXPIRATION_MS)
 *   • refresh_token normal  :  7 jours (REFRESH_TOKEN_EXPIRATION_MS)
 *   • refresh_token remember: 14 jours (REMEMBER_ME_EXPIRATION_MS)
 *   • session max absolue   : 30 jours (SESSION_MAX_DURATION_MS)
 *     → géré exclusivement côté backend (rotateToken +
 *       cleanupInactiveSessions), transparent pour le frontend
 *
 * remember_me expire :
 *   • naturellement (max-age 7 ou 14 jours)
 *   • quand checkAuth/refreshToken confirme que la session est
 *     définitivement morte côté backend (refresh échoué)
 * Il NE doit PAS être supprimé au logout : l'utilisateur peut
 * vouloir se reconnecter et le cookie httpOnly refresh_token
 * n'est pas encore forcément expiré.
 *
 * refreshTokenRef : stocke le refresh_token reçu dans le body
 * du login / refresh pour le passer dans le body du
 * /auth/refresh en fallback si le cookie httpOnly est bloqué
 * (dev HTTP / Safari ITP).
 *
 * apiFetch : singleton de retry 401 → refresh → replay.
 * Le refresh est TOUJOURS tenté sur un 401 — on ne conditionne
 * jamais sur la lisibilité d'un cookie httpOnly.
 *
 * Réponse de /auth/refresh (backend) :
 *   { message: string, data: { refresh_token: string } }
 * Le nouveau refresh_token est extrait via body.data.refresh_token
 * pour mettre à jour le fallback mémoire (_refreshTokenValue).
 * ============================================================ */

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { toast } from "react-hot-toast";
import type {
  AppUser,
  AuthContextType,
  BackendDTO_ApiResponse,
  BackendDTO_LoginData,
  BackendDTO_RegisterData,
  BackendDTO_ProfileData,
  BackendDTO_LogoutAllData,
  BackendDTO_ForgotPasswordData,
  BackendDTO_ResetPasswordData,
  BackendDTO_ChangePasswordData,
} from "../types/auth.types";

const API_URL = import.meta.env.VITE_API_URL as string;

export { API_URL };

// ─────────────────────────────────────────────────────────────
// § 1 — Durées alignées sur auth.constants.ts (backend)
//        Utilisées uniquement pour le cookie remember_me
//        (non-httpOnly, seul cookie gérable côté JS/TS).
//
//  access_token et refresh_token sont httpOnly → leur durée
//  est gérée exclusivement par le backend via res.cookie().
//  On ne pose NI n'expire ces cookies côté frontend.
// ─────────────────────────────────────────────────────────────

const REMEMBER_ME_MAX_AGE_S = 14 * 24 * 60 * 60; // 14 jours
const SESSION_NORMAL_MAX_AGE_S = 7 * 24 * 60 * 60; //  7 jours
const ACCESS_TOKEN_EXPIRES_IN_S = 15 * 60; // 15 min (= expires_in backend)

// ─────────────────────────────────────────────────────────────
// § 2 — COOKIE remember_me  (non-httpOnly — seul cookie lisible
//        en JS/TS)
//
//  IMPORTANT : access_token et refresh_token sont httpOnly →
//  JAMAIS présents dans document.cookie côté JS/TS.
//  Ne jamais écrire de condition basée sur leur présence.
//
//  FIX MOBILE : remember_me est un signal OPTIONNEL. checkAuth
//  ne bloque plus dessus. Sur Safari/iOS/WebView, ce cookie
//  peut être absent alors que le refresh_token httpOnly est
//  encore valide.
// ─────────────────────────────────────────────────────────────

function getRememberMeCookie(): boolean {
  // On vérifie uniquement la PRÉSENCE du cookie, pas sa valeur.
  // Sa présence signifie qu'une session a déjà été ouverte sur
  // ce navigateur. Il expire naturellement (7 ou 14 jours selon
  // que remember_me a été coché ou non au login).
  return document.cookie
    .split("; ")
    .some((row) => row.startsWith("remember_me="));
}

function setRememberMeCookie(value: boolean, maxAgeSeconds: number): void {
  // sameSite=none + Secure pour correspondre aux cookies httpOnly du backend
  const isProduction = import.meta.env.PROD;
  document.cookie =
    `${encodeURIComponent("remember_me")}=${encodeURIComponent(String(value))}` +
    `; path=/` +
    `; max-age=${maxAgeSeconds}` +
    `; sameSite=none` +
    (isProduction ? `; Secure` : ``);
}

function deleteRememberMeCookie(): void {
  // FIX : les attributs sameSite=none et Secure doivent correspondre
  // exactement à ceux utilisés lors de la pose du cookie.
  // Sans eux, certains navigateurs (Safari mobile, Chrome Android)
  // ne reconnaissent pas le cookie à supprimer et l'ignorent silencieusement,
  // laissant un cookie "zombie" qui bloque la logique de checkAuth.
  const isProduction = import.meta.env.PROD;
  document.cookie =
    `${encodeURIComponent("remember_me")}=` +
    `; path=/` +
    `; max-age=0` +
    `; sameSite=none` +
    (isProduction ? `; Secure` : ``);
}

// ─────────────────────────────────────────────────────────────
// § 3 — MAPPERS  DTO → AppUser
// ─────────────────────────────────────────────────────────────

function mapLoginUserToAppUser(dto: BackendDTO_LoginData["user"]): AppUser {
  return {
    id: dto.id,
    email: dto.email,
    firstName: dto.firstName,
    lastName: dto.lastName,
    fullName: dto.fullName,
    telephone: dto.telephone,
    role: dto.role,
    isActive: dto.isActive,
    canLogin: dto.canLogin,
    isTemporarilyLoggedOut: dto.isTemporarilyLoggedOut,
    logoutUntil: dto.logoutUntil,
    lastLogout: null, // non fourni par /auth/login
    lastLogin: dto.lastLogin,
    loginCount: dto.loginCount,
    logoutCount: 0, // non fourni par /auth/login
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

function mapProfileToAppUser(dto: BackendDTO_ProfileData): AppUser {
  return {
    id: dto.id,
    email: dto.email,
    firstName: dto.firstName,
    lastName: dto.lastName,
    fullName: dto.fullName,
    telephone: dto.telephone,
    role: dto.role,
    isActive: dto.isActive,
    canLogin: dto.canLogin,
    isTemporarilyLoggedOut: dto.isTemporarilyLoggedOut,
    logoutUntil: dto.logoutUntil,
    lastLogout: dto.lastLogout,
    lastLogin: dto.lastLogin,
    loginCount: dto.loginCount,
    logoutCount: dto.logoutCount,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

// ─────────────────────────────────────────────────────────────
// § 4 — apiFetch : requête HTTP + retry automatique sur 401
//
//  Stratégie :
//    1. Exécute la requête avec credentials: "include"
//       (les cookies httpOnly partent automatiquement).
//    2. Si la réponse n'est pas 401 → retourne directement.
//    3. Sur 401 → tente POST /auth/refresh :
//         - le cookie httpOnly refresh_token est envoyé auto
//           par le navigateur (credentials: "include")
//         - _refreshTokenValue est passé dans le body en
//           fallback (Safari ITP, dev HTTP sans cookie)
//    4. Si le refresh réussit → rejoue la requête originale.
//    5. Si le refresh échoue  → propage le 401 original.
//
//  Réponse /auth/refresh : { message, data: { refresh_token } }
//  On extrait body.data.refresh_token pour le fallback mémoire.
//
//  On ne conditionne JAMAIS le retry sur la présence d'un
//  cookie httpOnly (illisible en JS/TS).
// ─────────────────────────────────────────────────────────────

let _isRefreshing = false;
let _refreshQueue: Array<(success: boolean) => void> = [];

// Valeur du refresh_token reçu dans le body (fallback cookie httpOnly bloqué)
let _refreshTokenValue: string | null = null;

// CRITICAL FOR MOBILE: Helper pour localStorage fallback
function getLocalStorageToken(): {
  access_token: string | null;
  refresh_token: string | null;
} {
  const accessExpiresAt = localStorage.getItem("access_token_expires_at");
  const refreshExpiresAt = localStorage.getItem("refresh_token_expires_at");
  const now = Date.now();

  // Vérifier les expirations
  if (accessExpiresAt && now > parseInt(accessExpiresAt)) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("access_token_expires_at");
  }

  if (refreshExpiresAt && now > parseInt(refreshExpiresAt)) {
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("refresh_token_expires_at");
  }

  return {
    access_token: localStorage.getItem("access_token"),
    refresh_token: localStorage.getItem("refresh_token"),
  };
}

export function _setRefreshTokenValue(token: string | null): void {
  _refreshTokenValue = token;
}

function enqueueRefreshCallback(cb: (success: boolean) => void): void {
  _refreshQueue.push(cb);
}

function flushRefreshQueue(success: boolean): void {
  _refreshQueue.forEach((cb) => cb(success));
  _refreshQueue = [];
}

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const options: RequestInit = {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  };

  // CRITICAL FOR MOBILE: Add Authorization header from localStorage fallback
  const localStorageTokens = getLocalStorageToken();
  if (localStorageTokens.access_token) {
    const headers = new Headers(options.headers);
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${localStorageTokens.access_token}`);
    }
    options.headers = headers;
  }

  const response = await fetch(input, options);

  // Pas un 401 → retour direct, rien à faire
  if (response.status !== 401) return response;

  // ── 401 reçu ─────────────────────────────────────────────
  // On tente TOUJOURS le refresh : le cookie httpOnly
  // refresh_token sera envoyé automatiquement par le navigateur
  // via credentials: "include". On ne teste pas sa présence
  // (httpOnly = illisible en JS/TS).
  // _refreshTokenValue est un fallback pour les cas où le cookie
  // est bloqué (Safari ITP, HTTP en dev).

  if (_isRefreshing) {
    // Un refresh est déjà en cours → on met la requête en file
    return new Promise<Response>((resolve) => {
      enqueueRefreshCallback((success) => {
        resolve(success ? fetch(input, options) : response);
      });
    });
  }

  _isRefreshing = true;

  try {
    // CRITICAL FOR MOBILE: Get localStorage tokens for fallback
    const localStorageTokens = getLocalStorageToken();

    const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include", // envoie le cookie httpOnly refresh_token
      headers: { "Content-Type": "application/json" },
      // refresh_token dans le body = fallback si le cookie httpOnly
      // n'est pas transmis (dev HTTP, Safari ITP)
      body: JSON.stringify(
        _refreshTokenValue || localStorageTokens.refresh_token
          ? {
              refresh_token:
                _refreshTokenValue || localStorageTokens.refresh_token,
            }
          : {},
      ),
    });

    if (!refreshRes.ok) throw new Error("refresh_failed");

    // Réponse backend : { message: string, data: { refresh_token: string } }
    // On extrait le nouveau refresh_token pour mettre à jour le fallback mémoire
    try {
      const refreshBody = (await refreshRes.clone().json()) as {
        data?: { refresh_token?: string };
      };
      const newToken = refreshBody?.data?.refresh_token;
      if (newToken) {
        _refreshTokenValue = newToken;
      }
    } catch {
      // Non bloquant — le cookie httpOnly reste la source principale
    }

    _isRefreshing = false;
    flushRefreshQueue(true);

    // Rejouer la requête originale avec les nouveaux cookies
    return fetch(input, options);
  } catch {
    _isRefreshing = false;
    flushRefreshQueue(false);
    return response; // propage le 401 original
  }
}

// ─────────────────────────────────────────────────────────────
// § 5 — AuthContext
// ─────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

// ─────────────────────────────────────────────────────────────
// § 6 — AuthProvider
// ─────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRef = useRef<((expiresInSeconds?: number) => void) | null>(
    null,
  );
  // Stocke le refresh_token reçu dans le body du login/refresh.
  // Fallback pour apiFetch quand le cookie httpOnly est bloqué.
  const refreshTokenRef = useRef<string | null>(null);

  // ── clearRefreshTimer ─────────────────────────────────────
  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // ── refreshToken ──────────────────────────────────────────
  const refreshToken = useCallback(async (): Promise<void> => {
    if (_isRefreshing) {
      return new Promise<void>((resolve, reject) => {
        enqueueRefreshCallback((success) => {
          if (!success) reject(new Error("refresh_failed"));
          else resolve();
        });
      });
    }

    _isRefreshing = true;

    try {
      // CRITICAL FOR MOBILE: Get localStorage tokens for fallback
      const localStorageTokens = getLocalStorageToken();

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          refreshTokenRef.current || localStorageTokens.refresh_token
            ? {
                refresh_token:
                  refreshTokenRef.current || localStorageTokens.refresh_token,
              }
            : {},
        ),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message || "refresh_failed");
      }

      // Réponse backend : { message: string, data: { refresh_token: string } }
      try {
        const body = (await response.clone().json()) as {
          data?: { refresh_token?: string };
        };
        const newToken = body?.data?.refresh_token;
        if (newToken) {
          refreshTokenRef.current = newToken;
          _refreshTokenValue = newToken;

          // CRITICAL FOR MOBILE: Update localStorage with new tokens
          // Note: access_token sera mis à jour via les cookies httpOnly,
          // mais on le récupère aussi pour localStorage fallback
          localStorage.setItem("refresh_token", newToken);

          // Mettre à jour l'expiration du refresh_token (14 ou 7 jours selon remember_me)
          const rememberMe = getRememberMeCookie();
          const refreshExpiresIn = rememberMe
            ? 14 * 24 * 60 * 60
            : 7 * 24 * 60 * 60;
          localStorage.setItem(
            "refresh_token_expires_at",
            String(Date.now() + refreshExpiresIn * 1000),
          );
        }
      } catch {
        // Non bloquant
      }

      _isRefreshing = false;
      flushRefreshQueue(true);

      // Récupérer le profil après refresh réussi
      const profileResponse = await apiFetch(`${API_URL}/user/profile`, {
        method: "GET",
      });

      if (profileResponse.ok) {
        const profileBody: BackendDTO_ApiResponse<BackendDTO_ProfileData> =
          await profileResponse.json();
        setUser(mapProfileToAppUser(profileBody.data));
      }

      if (scheduleRef.current) scheduleRef.current(ACCESS_TOKEN_EXPIRES_IN_S);
    } catch (err) {
      _isRefreshing = false;
      flushRefreshQueue(false);
      refreshTokenRef.current = null;
      _refreshTokenValue = null;

      // CRITICAL FOR MOBILE: Clear localStorage fallback
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("access_token_expires_at");
      localStorage.removeItem("refresh_token_expires_at");

      // Le refresh a échoué définitivement → session morte côté backend.
      // On supprime remember_me pour éviter des requêtes inutiles ultérieures.
      deleteRememberMeCookie();
      setUser(null);
      throw err;
    }
  }, []);

  // ── scheduleTokenRefresh ──────────────────────────────────
  // expires_in est TOUJOURS 900 (ACCESS_TOKEN_EXPIRATION_MS côté
  // backend) — jamais conditionnel. On se déclenche 60s avant
  // l'expiration pour éviter tout flash de déconnexion.
  const scheduleTokenRefresh = useCallback(
    (expiresInSeconds: number = ACCESS_TOKEN_EXPIRES_IN_S): void => {
      clearRefreshTimer();
      const delayMs = Math.max((expiresInSeconds - 60) * 1000, 0);
      refreshTimerRef.current = setTimeout(() => {
        refreshToken().catch(() => {
          // Silencieux — la prochaine requête déclenchera un 401 → retry
        });
      }, delayMs);
    },
    [clearRefreshTimer, refreshToken],
  );

  useEffect(() => {
    scheduleRef.current = scheduleTokenRefresh;
  }, [scheduleTokenRefresh]);

  // ── checkAuth (mount) ─────────────────────────────────────
  //
  //  FIX MOBILE : on ne conditionne PLUS sur remember_me.
  //
  //  Ancien comportement (cassé sur mobile) :
  //    • remember_me absent → setUser(null) immédiat, zéro requête.
  //    • Problème : sur Safari iOS / WebView / mode privé, remember_me
  //      peut être absent même si le cookie httpOnly refresh_token
  //      est encore valide → déconnexion silencieuse à chaque refresh.
  //
  //  Nouveau comportement :
  //    • On tente TOUJOURS GET /user/profile au montage.
  //    • apiFetch gère le retry 401 → refresh → replay en interne.
  //    • 200 : session valide → setUser().
  //    • 401 après refresh échoué : session morte → setUser(null)
  //      + deleteRememberMeCookie().
  //    • Coût : une requête réseau supplémentaire sur les navigateurs
  //      sans session active — négligeable face à la fiabilité gagnée.
  //
  //  Les cookies httpOnly (access_token, refresh_token) sont
  //  illisibles en JS/TS — on ne conditionne JAMAIS sur eux.
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const checkAuth = async (): Promise<void> => {
      // FIX : guard remember_me supprimé — voir commentaire ci-dessus.
      // On tente toujours le profil ; apiFetch gère le 401 → refresh.
      try {
        // apiFetch gère le retry 401 → refresh → replay en interne
        const response = await apiFetch(`${API_URL}/user/profile`, {
          method: "GET",
        });

        if (cancelled) return;

        if (!response.ok) {
          // 401 après tentative de refresh = session définitivement
          // expirée — on nettoie le cookie frontend
          setUser(null);
          deleteRememberMeCookie();
          return;
        }

        const body: BackendDTO_ApiResponse<BackendDTO_ProfileData> =
          await response.json();

        setUser(mapProfileToAppUser(body.data));
        if (scheduleRef.current) scheduleRef.current(ACCESS_TOKEN_EXPIRES_IN_S);
      } catch {
        if (!cancelled) {
          setUser(null);
          deleteRememberMeCookie();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
      clearRefreshTimer();
    };
  }, [clearRefreshTimer]);

  // ── login ─────────────────────────────────────────────────
  const login = async (
    email: string,
    password: string,
    rememberMe = false,
  ): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember_me: rememberMe }),
      });

      const body: BackendDTO_ApiResponse<BackendDTO_LoginData> =
        await response.json();

      if (!response.ok) {
        const msg = body.message || "Email ou mot de passe incorrect";
        toast.error(msg);
        throw new Error(msg);
      }

      const dto = body.data;

      // Cookie remember_me (non-httpOnly, lisible en JS/TS)
      // Durées alignées sur REMEMBER_ME_EXPIRATION_MS /
      // REFRESH_TOKEN_EXPIRATION_MS du backend (auth.constants.ts).
      //
      // Règle no-overwrite : on n'écrase JAMAIS un remember_me=true
      // déjà présent. Si une session longue existait et que l'utilisateur
      // se reconnecte sans cocher la case, on conserve la durée longue.
      const existingRememberMe = getRememberMeCookie();
      const effectiveRememberMe = existingRememberMe
        ? dto.remember_me || true // session existante → on garde au moins true
        : dto.remember_me; // pas encore posé → valeur du login

      // Stocker le refresh_token en mémoire pour le fallback apiFetch
      if (dto.refresh_token) {
        refreshTokenRef.current = dto.refresh_token;
        _refreshTokenValue = dto.refresh_token;

        // CRITICAL FOR MOBILE: Store tokens in localStorage
        // Pour Safari ITP et WebView qui bloquent les cookies httpOnly
        localStorage.setItem("refresh_token", dto.refresh_token);
        localStorage.setItem("access_token", dto.access_token);

        // Set expiration times
        const expiresIn = dto.expires_in || 900; // 15 minutes
        localStorage.setItem(
          "access_token_expires_at",
          String(Date.now() + expiresIn * 1000),
        );

        const refreshExpiresIn = effectiveRememberMe
          ? 14 * 24 * 60 * 60
          : 7 * 24 * 60 * 60;
        localStorage.setItem(
          "refresh_token_expires_at",
          String(Date.now() + refreshExpiresIn * 1000),
        );
      }

      setRememberMeCookie(
        effectiveRememberMe,
        effectiveRememberMe
          ? REMEMBER_ME_MAX_AGE_S // 14 jours (REMEMBER_ME_EXPIRATION_MS)
          : SESSION_NORMAL_MAX_AGE_S, //  7 jours (REFRESH_TOKEN_EXPIRATION_MS)
      );

      setUser(mapLoginUserToAppUser(dto.user));

      // dto.expires_in = 900 (ACCESS_TOKEN_EXPIRATION_MS/1000) — toujours 900
      scheduleRef.current?.(dto.expires_in ?? ACCESS_TOKEN_EXPIRES_IN_S);

      toast.success("Connexion réussie !");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur lors de la connexion";
      toast.error(message);
      throw error;
    }
  };

  // ── register ──────────────────────────────────────────────
  // Le backend ne pose PAS de cookie ici → pas de state user.
  const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    telephone: string;
  }): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const body: BackendDTO_ApiResponse<BackendDTO_RegisterData> =
        await response.json();

      if (!response.ok) {
        const msg = body.message || "Erreur lors de l'inscription";
        toast.error(msg);
        throw new Error(msg);
      }

      toast.success(body.data.message);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur lors de l'inscription";
      toast.error(message);
      throw error;
    }
  };

  // ── logout ────────────────────────────────────────────────
  // On NE supprime PAS remember_me ici : il doit survivre au
  // logout pour que checkAuth sache qu'une session a existé sur
  // ce navigateur et tente le backend au prochain chargement.
  // remember_me expire uniquement :
  //   • naturellement (max-age 7 ou 14 jours)
  //   • quand checkAuth confirme que la session est définitivement
  //     morte côté backend (refresh échoué)
  const logout = async (): Promise<void> => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      // Erreur réseau non bloquante — on nettoie quand même le state
    } finally {
      clearRefreshTimer();
      refreshTokenRef.current = null;
      _refreshTokenValue = null;

      // CRITICAL FOR MOBILE: Clear localStorage fallback
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("access_token_expires_at");
      localStorage.removeItem("refresh_token_expires_at");

      setUser(null);
      toast.success("Déconnexion réussie");
    }
  };

  // ── updateUser ────────────────────────────────────────────
  const updateUser = async (patch: {
    firstName?: string;
    lastName?: string;
    email?: string;
    telephone?: string;
    password?: string;
  }): Promise<void> => {
    try {
      // Construire le body avec les champs à mettre à jour
      const updateBody: Record<string, string> = {};

      if (patch.firstName !== undefined) updateBody.firstName = patch.firstName;
      if (patch.lastName !== undefined) updateBody.lastName = patch.lastName;
      if (patch.email !== undefined) updateBody.email = patch.email;
      if (patch.telephone !== undefined) updateBody.telephone = patch.telephone;
      if (patch.password !== undefined) updateBody.password = patch.password;

      // Appel direct à l'API avec apiFetch (gère le refresh automatique)
      const response = await apiFetch(`${API_URL}/user/profile`, {
        method: "PATCH",
        body: JSON.stringify(updateBody),
      });

      const body: BackendDTO_ApiResponse<BackendDTO_ProfileData> =
        await response.json();

      if (!response.ok) {
        let message = body.message || "Erreur lors de la mise à jour du profil";

        // Gérer les erreurs spécifiques
        if (
          body.message?.includes("Un utilisateur avec cet email existe déjà")
        ) {
          message = "Cet email est déjà utilisé par un autre utilisateur";
        } else if (
          body.message?.includes(
            "Un utilisateur avec ce numéro de téléphone existe déjà",
          )
        ) {
          message =
            "Ce numéro de téléphone est déjà utilisé par un autre utilisateur";
        }

        toast.error(message);
        throw new Error(message);
      }

      // Mettre à jour l'utilisateur dans le state
      setUser(mapProfileToAppUser(body.data));
      toast.success("Profil mis à jour avec succès");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erreur lors de la mise à jour du profil";
      toast.error(message);
      throw error;
    }
  };

  // ── logoutAll (ADMIN) ─────────────────────────────────────
  const logoutAll = async (): Promise<void> => {
    try {
      const response = await apiFetch(`${API_URL}/admin/auth/logout-all`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      const body: BackendDTO_ApiResponse<BackendDTO_LogoutAllData> =
        await response.json();

      if (!response.ok) {
        const msg = body.message || "Erreur déconnexion globale";
        toast.error(msg);
        throw new Error(msg);
      }

      toast.success(
        `${body.data.sessionsTerminated} session(s) terminée(s) (admin épargné)`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erreur lors de la déconnexion globale";
      toast.error(message);
      throw error;
    }
  };

  // ── forgotPassword ────────────────────────────────────────
  const forgotPassword = async (email: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const body: BackendDTO_ApiResponse<BackendDTO_ForgotPasswordData> =
        await response.json();

      if (!response.ok) {
        const msg =
          body.message || "Erreur lors de la demande de réinitialisation";
        toast.error(msg);
        throw new Error(msg);
      }

      toast.success(body.data.message);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erreur lors de la demande de réinitialisation";
      toast.error(message);
      throw error;
    }
  };

  // ── resetPassword ─────────────────────────────────────────
  const resetPassword = async (
    token: string,
    newPassword: string,
  ): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      const body: BackendDTO_ApiResponse<BackendDTO_ResetPasswordData> =
        await response.json();

      if (!response.ok) {
        const msg = body.message || "Token invalide ou expiré";
        toast.error(msg);
        throw new Error(msg);
      }

      toast.success(body.data.message);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erreur lors de la réinitialisation";
      toast.error(message);
      throw error;
    }
  };

  // ── changePassword ────────────────────────────────────────
  const changePassword = async (
    oldPassword: string,
    newPassword: string,
  ): Promise<void> => {
    try {
      const response = await apiFetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      const body: BackendDTO_ApiResponse<BackendDTO_ChangePasswordData> =
        await response.json();

      if (!response.ok) {
        const msg = body.message || "Ancien mot de passe incorrect";
        toast.error(msg);
        throw new Error(msg);
      }

      toast.success("Mot de passe modifié avec succès");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erreur lors de la modification du mot de passe";
      toast.error(message);
      throw error;
    }
  };

  // ── getActiveSessions ───────────────────────────────
  const getActiveSessions = async (): Promise<number> => {
    try {
      const response = await apiFetch(`${API_URL}/admin/auth/sessions`, {
        method: "GET",
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(
          body.message || "Impossible de récupérer les sessions actives",
        );
      }

      const body = (await response.json()) as {
        data: { activeSessions: number };
      };
      return body.data.activeSessions;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erreur lors de la récupération des sessions actives";
      toast.error(message);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    isAdmin: user?.role === "ADMIN",
    login,
    register,
    logout,
    updateUser,
    logoutAll,
    refreshToken,
    forgotPassword,
    resetPassword,
    changePassword,
    getActiveSessions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
