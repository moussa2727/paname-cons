import React, { useState, useEffect, useRef } from "react";
import { FiMail, FiAlertCircle } from "react-icons/fi";
import { Lock as FiLock, Eye as FiEye, EyeOff as FiEyeOff } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Helmet } from "react-helmet-async";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { login, isLoading, isAuthenticated, user } = useAuth();

  const redirectProcessed = useRef(false);
  const messageShown = useRef(false);

  // ── Message depuis une redirection précédente (une seule fois) ──
  useEffect(() => {
    if (location.state?.message && !messageShown.current) {
      messageShown.current = true;
      // On importe toast ici pour éviter le double import inutilisé plus bas
      import("react-hot-toast").then(({ default: toast }) => {
        toast.success(location.state.message as string);
      });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // ── Redirection après authentification ──────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user || redirectProcessed.current) return;

    redirectProcessed.current = true;

    try {
      const value = `; ${document.cookie}`;
      const parts = value.split("; redirect_after_login=");
      const redirectPath =
        parts.length === 2
          ? decodeURIComponent(parts.pop()?.split(";").shift() ?? "")
          : "";

      if (redirectPath) {
        // Supprimer le cookie
        document.cookie =
          "redirect_after_login=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" +
          (import.meta.env.PROD
            ? "; secure; sameSite=none"
            : "; sameSite=none");
        navigate(redirectPath, { replace: true });
      } else {
        navigate(
          user.role === "ADMIN"
            ? "/gestionnaire/statistiques"
            : "/user/mon-profil",
          { replace: true },
        );
      }
    } catch {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // ── Masquer le formulaire si déjà authentifié ───────────────────
  if (isAuthenticated && user) return null;

  // ── Soumission ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isLoading) return;

    setLocalError("");

    if (!email || !password) {
      setLocalError("Veuillez remplir tous les champs");
      return;
    }
    if (password.length < 8) {
      setLocalError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    setIsSubmitting(true);
    try {
      // AuthContext.login gère déjà le toast de succès et d'erreur
      await login(email.trim().toLowerCase(), password, rememberMe);
      // La redirection est gérée par le useEffect ci-dessus
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur de connexion";
      // ✅ On affiche l'erreur uniquement dans l'UI, pas de toast ici
      // (AuthContext.login a déjà appelé toast.error)
      setLocalError(message);
      if (import.meta.env.DEV) {
        console.error("[Login] handleSubmit error:", err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isButtonDisabled = isSubmitting || isLoading;

  return (
    <>
      <Helmet>
        <title>Connexion - Paname Consulting</title>
        <meta
          name="description"
          content="Connectez-vous à votre compte Paname Consulting"
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      <div className="flex items-center justify-center p-4 min-h-screen">
        <div className="w-full max-w-md">
          <div className="bg-white rounded shadow-xl overflow-hidden">
            <div className="bg-linear-to-r from-sky-500 to-sky-600 p-6 text-center">
              <div className="flex items-center justify-center space-x-3">
                <div className="bg-white p-2 rounded-full">
                  <div className="w-10 h-10 rounded-full bg-linear-to-r from-sky-500 to-sky-600 flex items-center justify-center">
                    <FiLock className="text-white text-xl" />
                  </div>
                </div>
                <Link to="/" className="text-2xl font-bold text-white">
                  Connexion
                </Link>
              </div>
            </div>

            <div className="p-6">
              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Champ caché pour le remplissage automatique du navigateur */}
                <div className="sr-only" aria-hidden="true">
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    defaultValue={email}
                    readOnly
                    tabIndex={-1}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiMail className="text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setLocalError("");
                      }}
                      className="pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:border-sky-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="jean.dupont@email.com"
                      required
                      disabled={isButtonDisabled}
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Mot de passe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setLocalError("");
                      }}
                      className="pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:border-sky-500 pr-9 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="••••••••"
                      required
                      minLength={8}
                      disabled={isButtonDisabled}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={isButtonDisabled}
                      aria-label={
                        showPassword
                          ? "Cacher le mot de passe"
                          : "Afficher le mot de passe"
                      }
                    >
                      {showPassword ? (
                        <FiEyeOff className="text-gray-400 hover:text-gray-600 w-5 h-5" />
                      ) : (
                        <FiEye className="text-gray-400 hover:text-gray-600 w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Erreur locale */}
                {localError && (
                  <div className="p-3 text-red-600 text-sm bg-red-50 rounded-md border border-red-200 animate-fadeIn">
                    <div className="flex items-center">
                      <FiAlertCircle className="mr-2 shrink-0" />
                      <span>{localError}</span>
                    </div>
                  </div>
                )}

                {/* Se souvenir / Mot de passe oublié */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-sm text-gray-600">
                      Se souvenir de moi
                    </span>
                  </label>
                  <Link
                    to="/mot-de-passe-oublie"
                    className="text-sm text-sky-600 hover:text-sky-500 transition-colors hover:underline"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>

                {/* Bouton */}
                <button
                  type="submit"
                  disabled={isButtonDisabled}
                  className={`w-full py-2.5 px-4 rounded-md text-white font-medium transition-all duration-200 ${
                    isButtonDisabled
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-linear-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 hover:shadow-md active:scale-[0.98]"
                  }`}
                >
                  {isButtonDisabled ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Connexion en cours...
                    </span>
                  ) : (
                    "Se connecter"
                  )}
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Vous n'avez pas de compte ?{" "}
                    <Link
                      to="/inscription"
                      className="font-medium text-sky-600 hover:text-sky-500 transition-colors hover:underline"
                    >
                      S'inscrire
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
