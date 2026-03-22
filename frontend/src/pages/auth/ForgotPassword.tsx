import React, { useState } from "react";
import { FiAlertCircle, FiMail } from "react-icons/fi";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Helmet } from "react-helmet-async";

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [resetEmail, setResetEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");
  const [isEmailSent, setIsEmailSent] = useState(false);

  const { forgotPassword, isLoading } = useAuth();

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    setIsSubmitting(true);

    if (!resetEmail) {
      setLocalError("Veuillez entrer votre email");
      setIsSubmitting(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      setLocalError("Format d'email invalide");
      setIsSubmitting(false);
      return;
    }

    try {
      await forgotPassword(resetEmail.trim().toLowerCase());
      // Le backend répond toujours 200 même si l'email n'existe pas
      // (sécurité : on ne révèle pas si l'email est enregistré)
      setIsEmailSent(true);
      setResetEmail("");
    } catch (err) {
      // AuthContext.forgotPassword gère le toast d'erreur
      // On affiche aussi dans l'UI pour les erreurs réseau
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors de l'envoi. Veuillez réessayer.";
      setLocalError(message);
      if (import.meta.env.DEV) {
        console.error("[ForgotPassword] handlePasswordReset error:", err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isButtonDisabled = isSubmitting || isLoading;

  return (
    <>
      <Helmet>
        <title>Mot de passe oublié - Paname Consulting</title>
        <meta
          name="description"
          content="Réinitialisez votre mot de passe sur Paname Consulting"
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded shadow-xl overflow-hidden">
            <div className="bg-linear-to-r from-sky-500 to-sky-600 p-6 text-center">
              <Link
                to="/"
                className="flex items-center justify-center space-x-2"
              >
                <div className="bg-white p-2 rounded-full">
                  <div className="w-10 h-10 rounded-full bg-linear-to-r from-sky-500 to-sky-600 flex items-center justify-center">
                    <FiMail className="text-white text-xl" />
                  </div>
                </div>
                <Link to="/" className="text-2xl font-bold text-white">
                  Mot de passe oublié
                </Link>
              </Link>
            </div>

            <div className="p-6 md:p-8">
              {isEmailSent ? (
                <div className="text-center space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-700">
                      Si votre email est enregistré, vous recevrez un lien de
                      réinitialisation dans quelques minutes.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/connexion")}
                    className="w-full flex items-center justify-center py-2.5 px-4 text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors font-medium"
                  >
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    Retour à la connexion
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <p className="text-gray-600 text-center text-sm">
                    Entrez votre adresse email pour réinitialiser votre mot de
                    passe.
                  </p>

                  {localError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-center text-sm">
                      <FiAlertCircle className="mr-2 shrink-0" />
                      <span>{localError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiMail className="text-gray-400" />
                      </div>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => {
                          setResetEmail(e.target.value);
                          setLocalError("");
                        }}
                        className={`pl-9 w-full px-3 py-2 rounded-lg bg-gray-50 border ${
                          localError ? "border-red-300" : "border-gray-300"
                        } hover:border-sky-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed`}
                        placeholder="votre@email.com"
                        required
                        disabled={isButtonDisabled}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isButtonDisabled}
                      className={`w-full py-2.5 px-4 rounded-lg text-white font-medium transition-all duration-200 ${
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
                          Envoi en cours...
                        </span>
                      ) : (
                        "Envoyer l'email"
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="w-full flex items-center justify-center py-2.5 px-4 text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors font-medium"
                    >
                      <ArrowLeft className="mr-2 w-4 h-4" />
                      Retour
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 text-center border-t border-gray-100">
              <p className="text-xs text-gray-500">
                <Link
                  to="/connexion"
                  className="text-sky-600 hover:text-sky-500 hover:underline"
                >
                  Retour à la connexion
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
