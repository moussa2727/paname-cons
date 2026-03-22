import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Lock, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Helmet } from "react-helmet-async";

// Composant extrait du corps pour éviter la re-création à chaque rendu
const PasswordRequirement: React.FC<{ met: boolean; text: string }> = ({
  met,
  text,
}) => (
  <div className="flex items-center gap-2 text-sm">
    {met ? (
      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
    ) : (
      <XCircle className="w-4 h-4 text-gray-400 shrink-0" />
    )}
    <span className={met ? "text-green-600" : "text-gray-500"}>{text}</span>
  </div>
);

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

  const canSubmit =
    isPasswordValid &&
    formData.newPassword === formData.confirmPassword &&
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
      setError("Token invalide ou manquant");
      return;
    }
    if (!canSubmit) {
      setError("Veuillez vérifier les critères du mot de passe");
      return;
    }

    try {
      await resetPassword(token, formData.newPassword);
      setSuccess(true);
      setTimeout(
        () =>
          navigate("/connexion", {
            state: { message: "Mot de passe réinitialisé avec succès !" },
          }),
        3000,
      );
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        e.response?.data?.message ??
          e.message ??
          "Erreur lors de la réinitialisation",
      );
      if (import.meta.env.DEV) {
        console.error("[ResetPassword] handleSubmit error:", err);
      }
    }
  };

  return (
    <>
      <Helmet>
        <title>Réinitialiser votre mot de passe - Paname Consulting</title>
        <meta
          name="description"
          content="Réinitialisez votre mot de passe Paname Consulting"
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-linear-to-r from-sky-500 to-sky-600 p-6 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <Link to="/" className="text-2xl font-bold text-white">
              Nouveau mot de passe
            </Link>
            <p className="text-sky-100 mt-2">
              Choisissez un mot de passe sécurisé
            </p>
          </div>

          <div className="p-6">
            {success ? (
              <div className="text-center space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-green-700 font-medium">
                    Mot de passe réinitialisé avec succès !
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    Redirection vers la connexion…
                  </p>
                </div>
              </div>
            ) : !token ? (
              <div className="text-center py-8">
                <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Lien invalide
                </h3>
                <p className="text-gray-600 mb-4">
                  Token invalide ou manquant. Veuillez demander un nouveau lien.
                </p>
                <button
                  onClick={() => navigate("/mot-de-passe-oublie")}
                  className="text-sky-600 hover:text-sky-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-lg px-4 py-2"
                >
                  Demander un nouveau lien
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center">
                    <XCircle className="w-4 h-4 mr-2 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Nouveau mot de passe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword.newPassword ? "text" : "password"}
                      value={formData.newPassword}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      placeholder="Entrez votre nouveau mot de passe"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 hover:border-sky-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors pr-10"
                      required
                      minLength={8}
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("newPassword")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-sky-600 focus:outline-none"
                      disabled={isLoading}
                      aria-label={
                        showPassword.newPassword ? "Cacher" : "Afficher"
                      }
                    >
                      {showPassword.newPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {formData.newPassword && (
                    <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Exigences de sécurité :
                      </p>
                      <PasswordRequirement
                        met={passwordStrength.hasMinLength}
                        text="Au moins 8 caractères"
                      />
                      <PasswordRequirement
                        met={passwordStrength.hasUpperCase}
                        text="Au moins une majuscule"
                      />
                      <PasswordRequirement
                        met={passwordStrength.hasLowerCase}
                        text="Au moins une minuscule"
                      />
                      <PasswordRequirement
                        met={passwordStrength.hasNumber}
                        text="Au moins un chiffre"
                      />
                      <PasswordRequirement
                        met={passwordStrength.hasSpecialChar}
                        text="Au moins un caractère spécial (@$!%*?&)"
                      />
                    </div>
                  )}
                </div>

                {/* Confirmer mot de passe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword.confirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      placeholder="Confirmez votre mot de passe"
                      className={`w-full px-4 py-3 border rounded-lg bg-gray-50 hover:border-sky-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors pr-10 ${
                        formData.confirmPassword &&
                        formData.newPassword !== formData.confirmPassword
                          ? "border-red-300"
                          : "border-gray-300"
                      }`}
                      required
                      minLength={8}
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        togglePasswordVisibility("confirmPassword")
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-sky-600 focus:outline-none"
                      disabled={isLoading}
                      aria-label={
                        showPassword.confirmPassword ? "Cacher" : "Afficher"
                      }
                    >
                      {showPassword.confirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {formData.confirmPassword &&
                    formData.newPassword !== formData.confirmPassword && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <XCircle className="w-4 h-4 shrink-0" />
                        Les mots de passe ne correspondent pas
                      </p>
                    )}
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit || isLoading}
                  className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-all duration-200 ${
                    !canSubmit || isLoading
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
                      Réinitialisation…
                    </span>
                  ) : (
                    "Réinitialiser le mot de passe"
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              Retour à la{" "}
              <button
                onClick={() => navigate("/connexion")}
                className="text-sky-600 hover:text-sky-500 hover:underline font-medium focus:outline-none"
              >
                page de connexion
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
