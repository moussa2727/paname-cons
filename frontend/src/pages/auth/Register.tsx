import React, { useState } from "react";
import { FiMail, FiPhone, FiUser, FiAlertCircle } from "react-icons/fi";
import { Lock as FiLock, Eye as FiEye, EyeOff as FiEyeOff } from "lucide-react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Helmet } from "react-helmet-async";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, isAuthenticated, user } = useAuth();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    telephone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirection si déjà authentifié
  if (isAuthenticated && user) {
    return (
      <Navigate
        to={
          user.role === "ADMIN"
            ? "/gestionnaire/statistiques"
            : "/user/mon-profil"
        }
        replace
      />
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "telephone") {
      // Conserver le + initial, nettoyer le reste
      let cleaned = value.replace(/\s/g, "");
      if (cleaned.startsWith("+")) {
        cleaned = "+" + cleaned.substring(1).replace(/[^\d]/g, "");
      } else {
        cleaned = cleaned.replace(/[^\d]/g, "");
      }
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setLocalError("");
  };

  const validateForm = (): boolean => {
    if (!formData.firstName.trim()) {
      setLocalError("Le prénom est requis");
      return false;
    }
    if (formData.firstName.trim().length < 2) {
      setLocalError("Le prénom doit contenir au moins 2 caractères");
      return false;
    }
    if (!formData.lastName.trim()) {
      setLocalError("Le nom est requis");
      return false;
    }
    if (formData.lastName.trim().length < 2) {
      setLocalError("Le nom doit contenir au moins 2 caractères");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      setLocalError("L'email est requis");
      return false;
    }
    if (!emailRegex.test(formData.email)) {
      setLocalError("Format d'email invalide");
      return false;
    }

    const phoneDigits = formData.telephone.replace(/\D/g, "");
    if (!formData.telephone) {
      setLocalError("Le téléphone est requis");
      return false;
    }
    if (phoneDigits.length < 8) {
      setLocalError("Le téléphone doit contenir au moins 8 chiffres");
      return false;
    }

    if (!formData.password) {
      setLocalError("Le mot de passe est requis");
      return false;
    }
    if (formData.password.length < 8) {
      setLocalError("Le mot de passe doit contenir au moins 8 caractères");
      return false;
    }

    /**
     * ✅ Regex alignée sur le backend (CreateUserDto) :
     * majuscule + minuscule + chiffre + caractère spécial (@$!%*?&)
     * Sans le caractère spécial, le backend renvoie une 400.
     */
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setLocalError(
        "Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&)",
      );
      return false;
    }

    if (!formData.confirmPassword) {
      setLocalError("Veuillez confirmer le mot de passe");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setLocalError("Les mots de passe ne correspondent pas");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    setIsSubmitting(true);

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        telephone: formData.telephone.trim(),
        password: formData.password,
      });
      navigate("/connexion");
    } catch (err) {
      // AuthContext.register gère déjà le toast d'erreur
      if (import.meta.env.DEV) {
        console.error("[Register] handleSubmit error:", err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isButtonDisabled = isSubmitting || isLoading;

  return (
    <>
      <Helmet>
        <title>Inscription - Paname Consulting</title>
        <meta name="description" content="Inscrivez-vous à Paname Consulting" />
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
                    <FiUser className="text-white text-xl" />
                  </div>
                </div>
                <Link to="/" className="text-2xl font-bold text-white">
                  Créer un compte
                </Link>
              </div>
            </div>

            <div className="p-6">
              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Prénom / Nom */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prénom *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiUser className="text-gray-400" />
                      </div>
                      <input
                        name="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:border-sky-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Jean"
                        required
                        disabled={isButtonDisabled}
                        autoComplete="given-name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiUser className="text-gray-400" />
                      </div>
                      <input
                        name="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:border-sky-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Dupont"
                        required
                        disabled={isButtonDisabled}
                        autoComplete="family-name"
                      />
                    </div>
                  </div>
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
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:border-sky-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="jean.dupont@email.com"
                      required
                      disabled={isButtonDisabled}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiPhone className="text-gray-400" />
                    </div>
                    <input
                      name="telephone"
                      type="tel"
                      value={formData.telephone}
                      onChange={handleChange}
                      className="pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:border-sky-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="+33612345678"
                      required
                      disabled={isButtonDisabled}
                      autoComplete="tel"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Tous formats acceptés : +33612345678, 0612345678,
                    +1800555019
                  </p>
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
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:border-sky-500 pr-9 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="••••••••"
                      required
                      minLength={8}
                      disabled={isButtonDisabled}
                      autoComplete="new-password"
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
                  <p className="text-xs text-gray-500 mt-1">
                    8 caractères min · majuscule · minuscule · chiffre ·
                    caractère spécial (@$!%*?&)
                  </p>
                </div>

                {/* Confirmer mot de passe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmer le mot de passe *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="text-gray-400" />
                    </div>
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:border-sky-500 pr-9 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="••••••••"
                      required
                      minLength={8}
                      disabled={isButtonDisabled}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      disabled={isButtonDisabled}
                      aria-label={
                        showConfirmPassword
                          ? "Cacher le mot de passe"
                          : "Afficher le mot de passe"
                      }
                    >
                      {showConfirmPassword ? (
                        <FiEyeOff className="text-gray-400 hover:text-gray-600 w-5 h-5" />
                      ) : (
                        <FiEye className="text-gray-400 hover:text-gray-600 w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Erreur */}
                {localError && (
                  <div className="p-3 text-red-600 text-sm bg-red-50 rounded-md border border-red-200 animate-fadeIn">
                    <div className="flex items-center">
                      <FiAlertCircle className="mr-2 shrink-0" />
                      <span>{localError}</span>
                    </div>
                  </div>
                )}

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
                      Création en cours...
                    </span>
                  ) : (
                    "Créer mon compte"
                  )}
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Vous avez déjà un compte ?{" "}
                    <Link
                      to="/connexion"
                      className="font-medium text-sky-600 hover:text-sky-500 transition-colors hover:underline"
                    >
                      Se connecter
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

export default Register;
