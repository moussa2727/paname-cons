import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  FiEye,
  FiEyeOff,
  FiLock,
  FiCheckCircle,
  FiXCircle,
  FiArrowLeft,
} from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { Helmet } from "react-helmet-async";

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword, isLoading } = useAuth();

  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState({
    newPassword: false,
    confirmPassword: false,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  /**
   * Calcul en direct des critères de validation.
   * ✅ Aligné sur la regex backend (UpdateUserDto / CreateUserDto) :
   *    majuscule + minuscule + chiffre + caractère spécial (@$!%*?&)
   */
  const passwordStrength = {
    hasMinLength: formData.newPassword.length >= 8,
    hasUpperCase: /[A-Z]/.test(formData.newPassword),
    hasLowerCase: /[a-z]/.test(formData.newPassword),
    hasNumber: /\d/.test(formData.newPassword),
    hasSpecialChar: /[@$!%*?&]/.test(formData.newPassword),
  };

  const isPasswordValid =
    passwordStrength.hasMinLength &&
    passwordStrength.hasUpperCase &&
    passwordStrength.hasLowerCase &&
    passwordStrength.hasNumber &&
    passwordStrength.hasSpecialChar;

  const doPasswordsMatch = formData.newPassword === formData.confirmPassword;
  const canSubmit =
    isPasswordValid &&
    doPasswordsMatch &&
    formData.newPassword.length > 0 &&
    !isLoading;

  const togglePasswordVisibility = (field: keyof typeof showPassword) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!token) {
      setError(
        "Token invalide ou manquant. Vérifiez le lien dans votre email.",
      );
      return;
    }

    if (!isPasswordValid) {
      setError("Le mot de passe ne respecte pas tous les critères de sécurité");
      return;
    }

    if (!doPasswordsMatch) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    try {
      // La méthode resetPassword gère déjà les toasts (succès et erreur)
      await resetPassword(token, formData.newPassword);
      setSuccess(true);

      // Redirection après 3 secondes
      setTimeout(() => {
        navigate("/connexion", {
          state: {
            message: "Votre mot de passe a été réinitialisé avec succès !",
          },
        });
      }, 3000);
    } catch (err) {
      // AuthContext a déjà affiché un toast.error
      // On affiche l'erreur dans l'UI pour plus de détails
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Erreur lors de la réinitialisation";
      setError(errorMessage);

      if (import.meta.env.DEV) {
        console.error("[ResetPassword] handleSubmit error:", err);
      }
    }
  };

  // Affichage si token manquant
  if (!token && !success) {
    return (
      <>
        <Helmet>
          <title>Lien invalide - Paname Consulting</title>
          <meta
            name="description"
            content="Lien de réinitialisation invalide ou expiré"
          />
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>

        <div className="flex items-center justify-center p-4 min-h-screen">
          <div className="w-full max-w-md">
            <div className="bg-white rounded shadow-xl overflow-hidden">
              <div className="bg-linear-to-r from-sky-500 to-sky-600 p-6 text-center">
                <Link
                  to="/"
                  className="flex items-center justify-center space-x-3"
                >
                  <div className="bg-white p-2 rounded-full">
                    <div className="w-10 h-10 rounded-full bg-linear-to-r from-sky-500 to-sky-600 flex items-center justify-center">
                      <FiLock className="text-white text-xl" />
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-white">
                    Lien invalide
                  </span>
                </Link>
              </div>

              <div className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <FiXCircle className="text-red-500 text-3xl" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Lien de réinitialisation invalide
                </h3>
                <p className="text-gray-600 mb-6">
                  Le lien que vous avez utilisé est invalide ou a expiré.
                  Veuillez refaire une demande de réinitialisation.
                </p>
                <Link
                  to="/mot-de-passe-oublie"
                  className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-md text-white font-medium bg-linear-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 transition-all duration-200"
                >
                  Demander un nouveau lien
                </Link>
                <div className="mt-4">
                  <Link
                    to="/connexion"
                    className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-sky-600 transition-colors"
                  >
                    <FiArrowLeft className="text-sm" />
                    Retour à la connexion
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Réinitialiser votre mot de passe - Paname Consulting</title>
        <meta
          name="description"
          content="Réinitialisez votre mot de passe Paname Consulting"
        />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="flex items-center justify-center p-4 min-h-screen">
        <div className="w-full max-w-md">
          <div className="bg-white rounded shadow-xl overflow-hidden">
            {/* Header avec la même structure que Login */}
            <div className="bg-linear-to-r from-sky-500 to-sky-600 p-6 text-center">
              <Link
                to="/"
                className="flex items-center justify-center space-x-3"
              >
                <div className="bg-white p-2 rounded-full">
                  <div className="w-10 h-10 rounded-full bg-linear-to-r from-sky-500 to-sky-600 flex items-center justify-center">
                    <FiLock className="text-white text-xl" />
                  </div>
                </div>
                <span className="text-2xl font-bold text-white">
                  Nouveau mot de passe
                </span>
              </Link>
              <p className="text-sky-100 mt-2 text-sm">
                Choisissez un mot de passe sécurisé
              </p>
            </div>

            <div className="p-6">
              {success ? (
                // Message de succès
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <FiCheckCircle className="text-green-500 text-3xl" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Mot de passe réinitialisé !
                  </h3>
                  <p className="text-gray-600">
                    Votre mot de passe a été modifié avec succès.
                  </p>
                  <p className="text-sm text-gray-500">
                    Redirection vers la page de connexion dans quelques
                    secondes...
                  </p>
                  <Link
                    to="/connexion"
                    className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-500 transition-colors"
                  >
                    <FiArrowLeft className="text-sm" />
                    Retour à la connexion
                  </Link>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  {/* Token caché */}
                  {token && <input type="hidden" name="token" value={token} />}

                  {/* Nouveau mot de passe */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nouveau mot de passe *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiLock className="text-gray-400" />
                      </div>
                      <input
                        type={showPassword.newPassword ? "text" : "password"}
                        value={formData.newPassword}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            newPassword: e.target.value,
                          });
                          setError("");
                        }}
                        className="pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:border-sky-500 pr-9 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="••••••••"
                        required
                        disabled={isLoading}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => togglePasswordVisibility("newPassword")}
                        disabled={isLoading}
                        aria-label={
                          showPassword.newPassword
                            ? "Cacher le mot de passe"
                            : "Afficher le mot de passe"
                        }
                      >
                        {showPassword.newPassword ? (
                          <FiEyeOff className="text-gray-400 hover:text-gray-600 w-5 h-5" />
                        ) : (
                          <FiEye className="text-gray-400 hover:text-gray-600 w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirmation du mot de passe */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmer le mot de passe *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiLock className="text-gray-400" />
                      </div>
                      <input
                        type={
                          showPassword.confirmPassword ? "text" : "password"
                        }
                        value={formData.confirmPassword}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            confirmPassword: e.target.value,
                          });
                          setError("");
                        }}
                        className="pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:border-sky-500 pr-9 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="••••••••"
                        required
                        disabled={isLoading}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() =>
                          togglePasswordVisibility("confirmPassword")
                        }
                        disabled={isLoading}
                        aria-label={
                          showPassword.confirmPassword
                            ? "Cacher le mot de passe"
                            : "Afficher le mot de passe"
                        }
                      >
                        {showPassword.confirmPassword ? (
                          <FiEyeOff className="text-gray-400 hover:text-gray-600 w-5 h-5" />
                        ) : (
                          <FiEye className="text-gray-400 hover:text-gray-600 w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Indicateur de force du mot de passe */}
                  {formData.newPassword.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-medium">
                        Critères de sécurité :
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span
                          className={`flex items-center gap-1 px-2 py-1 rounded ${
                            passwordStrength.hasMinLength
                              ? "text-green-600 bg-green-50"
                              : "text-gray-400 bg-gray-50"
                          }`}
                        >
                          {passwordStrength.hasMinLength ? (
                            <FiCheckCircle className="text-green-500 text-xs" />
                          ) : (
                            <FiXCircle className="text-gray-400 text-xs" />
                          )}
                          8 caractères
                        </span>
                        <span
                          className={`flex items-center gap-1 px-2 py-1 rounded ${
                            passwordStrength.hasUpperCase
                              ? "text-green-600 bg-green-50"
                              : "text-gray-400 bg-gray-50"
                          }`}
                        >
                          {passwordStrength.hasUpperCase ? (
                            <FiCheckCircle className="text-green-500 text-xs" />
                          ) : (
                            <FiXCircle className="text-gray-400 text-xs" />
                          )}
                          Majuscule
                        </span>
                        <span
                          className={`flex items-center gap-1 px-2 py-1 rounded ${
                            passwordStrength.hasLowerCase
                              ? "text-green-600 bg-green-50"
                              : "text-gray-400 bg-gray-50"
                          }`}
                        >
                          {passwordStrength.hasLowerCase ? (
                            <FiCheckCircle className="text-green-500 text-xs" />
                          ) : (
                            <FiXCircle className="text-gray-400 text-xs" />
                          )}
                          Minuscule
                        </span>
                        <span
                          className={`flex items-center gap-1 px-2 py-1 rounded ${
                            passwordStrength.hasNumber
                              ? "text-green-600 bg-green-50"
                              : "text-gray-400 bg-gray-50"
                          }`}
                        >
                          {passwordStrength.hasNumber ? (
                            <FiCheckCircle className="text-green-500 text-xs" />
                          ) : (
                            <FiXCircle className="text-gray-400 text-xs" />
                          )}
                          Chiffre
                        </span>
                        <span
                          className={`flex items-center gap-1 px-2 py-1 rounded ${
                            passwordStrength.hasSpecialChar
                              ? "text-green-600 bg-green-50"
                              : "text-gray-400 bg-gray-50"
                          }`}
                        >
                          {passwordStrength.hasSpecialChar ? (
                            <FiCheckCircle className="text-green-500 text-xs" />
                          ) : (
                            <FiXCircle className="text-gray-400 text-xs" />
                          )}
                          @$!%*?&
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Vérification de correspondance des mots de passe */}
                  {formData.confirmPassword.length > 0 && !doPasswordsMatch && (
                    <div className="p-3 text-amber-600 text-sm bg-amber-50 rounded-md border border-amber-200">
                      <div className="flex items-center">
                        <FiXCircle className="mr-2 shrink-0" />
                        <span>Les mots de passe ne correspondent pas</span>
                      </div>
                    </div>
                  )}

                  {/* Message d'erreur */}
                  {error && (
                    <div className="p-3 text-red-600 text-sm bg-red-50 rounded-md border border-red-200 animate-fadeIn">
                      <div className="flex items-center">
                        <FiXCircle className="mr-2 shrink-0" />
                        <span>{error}</span>
                      </div>
                    </div>
                  )}

                  {/* Bouton de soumission */}
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={`w-full py-2.5 px-4 rounded-md text-white font-medium transition-all duration-200 ${
                      !canSubmit
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-linear-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 hover:shadow-md active:scale-[0.98]"
                    }`}
                  >
                    {isLoading ? (
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
                        Réinitialisation en cours...
                      </span>
                    ) : (
                      "Réinitialiser le mot de passe"
                    )}
                  </button>

                  {/* Lien de retour */}
                  <div className="text-center">
                    <Link
                      to="/connexion"
                      className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-sky-600 transition-colors"
                    >
                      <FiArrowLeft className="text-sm" />
                      Retour à la connexion
                    </Link>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
